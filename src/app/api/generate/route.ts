import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Article, FeatureIntake, HowToContent, WhatsNewContent, ConfidenceFlag, Step } from '@/lib/types/article';
import { PIIFreePayload, assertPIIFree } from '@/lib/types/pii';
import { buildHowToPrompt } from '@/lib/prompts/how-to';
import { buildWhatsNewPrompt } from '@/lib/prompts/whats-new';
import { saveArticle } from '@/lib/db/storage';
import { getFacts } from '@/lib/verified-facts/store';
import { buildVerifiedFactsBlock } from '@/lib/verified-facts/block-builder';
import { getFeatures } from '@/lib/config/features';
import terminologySeed from '@/lib/config/terminology-seed.json';
import { generateAIResponse, getActiveProvider } from '@/lib/ai/provider';
import { checkAIRateLimit } from '@/lib/auth/rate-limit';

function buildPIIFreePayload(intake: FeatureIntake): PIIFreePayload {
  const payload: Record<string, unknown> = {
    featureTitle: intake.title,
    featureDescription: intake.description,
    module: intake.module,
    changeType: intake.changeType,
    behaviorRules: intake.behaviorRulesLinks.join('\n'),
    userStories: intake.userStories.map(s => `${s.title}: ${s.description}`).join('\n'),
    terminologySeed: JSON.stringify(terminologySeed),
    writingStandards: 'Documentation Standards v2025-11',
  };
  return assertPIIFree(payload);
}

// Appended to each prompt so the AI also emits a machine-readable JSON summary
// that we can parse reliably instead of scraping HTML with fragile regexes.
const HOW_TO_JSON_SUFFIX = `

## STRUCTURED OUTPUT (REQUIRED)

After the HTML article and the confidence JSON block, output one final fenced block labeled \`\`\`article_json containing a JSON object with this exact shape (do NOT omit any field):

\`\`\`article_json
{
  "overview": "The single overview sentence (plain text, no HTML)",
  "steps": [
    {
      "heading": "Step 1 of N:",
      "text": "<p>Step instruction HTML</p>",
      "imgDesc": "Description of what the screenshot should show"
    }
  ],
  "confidence": {
    "flags": [
      {
        "step": 1,
        "what": "Short label under 10 words naming the uncertain element",
        "why": "Detailed explanation of what was inferred and why it is uncertain — MUST differ from what",
        "action": "What the writer should do to verify"
      }
    ]
  }
}
\`\`\`

This block MUST appear last in your response.`;

const WN_JSON_SUFFIX = `

## STRUCTURED OUTPUT (REQUIRED)

After the HTML article and the confidence JSON block, output one final fenced block labeled \`\`\`article_json containing a JSON object with this exact shape (do NOT omit any field):

\`\`\`article_json
{
  "overview": "Overview sentence(s) (plain text, no HTML)",
  "introduction": "<p>Introduction HTML (no bold)</p>",
  "whereToFind": "<p>Where to Find It HTML (with <b>bolded UI elements</b>)</p>",
  "closing": "Now it's easier than ever to ... (plain text)"
}
\`\`\`

This block MUST appear last in your response.`;

function findJsonBlocks(text: string): { label: string; json: string }[] {
  const blocks: { label: string; json: string }[] = [];
  // Match fenced code blocks with 3+ backticks
  const regex = /`{3,}(\w*)\s*\n?([\s\S]*?)`{3,}/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const label = m[1].toLowerCase();
    const body = m[2].trim();
    if (body.startsWith('{') || body.startsWith('[')) {
      blocks.push({ label, json: body });
    }
  }

  // Fallback: if no fenced blocks found, try to extract raw JSON objects from text
  if (blocks.length === 0) {
    console.log('[findJsonBlocks] No fenced blocks found, trying raw JSON extraction');
    const jsonRegex = /\{[\s\S]*?"overview"[\s\S]*?"steps"[\s\S]*?\}(?=\s*$|\s*\n|\s*```)/g;
    let rawMatch;
    while ((rawMatch = jsonRegex.exec(text)) !== null) {
      // Find the balanced braces
      const balanced = extractBalancedJson(text, rawMatch.index);
      if (balanced) {
        blocks.push({ label: 'raw', json: balanced });
      }
    }
  }

  return blocks;
}

/** Extract a balanced JSON object starting from the given index in text */
function extractBalancedJson(text: string, startIndex: number): string | null {
  if (text[startIndex] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) {
      const candidate = text.slice(startIndex, i + 1);
      try { JSON.parse(candidate); return candidate; } catch { return null; }
    }}
  }
  return null;
}

function parseConfidenceFlags(
  conf: { flags?: { step: number; what?: string; why?: string; action?: string }[]; notes?: string[]; steps_needing_verification?: number[] } | undefined,
  stepCount: number,
): (ConfidenceFlag | null)[] {
  if (!conf) return new Array(stepCount).fill(null);

  // New format: per-step flags with distinct what/why/action
  if (Array.isArray(conf.flags) && conf.flags.length > 0) {
    const flagMap = new Map<number, ConfidenceFlag>();
    for (const f of conf.flags) {
      const stepIdx = f.step - 1; // 1-based to 0-based
      if (stepIdx >= 0 && stepIdx < stepCount) {
        flagMap.set(stepIdx, {
          what: f.what || 'Needs verification',
          why: f.why || f.what || 'AI generated content needs verification',
          action: f.action || 'Verify against the live application',
        });
      }
    }
    return Array.from({ length: stepCount }, (_, idx) => flagMap.get(idx) ?? null);
  }

  // Legacy format: notes + steps_needing_verification
  const flaggedSteps = conf.steps_needing_verification || [];
  const notes = conf.notes || [];
  return Array.from({ length: stepCount }, (_, idx) => {
    const flagIndex = flaggedSteps.indexOf(idx + 1);
    if (flagIndex !== -1) {
      const note = notes[flagIndex] || notes[0] || 'AI generated content needs verification';
      return {
        what: note.length > 60 ? note.split(/[—\-.:]/)[0].trim() || note.slice(0, 60) : note,
        why: note,
        action: 'Verify against the live application',
      };
    }
    return null;
  });
}

function parseHowToResponse(text: string): { content: HowToContent; confidence: (ConfidenceFlag | null)[] } {
  console.log('[parseHowToResponse] Raw text length:', text.length);
  console.log('[parseHowToResponse] First 500 chars:', text.substring(0, 500));
  console.log('[parseHowToResponse] Last 500 chars:', text.substring(Math.max(0, text.length - 500)));

  // Collect all JSON fenced blocks from the response
  const jsonBlocks = findJsonBlocks(text);
  console.log('[parseHowToResponse] Found', jsonBlocks.length, 'JSON blocks with labels:', jsonBlocks.map(b => b.label));

  // Strategy 1: Find the article_json block (or the last JSON block with overview+steps)
  let articleJson: { overview?: string; steps?: { heading?: string; text?: string; imgDesc?: string }[]; confidence?: { flags?: { step: number; what?: string; why?: string; action?: string }[]; notes?: string[]; steps_needing_verification?: number[] } } | null = null;

  // Try explicit article_json label first
  const explicitBlock = jsonBlocks.find(b => b.label === 'article_json');
  if (explicitBlock) {
    try { articleJson = JSON.parse(explicitBlock.json); } catch (e) {
      console.warn('[parseHowToResponse] article_json parse failed:', e);
    }
  }

  // If not found, try the last JSON block that has overview+steps keys
  if (!articleJson) {
    for (let i = jsonBlocks.length - 1; i >= 0; i--) {
      try {
        const candidate = JSON.parse(jsonBlocks[i].json);
        if ('overview' in candidate && 'steps' in candidate) {
          articleJson = candidate;
          console.log('[parseHowToResponse] Found article data in', jsonBlocks[i].label, 'block at index', i);
          break;
        }
      } catch { /* try next */ }
    }
  }

  // Accept the article_json block if it has the right shape — even if overview/steps are empty
  // (the AI may intentionally return empty fields for insufficient context)
  if (articleJson && 'overview' in articleJson && 'steps' in articleJson) {
    const stepsArr = Array.isArray(articleJson.steps) ? articleJson.steps : [];
    const steps: Step[] = stepsArr.map((s, i) => ({
      heading: s.heading || `Step ${i + 1}`,
      text: s.text ? (s.text.startsWith('<') ? s.text : `<p>${s.text}</p>`) : '<p>[Review and edit.]</p>',
      imgDesc: s.imgDesc || 'Screenshot needed',
      imgPath: null,
    }));
    const confidenceFlags = parseConfidenceFlags(articleJson.confidence, steps.length);
    console.log('[parseHowToResponse] Parsed via JSON block:', steps.length, 'steps, overview:', articleJson.overview ? 'present' : 'empty');
    return { content: { overview: articleJson.overview || '', steps }, confidence: confidenceFlags };
  }

  // Strategy 2: Fall back to HTML parsing with flexible regexes
  console.log('[parseHowToResponse] Falling back to HTML parsing');
  const htmlMatch = text.match(/<div[\s\S]*<\/div>/);
  const html = htmlMatch ? htmlMatch[0] : text;

  // Extract confidence JSON — find a block that has a "confidence" key
  let confidenceData: { confidence?: { notes?: string[]; steps_needing_verification?: number[] } } = {};
  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block.json);
      if (parsed.confidence && !parsed.steps) {
        confidenceData = parsed;
        break;
      }
    } catch { /* ignore */ }
  }

  // Parse overview — try multiple patterns
  let overview = '';
  const ovPatterns = [
    /<i[^>]*>(?:<strong>)?\s*Overview:?\s*(?:<\/strong>)?\s*([\s\S]*?)<\/i>/i,
    /Overview:?\s*<\/strong>\s*([\s\S]*?)<\/(?:i|section|p)>/i,
    /Overview:?\s*(?:<\/strong>)?\s*(?:<\/b>)?\s*([\s\S]*?)<\/(?:i|section|p|div)>/i,
    /Overview[:\s]+((?:A|An|The)\s[\s\S]*?\.)\s*(?:<|$)/i,
  ];
  for (const pat of ovPatterns) {
    const m = html.match(pat);
    if (m?.[1]?.trim()) { overview = m[1].trim().replace(/<[^>]*>/g, ''); break; }
  }

  // Parse steps — try section comments first
  const steps: Step[] = [];
  const stepSections = html.split(/<!--\s*Step\s*(?:Section\s*)?START\s*-->/i);
  if (stepSections.length > 1) {
    for (let i = 1; i < stepSections.length; i++) {
      const section = stepSections[i];
      const headingMatch = section.match(/<strong>\s*(Step\s+\d+\s+of\s+\d+:?)\s*<\/strong>/i);
      const textMatch = section.match(/<p[^>]*>((?!.*<strong>Step)[\s\S]*?)<\/p>/i);
      const imgMatch = section.match(/\[SCREENSHOT_PLACEHOLDER:\s*(.*?)\]/);
      steps.push({
        heading: headingMatch ? headingMatch[1] : `Step ${i}`,
        text: textMatch ? `<p>${textMatch[1]}</p>` : '<p>[Review and edit.]</p>',
        imgDesc: imgMatch ? imgMatch[1].trim() : 'Screenshot needed',
        imgPath: null,
      });
    }
  }

  // Fallback: find "Step X of Y" headings
  if (steps.length === 0) {
    const stepRegex = /<strong>\s*(Step\s+(\d+)\s+of\s+(\d+):?)\s*<\/strong>/gi;
    const matches = [...html.matchAll(stepRegex)];
    for (let i = 0; i < matches.length; i++) {
      const startIdx = matches[i].index! + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index! : html.length;
      const segment = html.slice(startIdx, endIdx);
      const textMatch = segment.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const imgMatch = segment.match(/\[SCREENSHOT_PLACEHOLDER:\s*(.*?)\]/);
      steps.push({
        heading: matches[i][1],
        text: textMatch ? `<p>${textMatch[1]}</p>` : '<p>[Review and edit.]</p>',
        imgDesc: imgMatch ? imgMatch[1].trim() : 'Screenshot needed',
        imgPath: null,
      });
    }
  }

  console.log('[parseHowToResponse] HTML fallback result:', overview ? 'overview found' : 'NO overview', steps.length, 'steps');

  const confidenceFlags = parseConfidenceFlags(confidenceData.confidence, steps.length);

  return { content: { overview, steps }, confidence: confidenceFlags };
}

function parseWhatsNewResponse(text: string): { content: WhatsNewContent; confidence: (ConfidenceFlag | null)[] } {
  console.log('[parseWhatsNewResponse] Raw text length:', text.length);

  // Collect all JSON fenced blocks
  const jsonBlocks = findJsonBlocks(text);

  // Strategy 1: Find article_json block or any JSON with overview+introduction shape
  let articleJson: { overview?: string; introduction?: string; whereToFind?: string; closing?: string } | null = null;

  const explicitBlock = jsonBlocks.find(b => b.label === 'article_json');
  if (explicitBlock) {
    try { articleJson = JSON.parse(explicitBlock.json); } catch (e) {
      console.warn('[parseWhatsNewResponse] article_json parse failed:', e);
    }
  }

  if (!articleJson) {
    for (let i = jsonBlocks.length - 1; i >= 0; i--) {
      try {
        const candidate = JSON.parse(jsonBlocks[i].json);
        if ('overview' in candidate && ('introduction' in candidate || 'whereToFind' in candidate)) {
          articleJson = candidate;
          console.log('[parseWhatsNewResponse] Found article data in', jsonBlocks[i].label, 'block');
          break;
        }
      } catch { /* try next */ }
    }
  }

  if (articleJson && 'overview' in articleJson) {
    console.log('[parseWhatsNewResponse] Parsed via JSON block');
    return {
      content: {
        overview: articleJson.overview || '',
        introduction: articleJson.introduction ? (articleJson.introduction.startsWith('<') ? articleJson.introduction : `<p>${articleJson.introduction}</p>`) : '',
        whereToFind: articleJson.whereToFind ? (articleJson.whereToFind.startsWith('<') ? articleJson.whereToFind : `<p>${articleJson.whereToFind}</p>`) : '',
        closing: (articleJson.closing || '').replace(/<[^>]*>/g, ''),
      },
      confidence: [],
    };
  }

  // Strategy 2: Fall back to HTML parsing with flexible regexes
  console.log('[parseWhatsNewResponse] Falling back to HTML parsing');
  const htmlMatch = text.match(/<div[\s\S]*<\/div>/);
  const html = htmlMatch ? htmlMatch[0] : text;

  // Overview
  let overview = '';
  const ovPatterns = [
    /<i[^>]*>(?:<strong>)?\s*Overview:?\s*(?:<\/strong>)?\s*([\s\S]*?)<\/i>/i,
    /Overview:?\s*(?:<\/strong>)?\s*(?:<\/b>)?\s*([\s\S]*?)<\/(?:i|section|p|div)>/i,
  ];
  for (const pat of ovPatterns) {
    const m = html.match(pat);
    if (m?.[1]?.trim()) { overview = m[1].trim().replace(/<[^>]*>/g, ''); break; }
  }

  // Sections: match between section headers and the next section header or end
  const sectionRegex = /<strong>\s*(Introduction|Where to Find It)\s*<\/strong>[\s\S]*?<\/div>\s*(?:<br\s*\/?>)?\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi;
  let introduction = '';
  let whereToFind = '';
  for (const m of html.matchAll(sectionRegex)) {
    const name = m[1].toLowerCase();
    const content = m[2].trim();
    if (name === 'introduction') introduction = content;
    else if (name.includes('where')) whereToFind = content;
  }

  // Closing — flexible pattern
  let closing = '';
  const closingMatch = html.match(/<strong>\s*(Now it['\u2019]s easier than ever[\s\S]*?)<\/strong>/i);
  if (closingMatch) closing = closingMatch[1].trim();

  console.log('[parseWhatsNewResponse] HTML fallback:', overview ? 'overview found' : 'NO overview');

  return {
    content: { overview, introduction, whereToFind, closing },
    confidence: [],
  };
}

/**
 * Extract UI-relevant terms from the writer's description that should be
 * treated as verified (not flagged). Captures quoted strings, capitalized
 * multi-word phrases (likely UI element names), and "X button/tab/field" patterns.
 */
function extractVerifiedTerms(description: string): string[] {
  const terms = new Set<string>();

  // Quoted strings — single, double, or smart quotes
  const quotedRegex = /["'\u201C\u2018]([^"'\u201D\u2019]+)["'\u201D\u2019]/g;
  let match;
  while ((match = quotedRegex.exec(description)) !== null) {
    const term = match[1].trim();
    if (term.length > 1) terms.add(term);
  }

  // Capitalized multi-word phrases (e.g. "Search Criteria", "More Options")
  const capitalizedRegex = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)\b/g;
  while ((match = capitalizedRegex.exec(description)) !== null) {
    terms.add(match[1]);
  }

  // "X button", "X tab", "X field", "X page", etc.
  const uiPatterns = /\b([\w]+(?:\s+[\w]+)*?\s+(?:button|tab|field|page|panel|menu|drawer|dialog|modal|dropdown|checkbox|toggle|link|icon|card|section|column|header|sidebar|toolbar|filter|option|selector|picker|view|list|table|grid|form))\b/gi;
  while ((match = uiPatterns.exec(description)) !== null) {
    terms.add(match[1].trim());
  }

  // Single capitalized words that aren't common English — likely feature/UI names
  const skip = new Set([
    'The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which',
    'How', 'Who', 'After', 'Before', 'During', 'Within', 'About', 'Into', 'From',
    'With', 'Each', 'Every', 'Some', 'Any', 'All', 'Most', 'Many', 'Few', 'More',
    'Less', 'Other', 'Another', 'Both', 'Either', 'Neither', 'Such', 'Only', 'Also',
    'Just', 'Even', 'Still', 'Already', 'Once', 'Here', 'There', 'Then', 'Now',
    'Note', 'Please', 'However', 'Therefore', 'Furthermore', 'Additionally',
    'Moreover', 'Meanwhile', 'Instead', 'Otherwise', 'Click', 'Select', 'Enter',
    'Open', 'Close', 'Save', 'Delete', 'Edit', 'Update', 'Add', 'Remove', 'View',
    'Show', 'Hide', 'Enable', 'Disable', 'Start', 'Stop', 'Create', 'Submit',
    'Cancel', 'Apply', 'Reset', 'Clear', 'Search', 'Find', 'Sort', 'Group',
    'Copy', 'Paste', 'Move', 'Drag', 'Drop', 'Scroll', 'Navigate', 'Browse',
    'Upload', 'Download', 'Import', 'Export', 'Print', 'Share', 'Send', 'Receive',
    'Users', 'Feature', 'Description', 'Title', 'Module', 'Type', 'Step',
    'Yes', 'True', 'False', 'None', 'Data', 'Information', 'System',
  ]);
  const singleCapRegex = /\b([A-Z][a-z]{2,})\b/g;
  while ((match = singleCapRegex.exec(description)) !== null) {
    if (!skip.has(match[1])) terms.add(match[1]);
  }

  return [...terms];
}

/**
 * Build a VERIFIED INPUTS section that tells the AI which facts came directly
 * from the writer's intake and should NOT be confidence-flagged.
 */
function buildVerifiedInputsSection(intake: {
  title: string;
  module: string;
  changeType: string;
  description: string;
}): string {
  const terms = extractVerifiedTerms(intake.description);
  const termsLine = terms.length > 0
    ? terms.map(t => `"${t}"`).join(', ')
    : '(none extracted — treat all UI element names in the description as writer-confirmed)';

  return `## VERIFIED INPUTS (provided directly by the writer — do NOT flag these)

- Module: ${intake.module}
- Feature title: ${intake.title}
- Type of change: ${intake.changeType}
- The following UI elements and terms appear in the writer's description and should be treated as confirmed: ${termsLine}

FLAGGING RULE: Steps that use ONLY information from VERIFIED INPUTS or explicitly stated in the FEATURE DESCRIPTION below get NO confidence flag. Steps that reference UI elements, navigation paths, or button names NOT listed in VERIFIED INPUTS and NOT found in the FEATURE DESCRIPTION should be flagged with a specific WHY explaining what was inferred and where the inference came from.

`;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  const rateLimited = await checkAIRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const intake: FeatureIntake = await request.json();

    // Validate required fields
    if (!intake.title || !intake.module || !intake.changeType || !intake.description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, module, changeType, description' },
        { status: 400 }
      );
    }

    const piiPayload = buildPIIFreePayload(intake);

    // Look up verified facts from previously approved articles for this module
    // Skip if verifiedFacts feature flag is disabled
    const featureFlags = await getFeatures();
    const moduleFacts = featureFlags.verifiedFacts ? await getFacts(intake.module) : [];
    const verifiedFactsBlock = buildVerifiedFactsBlock(moduleFacts);

    const now = new Date().toISOString();
    const article: Article = {
      id: uuidv4(),
      title: intake.title,
      module: intake.module,
      source: 'feature',
      changeType: intake.changeType,
      status: 'generated',
      types: [],
      activeType: 'howto',
      writer: null,
      featureId: null,
      featureUrl: intake.featureUrl || null,
      terminologyValidated: false,
      reviewNote: null,
      description: intake.description,
      isUpdate: false,
      updatedSteps: [],
      updateReason: null,
      originals: {},
      parentArticleIds: [],
      priority: 0,
      createdAt: now,
      updatedAt: now,
      sharedAt: null,
      approvedAt: null,
      revisionReason: null,
      revisionRequestedAt: null,
      content: {},
      screenshots: { howto: [], wn: [] },
      confidence: { howto: [], wn: [] },
    };

    // Generate How To article
    if (intake.generateHowTo) {
      article.types.push('howto');
      const howToPromptRaw = buildHowToPrompt({
        featureTitle: piiPayload.featureTitle,
        featureDescription: piiPayload.featureDescription,
        module: piiPayload.module,
        behaviorRules: piiPayload.behaviorRules || undefined,
        userStories: intake.userStories.length > 0 ? intake.userStories : undefined,
        terminologySeed,
        verifiedFacts: verifiedFactsBlock,
      });

      // Inject VERIFIED INPUTS section before the input block so the AI can
      // distinguish writer-provided facts from details it must infer.
      const verifiedSection = buildVerifiedInputsSection({
        title: intake.title,
        module: intake.module,
        changeType: intake.changeType,
        description: intake.description,
      });
      const howToPrompt = howToPromptRaw.replace(
        '## INPUT FOR THIS ARTICLE',
        verifiedSection + '## INPUT FOR THIS ARTICLE',
      );

      const howToAIResponse = await generateAIResponse({
        maxTokens: 8192,
        messages: [{ role: 'user', content: howToPrompt + HOW_TO_JSON_SUFFIX }],
      });

      console.log('[generate] HowTo response via', getActiveProvider());

      const howToText = howToAIResponse.text;

      if (!howToText) {
        console.error('[generate] No text content in HowTo response');
      } else {
        console.log('[generate] HowTo raw text length:', howToText.length);
        console.log('[generate] HowTo raw text (first 1000):', howToText.substring(0, 1000));
      }

      const parsed = parseHowToResponse(howToText);

      // Log warning if parsed content is empty (insufficient context or parsing failure)
      if (!parsed.content.overview && parsed.content.steps.length === 0) {
        console.warn('[generate] WARNING: HowTo parsed content is empty. This usually means the AI returned INSUFFICIENT CONTEXT due to a vague description.');
        console.warn('[generate] Full raw response text:', howToText);
      }

      article.content.howto = parsed.content;
      article.confidence.howto = parsed.confidence;
      article.screenshots.howto = parsed.content.steps.map(() => false);
    }

    // Generate What's New article
    if (intake.generateWhatsNew) {
      article.types.push('wn');
      const wnPrompt = buildWhatsNewPrompt({
        featureTitle: piiPayload.featureTitle,
        featureDescription: piiPayload.featureDescription,
        module: piiPayload.module,
        featureType: intake.changeType === 'feature' ? 'feature' : 'enhancement',
        behaviorRules: piiPayload.behaviorRules || undefined,
        userStories: intake.userStories.length > 0 ? intake.userStories : undefined,
        terminologySeed,
        verifiedFacts: verifiedFactsBlock,
      });

      const wnAIResponse = await generateAIResponse({
        maxTokens: 8192,
        messages: [{ role: 'user', content: wnPrompt + WN_JSON_SUFFIX }],
      });

      console.log('[generate] WN response via', getActiveProvider());

      const wnText = wnAIResponse.text;
      console.log('[generate] WN raw text length:', wnText.length);
      const wnParsed = parseWhatsNewResponse(wnText);

      if (!wnParsed.content.overview && !wnParsed.content.introduction) {
        console.warn('[generate] WARNING: WN parsed content is empty.');
        console.warn('[generate] Full WN raw response text:', wnText);
      }

      article.content.wn = wnParsed.content;
      article.confidence.wn = wnParsed.confidence;
    }

    if (article.types.length === 0) {
      return NextResponse.json(
        { error: 'At least one article type must be selected (How To or What\'s New)' },
        { status: 400 }
      );
    }

    article.activeType = article.types[0];

    // Save to store — skip when caller only needs the generated content
    // (e.g. editor regeneration, which PATCHes the existing article itself)
    const skipPersist = request.nextUrl.searchParams.get('skipPersist') === 'true';
    const result = skipPersist ? article : await saveArticle(article);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

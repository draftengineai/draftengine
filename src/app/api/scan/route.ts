import { NextRequest, NextResponse } from 'next/server';
import { getArticles } from '@/lib/db/storage';
import { buildScanPrompt } from '@/lib/prompts/scan-articles';
import type { Article, ScanResult } from '@/lib/types/article';
import { generateAIResponse, getActiveProvider } from '@/lib/ai/provider';
import { checkAIRateLimit } from '@/lib/auth/rate-limit';

/** Extract bold element text from an article's How To steps and What's New content. */
function extractBoldElements(article: Article): string[] {
  const bolds = new Set<string>();
  const boldRegex = /<b>(.*?)<\/b>/gi;

  // How To steps
  if (article.content.howto) {
    for (const step of article.content.howto.steps) {
      let m;
      while ((m = boldRegex.exec(step.text)) !== null) {
        bolds.add(m[1].trim());
      }
    }
  }

  // What's New sections
  if (article.content.wn) {
    for (const html of [article.content.wn.introduction, article.content.wn.whereToFind]) {
      if (!html) continue;
      let m;
      while ((m = boldRegex.exec(html)) !== null) {
        bolds.add(m[1].trim());
      }
    }
  }

  return [...bolds];
}

/** Build a summary object for the scan prompt from a full Article. */
function buildArticleSummary(article: Article) {
  const overview = article.content.howto?.overview || article.content.wn?.overview || '';
  const stepCount = article.content.howto?.steps.length ?? 0;
  return {
    id: article.id,
    title: article.title,
    module: article.module,
    overview,
    stepCount,
    boldElements: extractBoldElements(article),
    types: article.types,
  };
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  const rateLimited = await checkAIRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const { changeDescription, module, changeType } = body;

    // Validate required fields
    if (!changeDescription || !module || !changeType) {
      return NextResponse.json(
        { error: 'Missing required fields: changeDescription, module, changeType' },
        { status: 400 }
      );
    }

    // Read articles and filter by module
    const allArticles = await getArticles();
    const filtered = module === 'all'
      ? allArticles
      : allArticles.filter(a => a.module === module);

    // If no articles exist, return empty matches immediately
    if (filtered.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Build article summaries for the prompt
    const summaries = filtered.map(buildArticleSummary);

    // Build the scan prompt
    const prompt = buildScanPrompt({
      changeTitle: changeDescription.split(/[.!?\n]/)[0].trim().slice(0, 100),
      changeDescription,
      module,
      changeType,
      articles: summaries,
    });

    const aiResponse = await generateAIResponse({
      maxTokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log('[scan] Response via', getActiveProvider());

    const responseText = aiResponse.text;

    // Parse the JSON array from the response — strip markdown fences if present
    let jsonText = responseText.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let rawMatches: Array<{
      articleId: string;
      title: string;
      module?: string;
      types?: string[];
      confidence: string;
      reason: string;
    }>;

    try {
      rawMatches = JSON.parse(jsonText);
    } catch {
      console.error('[scan] Failed to parse AI response as JSON:', jsonText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse scan results from AI response' },
        { status: 502 }
      );
    }

    if (!Array.isArray(rawMatches)) {
      return NextResponse.json({ matches: [] });
    }

    // Normalize to ScanResult shape
    const matches: ScanResult[] = rawMatches.map(m => ({
      articleId: m.articleId,
      title: m.title,
      module: m.module || module,
      types: (m.types || ['howto']) as ScanResult['types'],
      confidence: m.confidence.toLowerCase() as ScanResult['confidence'],
      reason: m.reason,
    }));

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('[scan] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}

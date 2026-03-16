import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Article, ConfidenceFlag, Step } from '@/lib/types/article';
import { buildUpdateHowToPrompt } from '@/lib/prompts/update-how-to';
import { getArticle, updateArticle } from '@/lib/db/storage';
import terminologySeed from '@/lib/config/terminology-seed.json';

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. Add it in the Vercel dashboard under Settings → Environment Variables.'
    );
  }
  return new Anthropic({ apiKey });
}

interface UpdateRequestBody {
  articleId: string;
  changeDescription: string;
  changeType: string;
  affectedSteps: number[];
}

interface UpdateResponseStep {
  heading: string;
  text: string;
  imgDesc: string;
  isRevised: boolean;
}

interface UpdateResponseJson {
  title: string;
  overview: string;
  updatedSteps: number[];
  steps: UpdateResponseStep[];
  originals: Record<string, string>;
  confidence: (ConfidenceFlag | null)[];
  updateSummary: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequestBody = await request.json();
    const { articleId, changeDescription, changeType, affectedSteps } = body;

    // Validate required fields
    if (!articleId || !changeDescription || !changeType || !Array.isArray(affectedSteps)) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, changeDescription, changeType, affectedSteps' },
        { status: 400 }
      );
    }

    // Read the existing article
    const article = await getArticle(articleId);
    if (!article) {
      return NextResponse.json(
        { error: `Article not found: ${articleId}` },
        { status: 404 }
      );
    }

    // Must have How To content to update
    if (!article.content.howto) {
      return NextResponse.json(
        { error: 'Article has no How To content to update' },
        { status: 400 }
      );
    }

    const existingHowTo = article.content.howto;

    // Build the update prompt
    const prompt = buildUpdateHowToPrompt({
      changeTitle: changeDescription.split(/[.!?\n]/)[0].trim().slice(0, 100),
      changeDescription,
      changeType,
      module: article.module,
      existingArticle: {
        title: article.title,
        overview: existingHowTo.overview,
        steps: existingHowTo.steps.map((s) => ({
          heading: s.heading,
          text: s.text,
          imgDesc: s.imgDesc,
        })),
      },
      terminologySeed: JSON.stringify(terminologySeed),
    });

    // Call Anthropic API
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Parse JSON response — strip markdown fences if present
    let jsonText = responseText.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let parsed: UpdateResponseJson;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('[update] Failed to parse AI response as JSON:', jsonText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse update response from AI' },
        { status: 502 }
      );
    }

    // Build revised steps — only update steps the AI marked as revised,
    // preserving originals character-for-character for unchanged steps
    const revisedSteps: Step[] = parsed.steps.map((s, i) => {
      if (s.isRevised) {
        return {
          heading: s.heading,
          text: s.text,
          imgDesc: s.imgDesc,
          imgPath: existingHowTo.steps[i]?.imgPath ?? null,
        };
      }
      // Unchanged — use the original step exactly
      return existingHowTo.steps[i] ?? {
        heading: s.heading,
        text: s.text,
        imgDesc: s.imgDesc,
        imgPath: null,
      };
    });

    // Build originals map — snapshot of previous content for "View original" comparison
    const originals: Record<number, string> = {};
    for (const [key, value] of Object.entries(parsed.originals)) {
      originals[Number(key)] = value;
    }

    // Build confidence flags
    const confidenceFlags: (ConfidenceFlag | null)[] = parsed.confidence.map((flag) => {
      if (!flag) return null;
      return {
        what: flag.what,
        why: flag.why,
        action: flag.action,
      };
    });

    // Persist the update — only save if everything parsed successfully
    const updates: Partial<Article> = {
      status: 'generated',
      isUpdate: true,
      updateReason: changeDescription,
      updatedSteps: parsed.updatedSteps,
      originals,
      content: {
        ...article.content,
        howto: {
          overview: parsed.overview,
          steps: revisedSteps,
        },
      },
      confidence: {
        ...article.confidence,
        howto: confidenceFlags,
      },
    };

    const updated = await updateArticle(articleId, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to save updated article' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[update] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

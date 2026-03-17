import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/db/storage';
import modules from '@/lib/config/modules.json';

export async function GET() {
  try {
    const articles = await getArticles();

    // Articles by status
    const byStatus: Record<string, number> = {};
    for (const a of articles) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }

    // Articles by module
    const byModule: Record<string, number> = {};
    for (const a of articles) {
      byModule[a.module] = (byModule[a.module] || 0) + 1;
    }

    // Verified facts count per module
    const factsPerModule: Record<string, number> = {};
    // Import verified facts store dynamically
    const { getFacts } = await import('@/lib/verified-facts/store');
    const moduleNames = (modules as { modules: string[] }).modules;
    for (const mod of moduleNames) {
      const facts = await getFacts(mod);
      let count = 0;
      for (const entry of facts) {
        count += entry.facts.uiElements.length +
          entry.facts.buttons.length +
          entry.facts.filters.length +
          entry.facts.cards.length +
          (entry.facts.navPath ? 1 : 0);
      }
      if (count > 0) {
        factsPerModule[mod] = count;
      }
    }

    return NextResponse.json({
      totalArticles: articles.length,
      byStatus,
      byModule,
      factsPerModule,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 }
    );
  }
}

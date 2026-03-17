import { NextRequest, NextResponse } from 'next/server';
import { getFeatures, setFeatures } from '@/lib/config/features';
import type { FeatureFlags } from '@/lib/config/features';

export async function GET() {
  const flags = await getFeatures();
  return NextResponse.json(flags);
}

export async function POST(request: NextRequest) {
  try {
    const flags: FeatureFlags = await request.json();
    await setFeatures(flags);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save features' },
      { status: 500 }
    );
  }
}

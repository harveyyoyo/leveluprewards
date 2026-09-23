export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { guardAiRoute } from '@/lib/apiAuth';
import { syncAppKnowledge } from '@/lib/appKnowledgeScanner';

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: true,
      maxRequests: 30,
      maxBodyBytes: 16 * 1024,
    });
    if (!guarded.ok) return guarded.response;

    const result = syncAppKnowledge();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update app knowledge on server.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tabsCount: result.tabsCount,
      timestamp: result.timestamp,
      message: `App knowledge refreshed! Scanned ${result.tabsCount} Admin tabs, School Office, Library, and Kiosks.`,
    });
  } catch (err: unknown) {
    console.error('staff-help-sync error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error updating knowledge.' },
      { status: 500 }
    );
  }
}

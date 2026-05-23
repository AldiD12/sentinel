// /app/api/siem/route.ts
// Mock SIEM endpoint — GET returns buffered RFC-5424 syslog lines,
// POST accepts inbound webhook payloads (useful when pointing an external
// SIEM_WEBHOOK_URL back at this instance for a closed-loop demo).
import { NextRequest, NextResponse } from 'next/server';
import { getSiemLog } from '@/lib/store';
import { getAllSwipes } from '@/lib/pos-ledger';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') ?? 'json';
  const lines = getSiemLog();

  if (format === 'text') {
    return new NextResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.json({
    protocol: 'RFC-5424',
    facility: 'security (4)',
    count: lines.length,
    swipeLedger: getAllSwipes(),
    log: lines,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('[SENTINEL SIEM INBOUND]', JSON.stringify(body));
  return NextResponse.json({ received: true });
}

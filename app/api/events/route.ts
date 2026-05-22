// /app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { score } from '@/lib/sentinel/scorer';
import { addEvent, getRequestRate } from '@/lib/store';
import type { SentinelEvent, ProcessedEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as SentinelEvent;
  const event: SentinelEvent = {
    ...body,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    requestRateLastMinute: getRequestRate(body.userId),
  };

  const assessment = score(event);
  const processed: ProcessedEvent = { ...event, ...assessment };
  addEvent(processed);

  return NextResponse.json(assessment);
}

// /app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { score } from '@/lib/sentinel/scorer';
import { addEvent, getRequestRate } from '@/lib/store';
import type { SentinelEvent, ProcessedEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as SentinelEvent;
  const raw = body as SentinelEvent & { geoCountry?: string; geoCity?: string };
  const event: SentinelEvent = {
    ...body,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    // Normalise country — attacker/bank pages may send geoCountry or geoCity
    country: raw.country ?? raw.geoCountry ?? raw.geoCity ?? 'unknown',
    // Take the higher of store-calculated rate vs client-reported rate.
    // During DoS the attacker console reports the flood rate directly;
    // in the store-based path the flood events must already be ingested.
    requestRateLastMinute: Math.max(
      getRequestRate(body.userId),
      body.requestRateLastMinute ?? 0
    ),
  };

  const assessment = score(event);
  const processed: ProcessedEvent = { ...event, ...assessment };
  addEvent(processed);

  return NextResponse.json(assessment);
}

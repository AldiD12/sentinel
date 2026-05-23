// /app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { score } from '@/lib/sentinel/scorer';
import { addEvent, getRequestRate } from '@/lib/store';
import { consumeNonce } from '@/lib/challenge-store';
import type { SentinelEvent, ProcessedEvent, SealStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Seal validation
// ---------------------------------------------------------------------------
// Mirror of the browser's buildSealInput() in lib/mock-api.ts.
// Both sides must produce identical strings — any field change after signing
// produces a different hash and flags the payload as tampered.

function buildSealInput(
  nonce: string,
  event: SentinelEvent
): string {
  return `${nonce}|${event.userId}|${event.type}|${event.deviceFingerprint}|${Math.round(event.typingSpeedMs ?? 0)}`;
}

function computeSeal(nonce: string, event: SentinelEvent): string {
  return createHash('sha256').update(buildSealInput(nonce, event)).digest('hex');
}

function validateSeal(event: SentinelEvent): SealStatus {
  const { challengeNonce, telemetrySeal } = event;

  // No nonce or seal — caller skipped the challenge handshake entirely
  if (!challengeNonce || !telemetrySeal) return 'missing';

  // Consume the nonce (single-use, 30 s TTL)
  const nonceResult = consumeNonce(challengeNonce);
  if (nonceResult !== 'ok') return nonceResult; // 'expired' | 'reused' | 'forged'

  // Recompute hash server-side and compare
  const expected = computeSeal(challengeNonce, event);
  return expected === telemetrySeal ? 'valid' : 'tampered';
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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
    // Validate the cryptographic telemetry seal — NEVER trust sealStatus from client
    sealStatus: validateSeal(body),
  };

  const assessment = score(event);
  const processed: ProcessedEvent = { ...event, ...assessment };
  addEvent(processed);

  return NextResponse.json(assessment);
}

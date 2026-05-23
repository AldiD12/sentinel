// /lib/mock-api.ts
import type { SentinelEvent, RiskAssessment } from './types';

// ---------------------------------------------------------------------------
// Cryptographic Telemetry Seal
// ---------------------------------------------------------------------------
// Before every POST to /api/events the SDK:
//   1. Fetches a fresh single-use nonce from /api/challenge (30 s TTL)
//   2. Computes SHA-256( nonce | userId | type | deviceFingerprint | roundedTypingMs )
//      using the browser's native Web Crypto API — zero dependencies
//   3. Attaches challengeNonce + telemetrySeal to the payload
//
// The server recomputes the hash and validates:
//   - Nonce exists in the in-memory store (not forged)
//   - Nonce not expired (no replay of old captures)
//   - Nonce not already consumed (no duplicate replay)
//   - Hash matches (no field mutation after signing)
//
// Direct API callers (attacker console, curl, Postman) have no valid nonce
// and are immediately flagged: sealStatus:'missing' → telemetry_tampering +100.

/**
 * Canonical string that both browser and server hash identically.
 * Fields chosen because they are the most commonly spoofed in fraud attacks.
 */
function buildSealInput(
  nonce: string,
  userId: string,
  type: string,
  deviceFingerprint: string,
  typingSpeedMs: number | undefined
): string {
  return `${nonce}|${userId}|${type}|${deviceFingerprint}|${Math.round(typingSpeedMs ?? 0)}`;
}

async function computeSeal(
  nonce: string,
  event: Partial<SentinelEvent>
): Promise<string> {
  const input = buildSealInput(
    nonce,
    event.userId ?? '',
    event.type ?? '',
    event.deviceFingerprint ?? '',
    event.typingSpeedMs
  );
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function submitEvent(event: Partial<SentinelEvent>): Promise<RiskAssessment> {
  // Step 1 — obtain a fresh single-use nonce from the challenge endpoint
  const challengeRes = await fetch('/api/challenge', { cache: 'no-store' });
  if (!challengeRes.ok) {
    throw new Error('Sentinel challenge endpoint unavailable — cannot submit event securely');
  }
  const { nonce } = await challengeRes.json() as { nonce: string };

  // Step 2 — compute the SHA-256 telemetry seal in the browser
  const seal = await computeSeal(nonce, event);

  // Step 3 — attach the nonce + seal and POST to the detection engine
  const securedEvent: Partial<SentinelEvent> = {
    ...event,
    challengeNonce: nonce,
    telemetrySeal: seal,
  };

  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(securedEvent),
  });

  if (!res.ok) {
    throw new Error('Failed to submit event to Sentinel backend');
  }

  return res.json();
}

/**
 * Exported for use in tests that need to compute a valid seal without going
 * through the full submitEvent flow.
 */
export { buildSealInput };

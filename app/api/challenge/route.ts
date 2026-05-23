// /app/api/challenge/route.ts
// Issues a single-use, 30-second cryptographic nonce for the telemetry seal handshake.
//
// The bank portal's submitEvent() calls this before every POST to /api/events.
// The returned nonce is:
//   1. Stored server-side in the in-memory challenge store
//   2. SHA-256 hashed on the client with the key telemetry fields
//   3. Sent alongside the event payload as challengeNonce + telemetrySeal
//   4. Consumed (single-use) and validated in /api/events
//
// Callers that POST to /api/events without first calling this endpoint (e.g. the
// attacker console, curl scripts, Postman) will receive sealStatus:'missing' and
// trigger the telemetry_tampering signal (+100) in the detection engine.

import { NextResponse } from 'next/server';
import { issueNonce } from '@/lib/challenge-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nonce = issueNonce();
  return NextResponse.json(
    { nonce, expiresInMs: 30_000 },
    {
      headers: {
        // No caching — every response must be a fresh nonce
        'Cache-Control': 'no-store',
      },
    }
  );
}

// /lib/challenge-store.ts
// Single-use, short-lived cryptographic nonce store.
// Each nonce is issued by GET /api/challenge, consumed exactly once by
// POST /api/events during seal validation, and expires after NONCE_TTL_MS.
//
// This ensures:
//   - Replay attacks fail (nonce already consumed → 'reused')
//   - Old captures fail (nonce past TTL → 'expired')
//   - Forged nonces fail (never in store → 'forged')

import { SealStatus } from './types';

interface NonceEntry {
  expiresAt: number;
  used: boolean;
}

const nonces = new Map<string, NonceEntry>();
const NONCE_TTL_MS = 30_000; // 30 seconds — tight enough to block replays, loose enough for slow connections

export function issueNonce(): string {
  const nonce = crypto.randomUUID();
  nonces.set(nonce, { expiresAt: Date.now() + NONCE_TTL_MS, used: false });

  // Prune expired entries to keep memory bounded (hot path is O(1) insert)
  if (nonces.size > 5_000) {
    const now = Date.now();
    for (const [k, v] of nonces) {
      if (v.expiresAt < now) nonces.delete(k);
    }
  }

  return nonce;
}

/**
 * Consumes a nonce and returns its validity status.
 * A consumed nonce is permanently marked used — calling again returns 'reused'.
 */
export function consumeNonce(nonce: string): Exclude<SealStatus, 'valid' | 'missing' | 'tampered'> | 'ok' {
  const entry = nonces.get(nonce);

  if (!entry) return 'forged';
  if (entry.used) return 'reused';
  if (Date.now() > entry.expiresAt) {
    nonces.delete(nonce);
    return 'expired';
  }

  entry.used = true;
  return 'ok';
}

export function getNonceCount() {
  return nonces.size;
}

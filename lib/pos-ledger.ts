// /lib/pos-ledger.ts
// In-memory Physical Card POS ledger for cross-channel contextual verification.
// Seeded with demo swipes so the "Legitimate Travel" scenario always clears.

export interface PosSwipe {
  userId: string;
  country: string;
  merchant: string;
  timestamp: number;
}

// Dynamic swipes added at runtime (from attacker console or API)
const runtimeSwipes: PosSwipe[] = [];

// Always return a "fresh" demo swipe so the travel scenario reliably clears.
// Computing at call time avoids module-load timestamp staleness.
function demoSwipes(): PosSwipe[] {
  return [
    {
      userId: 'user_001',
      country: 'IT',
      merchant: 'Starbucks - Milano Centrale',
      timestamp: Date.now() - 45 * 60 * 1000, // 45 min ago
    },
    {
      userId: 'user_002',
      country: 'IT',
      merchant: 'McDonald\'s - Roma Termini',
      timestamp: Date.now() - 90 * 60 * 1000, // 90 min ago
    },
  ];
}

export function getRecentCardSwipe(
  userId: string,
  country: string,
  withinMs = 2 * 60 * 60 * 1000,
): PosSwipe | null {
  const cutoff = Date.now() - withinMs;
  return [...demoSwipes(), ...runtimeSwipes].find(
    s => s.userId === userId && s.country === country && s.timestamp > cutoff,
  ) ?? null;
}

export function addPosSwipe(userId: string, country: string, merchant: string): PosSwipe {
  const swipe: PosSwipe = { userId, country, merchant, timestamp: Date.now() };
  runtimeSwipes.push(swipe);
  return swipe;
}

export function getAllSwipes(): PosSwipe[] {
  return [...demoSwipes(), ...runtimeSwipes];
}

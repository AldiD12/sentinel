// /lib/sentinel/scorer.test.ts
// Run: npx ts-node --skip-project --compiler-options '{"module":"commonjs"}' lib/sentinel/scorer.test.ts
import { score } from './scorer';
import { addEvent, clearStore } from '../store';
import type { SentinelEvent, ProcessedEvent } from '../types';

function makeProcessed(partial: Partial<ProcessedEvent> & Pick<ProcessedEvent, 'userId' | 'type' | 'timestamp'>): ProcessedEvent {
  return {
    id: crypto.randomUUID(),
    ip: '85.31.45.12',
    country: 'AL',
    asn: 'AS21246 Vodafone AL',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
    deviceFingerprint: 'fp_aldi_iphone',
    eventId: crypto.randomUUID(),
    score: 0,
    verdict: 'allow',
    signals: [],
    latencyMs: 1,
    recommendation: 'NO ACTION REQUIRED — Session cleared all risk checks.',
    ...partial,
  };
}

const NOW = Date.now();

const scenarios: Array<{
  label: string;
  seed?: ProcessedEvent[];
  event: SentinelEvent;
  expectedVerdict: string;
  minScore: number;
}> = [
  {
    label: 'S1 — Phishing Login (RU IP, curl UA, pasted password)',
    // No prior state needed — login event, store irrelevant
    event: {
      id: crypto.randomUUID(),
      userId: 'user_001',
      type: 'login',
      timestamp: NOW,
      ip: '185.220.101.34',
      country: 'RU',
      asn: 'AS12345 RUnet',
      userAgent: 'curl/7.88.1',
      deviceFingerprint: 'fp_unknown_curl',
      inputMethod: 'pasted',
    },
    expectedVerdict: 'block',
    minScore: 86,
    // unknown_network +20, impossible_travel +35, high_risk_geo +25, no_human_input +25, pasted_credentials +15 = 120 → capped 100
  },
  {
    label: 'S2 — Account Takeover (unknown device, view→add_payee→transfer in 8 s, €5000)',
    seed: [
      // Attacker viewed balance 7 s ago (suppresses api_replay_pattern — realistic ATO)
      makeProcessed({ userId: 'user_001', type: 'view_balance', timestamp: NOW - 7_000 }),
      // Attacker added new payee 4 s ago
      makeProcessed({ userId: 'user_001', type: 'add_payee', timestamp: NOW - 4_000, payeeId: 'payee_new_attacker', deviceFingerprint: 'fp_unknown_attacker' }),
    ],
    event: {
      id: crypto.randomUUID(),
      userId: 'user_001',
      type: 'transfer',
      timestamp: NOW,
      ip: '85.31.45.99',
      country: 'AL',
      asn: 'AS21246 Vodafone AL',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
      deviceFingerprint: 'fp_unknown_attacker',   // unknown device
      inputMethod: 'typed',
      amount: 5000,
      payeeId: 'payee_new_attacker',
      payeeName: 'Attacker Account',
      isKnownPayee: false,
    },
    expectedVerdict: 'block',
    minScore: 86,
    // unknown_network +20, transfer_velocity +25 (4 s gap), rapid_payee_transfer +25,
    // amount_anomaly +25, new_payee_large +20, round_large_amount +10 = 125 → capped 100
  },
  {
    label: 'S3 — API Replay (python UA, direct transfer, no view_balance in store)',
    // Empty store → api_replay_pattern fires
    event: {
      id: crypto.randomUUID(),
      userId: 'user_002',
      type: 'transfer',
      timestamp: NOW,
      ip: '10.0.0.1',
      country: 'AL',
      asn: 'AS99999 Unknown',
      userAgent: 'python-requests/2.31.0',
      deviceFingerprint: 'fp_unknown_bot',
      amount: 1000,
      payeeId: 'payee_unknown',
      payeeName: 'Unknown',
      isKnownPayee: false,
    },
    expectedVerdict: 'block',
    minScore: 86,
    // unknown_network +20, no_human_input +25, api_replay_pattern +30,
    // amount_anomaly +25, new_payee_large +20, round_large_amount +10 = 130 → capped 100
  },
  {
    label: 'S4 — Mini-DoS Cover (52 req/min flood, transfer in middle)',
    // Empty store → api_replay_pattern fires; flood visible via requestRateLastMinute
    event: {
      id: crypto.randomUUID(),
      userId: 'user_003',
      type: 'transfer',
      timestamp: NOW,
      ip: '85.27.10.5',
      country: 'AL',
      asn: 'AS8585 ALBtelecom',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      deviceFingerprint: 'fp_kristi_macbook',
      requestRateLastMinute: 52,
      amount: 2000,
      payeeId: 'payee_unknown_dos',
      payeeName: 'Cover Target',
      isKnownPayee: false,
    },
    expectedVerdict: 'block',
    minScore: 86,
    // request_flood +40, api_replay_pattern +30,
    // amount_anomaly +25, new_payee_large +20, round_large_amount +10 = 125 → capped 100
  },
  {
    label: 'S5 — Legitimate Travel (Italy IP, SAME device, €80 to known payee)',
    seed: [
      // User viewed balance 30 s ago — normal session flow
      makeProcessed({ userId: 'user_001', type: 'view_balance', timestamp: NOW - 30_000 }),
    ],
    event: {
      id: crypto.randomUUID(),
      userId: 'user_001',
      type: 'transfer',
      timestamp: NOW,
      ip: '151.43.210.5',
      country: 'IT',
      asn: 'AS1234 Telecom Italia',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
      deviceFingerprint: 'fp_aldi_iphone',   // SAME known device
      inputMethod: 'typed',
      typingSpeedMs: 190,
      amount: 80,
      payeeId: 'payee_mom',
      payeeName: 'Mom',
      isKnownPayee: true,
      precedingEvents: ['login', 'view_balance'],
    },
    expectedVerdict: 'allow',
    minScore: 0,
    // impossible_travel +35, unknown_network +20 (Italian ASN)
    // cross_channel_verified -35 (POS demo swipe in IT neutralises travel penalty)
    // Net: 20 → allow — even better than soft_challenge: no friction for the legitimate traveller
  },
];

let passed = 0;
let failed = 0;

for (const { label, seed, event, expectedVerdict, minScore } of scenarios) {
  clearStore();
  for (const e of seed ?? []) addEvent(e);

  const result = score(event);
  const ok = result.verdict === expectedVerdict && result.score >= minScore;

  console.log(`\n${ok ? '✓ PASS' : '✗ FAIL'} ${label}`);
  console.log(`  score=${result.score}  verdict=${result.verdict}  (expected verdict=${expectedVerdict}, minScore=${minScore})`);
  console.log('  signals fired:');
  for (const s of result.signals) {
    console.log(`    [${s.layer}] ${s.name} +${s.weight} — ${s.reason}`);
  }
  if (!ok) {
    console.log(`  *** MISMATCH: got verdict="${result.verdict}" score=${result.score}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

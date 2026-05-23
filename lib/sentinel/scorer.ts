// /lib/sentinel/scorer.ts
import type { SentinelEvent, RiskAssessment, Signal } from '../types';
import { USERS } from '../users';
import { networkDetectors } from './network';
import { behavioralDetectors } from './behavioral';
import { transactionalDetectors } from './transactional';

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------
// Translates verdict + dominant signals into a plain-language action instruction.
// Goal: the SOC analyst reads one sentence and knows exactly what to do —
// no manual signal correlation, no guesswork, no post-incident delay.

const SIGNAL_THREAT_LABELS: Record<string, string> = {
  telemetry_tampering:    'direct API injection (no browser handshake)',
  bot_tls_fingerprint:    'automated bot / scripted attack',
  request_flood:          'rate-flood DoS cover attack',
  impossible_travel:      'impossible geographic travel',
  high_risk_geo:          'high-risk jurisdiction origin',
  unknown_network:        'unrecognised device or network provider',
  missing_mouse_cadence:  'bot-speed input (no human biometrics)',
  pasted_credentials:     'pasted credentials (phishing indicator)',
  api_replay_pattern:     'direct API replay (no session flow)',
  transfer_velocity:      'machine-speed transaction sequence',
  amount_anomaly:         'anomalous transfer amount (>3σ from baseline)',
  new_payee_large:        'large transfer to an unregistered payee',
  rapid_payee_transfer:   'payee registered and drained within 60 s',
  round_large_amount:     'round-number large transfer (fraud pattern)',
  cross_channel_verified: 'POS card swipe confirms legitimate travel',
};

function buildRecommendation(verdict: RiskAssessment['verdict'], signals: Signal[]): string {
  // Dominant signals (positive weight, sorted descending) for threat narrative
  const threats = signals
    .filter(s => s.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(s => SIGNAL_THREAT_LABELS[s.name] ?? s.name);

  const threatSummary = threats.length
    ? `Triggered by: ${threats.join('; ')}.`
    : '';

  switch (verdict) {
    case 'allow':
      return 'NO ACTION REQUIRED — Session cleared all risk checks. Customer continues normally with zero friction.';

    case 'soft_challenge':
      return `SEND SMS OTP — Deliver one-time code to customer\'s registered mobile number. ${threatSummary} Customer completes OTP in-app; no branch visit or call needed. Auto-allow if code is verified within 5 minutes.`;

    case 'hard_challenge':
      return `ESCALATE FOR REVIEW — Require full re-authentication (password + OTP). ${threatSummary} Flag this session in the analyst queue. If the customer cannot re-authenticate, suspend the session and initiate outbound verification call. Do not allow the transaction until identity is re-confirmed.`;

    case 'block':
      return `FREEZE & INCIDENT — Transaction blocked immediately. ${threatSummary} Actions: (1) Freeze all pending transactions for this session. (2) Open an incident ticket. (3) Notify customer via SMS that suspicious activity was detected. (4) Escalate to fraud team within 15 minutes. Do not unblock without analyst sign-off.`;
  }
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export function score(event: SentinelEvent): RiskAssessment {
  const startTime = performance.now();
  const baseline = USERS[event.userId];

  if (!baseline) {
    const signals: Signal[] = [{ name: 'unknown_user', layer: 'network', weight: 100, reason: 'User ID not in system' }];
    return {
      eventId: event.id!,
      score: 100,
      verdict: 'block',
      signals,
      recommendation: 'FREEZE & INCIDENT — Unknown user ID submitted to the API. This is either a configuration error or an enumeration attack. Open an incident ticket and investigate the source IP immediately.',
      latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  const signals: Signal[] = [
    ...networkDetectors(event, baseline),
    ...behavioralDetectors(event, baseline),
    ...transactionalDetectors(event, baseline),
  ];

  // Clamp to [0, 100] — negative weights (e.g. cross_channel_verified) can reduce score below zero
  const totalScore = Math.max(0, Math.min(100, signals.reduce((s, sig) => s + sig.weight, 0)));

  let verdict: RiskAssessment['verdict'];
  if (totalScore <= 30) verdict = 'allow';
  else if (totalScore <= 60) verdict = 'soft_challenge';
  else if (totalScore <= 85) verdict = 'hard_challenge';
  else verdict = 'block';

  return {
    eventId: event.id!,
    score: totalScore,
    verdict,
    signals,
    recommendation: buildRecommendation(verdict, signals),
    latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

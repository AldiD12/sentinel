// /lib/sentinel/scorer.ts
import type { SentinelEvent, RiskAssessment, Signal } from '../types';
import { USERS } from '../users';
import { networkDetectors } from './network';
import { behavioralDetectors } from './behavioral';
import { transactionalDetectors } from './transactional';

export function score(event: SentinelEvent): RiskAssessment {
  const startTime = performance.now();
  const baseline = USERS[event.userId];

  if (!baseline) {
    return {
      eventId: event.id!,
      score: 100,
      verdict: 'block',
      signals: [{ name: 'unknown_user', layer: 'network', weight: 100, reason: 'User ID not in system' }],
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
    latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

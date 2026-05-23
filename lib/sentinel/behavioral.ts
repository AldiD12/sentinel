// /lib/sentinel/behavioral.ts
import type { SentinelEvent, UserBaseline, Signal } from '../types';
import { getRecentEventForUserByType, getLastEventForUser } from '../store';

// +25 — no mouse movement detected OR machine-speed keystroke timing.
// Automated scripts emit zero coordinate telemetry or type at inhuman speeds.
function detectMissingMouseCadence(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  const noMouse = event.mouseMovementScore !== undefined && event.mouseMovementScore < 20;
  const tooFast = event.typingSpeedMs !== undefined && event.typingSpeedMs < 50;

  if (!noMouse && !tooFast) return null;

  const parts: string[] = [];
  if (noMouse) {
    parts.push(
      `mouse movement score ${event.mouseMovementScore}/100 — below human threshold of 20 (automated execution produces zero or near-zero pointer telemetry)`
    );
  }
  if (tooFast) {
    parts.push(
      `typing speed ${event.typingSpeedMs} ms/key is below human minimum of 50 ms — consistent with programmatic credential injection`
    );
  }

  return { name: 'missing_mouse_cadence', layer: 'behavioral', weight: 25, reason: parts.join('; ') };
}

// +15 — credentials were pasted, not typed (phishing paste indicator)
function detectPastedCredentials(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (event.type !== 'login' && event.type !== 'change_password') return null;
  if (event.inputMethod !== 'pasted') return null;

  return {
    name: 'pasted_credentials',
    layer: 'behavioral',
    weight: 15,
    reason: `Credentials submitted via paste (inputMethod="${event.inputMethod}") on "${event.type}" — consistent with phishing-harvested credentials`,
  };
}

// +30 — transfer with no preceding view_balance in last 5 min (direct API call pattern)
function detectApiReplayPattern(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer') return null;

  const hasViewBalance = event.precedingEvents?.includes('view_balance') ?? false;
  if (hasViewBalance) return null;

  const recentViewBalance = getRecentEventForUserByType(
    event.userId,
    'view_balance',
    5 * 60 * 1000
  );
  if (recentViewBalance) return null;

  return {
    name: 'api_replay_pattern',
    layer: 'behavioral',
    weight: 30,
    reason: `Transfer submitted with no preceding view_balance event in last 300 s — consistent with direct API replay`,
  };
}

// +25 — transfer arrived < 8 s after the previous event (machine-speed navigation)
function detectTransferVelocity(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer') return null;

  if (event.precedingEvents && event.precedingEvents.length > 0) return null;

  const last = getLastEventForUser(event.userId);
  if (!last?.timestamp || !event.timestamp) return null;

  const elapsedMs = event.timestamp - last.timestamp;
  const THRESHOLD_MS = 8_000;
  if (elapsedMs >= THRESHOLD_MS) return null;

  return {
    name: 'transfer_velocity',
    layer: 'behavioral',
    weight: 25,
    reason: `Transfer submitted ${elapsedMs} ms after "${last.type}" event — below human navigation threshold of ${THRESHOLD_MS} ms`,
  };
}

export function behavioralDetectors(event: SentinelEvent, baseline: UserBaseline): Signal[] {
  return [
    detectMissingMouseCadence(event, baseline),
    detectPastedCredentials(event, baseline),
    detectApiReplayPattern(event, baseline),
    detectTransferVelocity(event, baseline),
  ].filter((s): s is Signal => s !== null);
}

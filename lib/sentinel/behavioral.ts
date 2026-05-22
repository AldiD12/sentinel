// /lib/sentinel/behavioral.ts
import type { SentinelEvent, UserBaseline, Signal } from '../types';
import { getRecentEventForUserByType, getLastEventForUser } from '../store';

const BOT_UA = /curl|python-requests|wget|scrapy|mechanize|phantomjs|headless|selenium|puppeteer|playwright/i;

// +25 — bot/automation UA or machine-speed keystroke timing
function detectNoHumanInput(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  const isBotUA = BOT_UA.test(event.userAgent);
  const tooFast =
    event.typingSpeedMs !== undefined && event.typingSpeedMs < 50;

  if (!isBotUA && !tooFast) return null;

  const parts: string[] = [];
  if (isBotUA) {
    parts.push(`User-Agent "${event.userAgent}" matches bot/automation pattern`);
  }
  if (tooFast) {
    parts.push(
      `typing speed ${event.typingSpeedMs} ms is below human minimum of 50 ms`
    );
  }

  return { name: 'no_human_input', layer: 'behavioral', weight: 25, reason: parts.join('; ') };
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
    detectNoHumanInput(event, baseline),
    detectPastedCredentials(event, baseline),
    detectApiReplayPattern(event, baseline),
    detectTransferVelocity(event, baseline),
  ].filter((s): s is Signal => s !== null);
}

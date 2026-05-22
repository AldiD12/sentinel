import type { SentinelEvent, EventType } from './types';

const DEVICE_PROFILES: Record<string, Pick<SentinelEvent, 'ip'|'asn'|'geoCountry'|'geoCity'|'userAgent'|'deviceFingerprint'>> = {
  user_001: {
    ip: '85.31.45.12',
    asn: 'AS21246 Vodafone AL',
    geoCountry: 'AL',
    geoCity: 'Tirana',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
    deviceFingerprint: 'fp_aldi_iphone',
  },
  user_002: {
    ip: '85.31.50.22',
    asn: 'AS21246 Vodafone AL',
    geoCountry: 'AL',
    geoCity: 'Tirana',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B)',
    deviceFingerprint: 'fp_anest_samsung',
  },
  user_003: {
    ip: '85.27.10.5',
    asn: 'AS8585 ALBtelecom',
    geoCountry: 'AL',
    geoCity: 'Durres',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    deviceFingerprint: 'fp_kristi_macbook',
  },
};

export function buildEvent(
  type: EventType,
  userId: string,
  sessionId: string,
  sessionStartMs: number,
  precedingEvents: EventType[],
  extra: Partial<SentinelEvent> = {}
): Partial<SentinelEvent> {
  const profile = DEVICE_PROFILES[userId] ?? DEVICE_PROFILES['user_001'];
  const now = Date.now();

  let overrides: Partial<SentinelEvent> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('sentinel_telemetry_overrides');
      if (stored) {
        overrides = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse sentinel_telemetry_overrides', e);
    }
  }

  return {
    type,
    userId,
    sessionId,
    ...profile,
    sessionAgeMs: now - sessionStartMs,
    timeSinceLastEventMs: 500 + Math.random() * 2000,
    mouseMovementScore: 65 + Math.floor(Math.random() * 30),
    typingSpeedMs: 150 + Math.floor(Math.random() * 80),
    precedingEvents,
    requestRateLastMinute: 3 + Math.floor(Math.random() * 5),
    hasValidCSRF: true,
    ...overrides,
    ...extra,
  } as any; // Cast in case types are slightly stricter in types.ts
}

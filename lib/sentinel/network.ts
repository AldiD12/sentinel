// /lib/sentinel/network.ts
import type { SentinelEvent, UserBaseline, Signal } from '../types';

const HIGH_RISK_COUNTRIES = new Set(['RU', 'KP', 'IR', 'BY', 'VN', 'NG', 'CN']);

// +20 — device fingerprint or ASN not seen before for this user
function detectUnknownNetwork(event: SentinelEvent, baseline: UserBaseline): Signal | null {
  const unknownDevice = !baseline.usualDevices.includes(event.deviceFingerprint);
  const unknownAsn = event.asn
    ? !baseline.usualASNs.some(a => event.asn!.startsWith(a.split(' ')[0]))
    : false;

  if (!unknownDevice && !unknownAsn) return null;

  const parts: string[] = [];
  if (unknownDevice) {
    parts.push(
      `device "${event.deviceFingerprint}" not in ${baseline.usualDevices.length} known device(s) [${baseline.usualDevices.join(', ')}]`
    );
  }
  if (unknownAsn) {
    parts.push(
      `ASN "${event.asn}" not in known ASNs [${baseline.usualASNs.join(', ')}]`
    );
  }

  return { name: 'unknown_network', layer: 'network', weight: 20, reason: parts.join('; ') };
}

// +35 — country differs from user's registered home country
function detectImpossibleTravel(event: SentinelEvent, baseline: UserBaseline): Signal | null {
  if (event.country === baseline.usualCountry) return null;

  return {
    name: 'impossible_travel',
    layer: 'network',
    weight: 35,
    reason: `Request from "${event.country}" but user "${baseline.userId}" home country is "${baseline.usualCountry}"`,
  };
}

// +40 — request rate in last 60 s exceeds flood threshold
function detectRequestFlood(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  const rate = event.requestRateLastMinute ?? 0;
  const THRESHOLD = 20;
  if (rate <= THRESHOLD) return null;

  return {
    name: 'request_flood',
    layer: 'network',
    weight: 40,
    reason: `${rate} requests in last 60 s — exceeds flood threshold of ${THRESHOLD}`,
  };
}

// +25 — origin country is on the high-risk jurisdiction list
function detectHighRiskGeo(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (!HIGH_RISK_COUNTRIES.has(event.country)) return null;

  return {
    name: 'high_risk_geo',
    layer: 'network',
    weight: 25,
    reason: `Origin country "${event.country}" is on the high-risk jurisdiction list (${Array.from(HIGH_RISK_COUNTRIES).join(', ')})`,
  };
}

export function networkDetectors(event: SentinelEvent, baseline: UserBaseline): Signal[] {
  return [
    detectUnknownNetwork(event, baseline),
    detectImpossibleTravel(event, baseline),
    detectRequestFlood(event, baseline),
    detectHighRiskGeo(event, baseline),
  ].filter((s): s is Signal => s !== null);
}

// /lib/sentinel/network.ts
import type { SentinelEvent, UserBaseline, Signal } from '../types';
import { getRecentCardSwipe } from '../pos-ledger';

const HIGH_RISK_COUNTRIES = new Set(['RU', 'KP', 'IR', 'BY', 'VN', 'NG', 'CN']);

const BOT_UA = /curl|python-requests|wget|scrapy|mechanize|phantomjs|headless|selenium|puppeteer|playwright/i;

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

// +35 — country differs from user's home baseline (or -35 via cross-channel POS clearance)
function detectImpossibleTravel(event: SentinelEvent, baseline: UserBaseline, country: string): Signal | null {
  if (country === baseline.usualCountry) return null;

  return {
    name: 'impossible_travel',
    layer: 'network',
    weight: 35,
    reason: `Request from "${country}" but user "${baseline.userId}" home country is "${baseline.usualCountry}"`,
  };
}

// -35 — Physical Card POS swipe confirms user is genuinely in the foreign country.
// Neutralises the impossible_travel penalty and prevents false-positive lockout.
function detectCrossChannelVerified(event: SentinelEvent, baseline: UserBaseline, country: string): Signal | null {
  if (country === baseline.usualCountry) return null;

  const swipe = getRecentCardSwipe(event.userId, country);
  if (!swipe) return null;

  const agoMin = Math.round((Date.now() - swipe.timestamp) / 60_000);
  return {
    name: 'cross_channel_verified',
    layer: 'network',
    weight: -35,
    reason: `Physical Card POS swipe confirmed at "${swipe.merchant}" (${country}) ${agoMin} min ago — impossible_travel penalty neutralised`,
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
function detectHighRiskGeo(event: SentinelEvent, _baseline: UserBaseline, country: string): Signal | null {
  if (!HIGH_RISK_COUNTRIES.has(country)) return null;

  return {
    name: 'high_risk_geo',
    layer: 'network',
    weight: 25,
    reason: `Origin country "${country}" is on the high-risk jurisdiction list (${Array.from(HIGH_RISK_COUNTRIES).join(', ')})`,
  };
}

// +45 — User-Agent matches known bot/automation framework signature.
// Proxy for JA3 TLS fingerprinting: headless browsers expose distinct UA strings
// that differ from genuine browser TLS Client Hello fingerprints.
function detectBotTlsFingerprint(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (!BOT_UA.test(event.userAgent)) return null;

  return {
    name: 'bot_tls_fingerprint',
    layer: 'network',
    weight: 45,
    reason: `User-Agent "${event.userAgent}" matches bot/automation TLS fingerprint pattern (curl, Python-Requests, Playwright, Puppeteer, etc.)`,
  };
}

export function networkDetectors(event: SentinelEvent, baseline: UserBaseline): Signal[] {
  const country = event.country ?? event.geoCountry ?? event.geoCity ?? 'unknown';

  return [
    detectUnknownNetwork(event, baseline),
    detectImpossibleTravel(event, baseline, country),
    detectCrossChannelVerified(event, baseline, country),
    detectRequestFlood(event, baseline),
    detectHighRiskGeo(event, baseline, country),
    detectBotTlsFingerprint(event, baseline),
  ].filter((s): s is Signal => s !== null);
}

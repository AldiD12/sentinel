// /app/api/matrix/route.ts
// Returns the complete SENTINEL decision matrix:
//   - Every signal: name, layer, weight, human-readable condition
//   - Every verdict tier: score range, verdict, analyst action, customer UX
//   - Attack → signal mapping: which signals each known attack type triggers
//
// This endpoint feeds the SOC's "Decision Matrix" tab so analysts and auditors
// can inspect the full logic in one screen — no source code required.
// Also serves as the "matrix" deliverable required by the Fibank challenge brief.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matrix = {
    signals: [
      // ── Network layer ──────────────────────────────────────────────────────
      {
        name: 'telemetry_tampering',
        layer: 'network',
        weight: 100,
        condition: 'Payload missing valid cryptographic handshake — direct API call, not a browser session',
        mitigationNote: 'Single-use SHA-256 nonce; fires before any other signal is evaluated',
      },
      {
        name: 'bot_tls_fingerprint',
        layer: 'network',
        weight: 45,
        condition: 'User-Agent matches known automation framework (curl, Playwright, Puppeteer, Selenium…)',
        mitigationNote: 'Proxy for JA3 TLS fingerprinting; headless browsers expose distinct UA strings',
      },
      {
        name: 'request_flood',
        layer: 'network',
        weight: 40,
        condition: 'More than 20 requests from this user in the last 60 seconds',
        mitigationNote: 'Detects rate-flood cover attacks masking a covert transfer',
      },
      {
        name: 'impossible_travel',
        layer: 'network',
        weight: 35,
        condition: 'Request origin country differs from user\'s registered home country',
        mitigationNote: 'Neutralised by cross_channel_verified if physical POS swipe confirms travel',
      },
      {
        name: 'high_risk_geo',
        layer: 'network',
        weight: 25,
        condition: 'Origin country is on high-risk jurisdiction list (RU, KP, IR, BY, VN, NG, CN)',
        mitigationNote: 'Compound with impossible_travel for maximum signal',
      },
      {
        name: 'unknown_network',
        layer: 'network',
        weight: 20,
        condition: 'Device fingerprint or ASN not previously seen for this user',
        mitigationNote: 'Baseline built from usualDevices[] and usualASNs[] per user profile',
      },
      {
        name: 'cross_channel_verified',
        layer: 'network',
        weight: -35,
        condition: 'Physical POS card swipe in same foreign country within the last 4 hours',
        mitigationNote: 'Negative weight — reduces score to prevent false-positive blocking of travellers',
      },
      // ── Behavioral layer ───────────────────────────────────────────────────
      {
        name: 'missing_mouse_cadence',
        layer: 'behavioral',
        weight: 25,
        condition: 'Mouse movement score < 20/100 OR keystroke speed < 50 ms/key (bot territory)',
        mitigationNote: 'Human minimum: ~120 ms/key; automated scripts produce 2–10 ms/key',
      },
      {
        name: 'api_replay_pattern',
        layer: 'behavioral',
        weight: 30,
        condition: 'Transfer submitted with no view_balance event in preceding 5 minutes',
        mitigationNote: 'Legitimate users browse balance before transferring; bots skip this step',
      },
      {
        name: 'transfer_velocity',
        layer: 'behavioral',
        weight: 25,
        condition: 'Transfer submitted less than 8 seconds after the previous session event',
        mitigationNote: 'Human navigation threshold; machine-speed sequences indicate automation',
      },
      {
        name: 'pasted_credentials',
        layer: 'behavioral',
        weight: 15,
        condition: 'Login or password-change used paste input method instead of typing',
        mitigationNote: 'Phishing victims paste harvested credentials; typed input is more likely legitimate',
      },
      // ── Transactional layer ────────────────────────────────────────────────
      {
        name: 'amount_anomaly',
        layer: 'transactional',
        weight: 25,
        condition: 'Transfer amount exceeds user\'s historical mean + 3 standard deviations',
        mitigationNote: 'Per-user σ threshold: Aldi €240, Anest €170, Kristi €600',
      },
      {
        name: 'rapid_payee_transfer',
        layer: 'transactional',
        weight: 25,
        condition: 'Payee was registered (add_payee) within the last 60 seconds before this transfer',
        mitigationNote: 'ATO pattern: register attacker payee, immediately drain funds',
      },
      {
        name: 'new_payee_large',
        layer: 'transactional',
        weight: 20,
        condition: 'Transfer to unknown payee exceeds user\'s mean + 1σ',
        mitigationNote: 'Lower threshold for unknown payees than for established ones',
      },
      {
        name: 'round_large_amount',
        layer: 'transactional',
        weight: 10,
        condition: 'Transfer ≥ €500 and is a round multiple of €100',
        mitigationNote: 'Fraud amounts are typically round numbers; adds compound pressure to other signals',
      },
    ],

    verdictThresholds: [
      {
        verdict: 'allow',
        scoreRange: '0 – 30',
        customerExperience: 'Session continues — zero friction, no interruption',
        analystAction: 'No action required',
        recommendation: 'NO ACTION REQUIRED — Session cleared all risk checks.',
      },
      {
        verdict: 'soft_challenge',
        scoreRange: '31 – 60',
        customerExperience: 'SMS OTP sent to registered mobile — one code entry in the app',
        analystAction: 'Monitor; auto-resolved if OTP verified within 5 minutes',
        recommendation: 'SEND SMS OTP — Deliver one-time code to registered mobile. Auto-allow on verification.',
      },
      {
        verdict: 'hard_challenge',
        scoreRange: '61 – 85',
        customerExperience: 'Full re-authentication required before action is completed',
        analystAction: 'Flag in analyst queue; initiate outbound call if re-auth fails',
        recommendation: 'ESCALATE FOR REVIEW — Require full re-authentication. If customer cannot re-auth, suspend session and call.',
      },
      {
        verdict: 'block',
        scoreRange: '86 – 100',
        customerExperience: 'Action blocked; customer notified by SMS that suspicious activity was detected',
        analystAction: 'Freeze session → open incident ticket → notify fraud team within 15 minutes',
        recommendation: 'FREEZE & INCIDENT — Block transaction, open ticket, SMS customer, escalate to fraud team.',
      },
    ],

    attackScenarios: [
      {
        name: 'Phishing Login',
        description: 'Stolen credentials submitted from Tor exit node using curl, pasted into form',
        signalsFired: ['telemetry_tampering', 'bot_tls_fingerprint', 'impossible_travel', 'high_risk_geo', 'unknown_network', 'missing_mouse_cadence', 'pasted_credentials'],
        typicalScore: 100,
        expectedVerdict: 'block',
      },
      {
        name: 'Account Takeover (ATO)',
        description: 'Rapid sequence: login → register payee → €5,000 transfer in under 2 seconds',
        signalsFired: ['telemetry_tampering', 'impossible_travel', 'unknown_network', 'missing_mouse_cadence', 'transfer_velocity', 'amount_anomaly', 'rapid_payee_transfer', 'new_payee_large', 'round_large_amount'],
        typicalScore: 100,
        expectedVerdict: 'block',
      },
      {
        name: 'API Replay Attack',
        description: 'Direct POST to /transfer using stolen device fingerprint, bypassing session flow',
        signalsFired: ['telemetry_tampering', 'api_replay_pattern'],
        typicalScore: 100,
        expectedVerdict: 'block',
      },
      {
        name: 'Mini-DoS Cover',
        description: '50 rapid requests per second to mask a covert high-value transfer in the middle',
        signalsFired: ['telemetry_tampering', 'request_flood', 'missing_mouse_cadence', 'amount_anomaly', 'round_large_amount'],
        typicalScore: 100,
        expectedVerdict: 'block',
      },
      {
        name: 'Legitimate Travel (False-Positive Control)',
        description: 'Real customer using their own device from Italy — different country, normal behavior',
        signalsFired: ['impossible_travel', 'unknown_network'],
        mitigatingSignals: ['cross_channel_verified'],
        typicalScore: 55,
        expectedVerdict: 'soft_challenge',
        note: 'Proves false-positive control: challenged but never blocked. Customer enters OTP and continues.',
      },
    ],

    meta: {
      version: '1.0.0',
      totalSignals: 13,
      layers: ['network', 'behavioral', 'transactional'],
      scoringMethod: 'Weighted sum of fired signals, clamped to [0, 100]. Negative weights reduce score.',
      latencyTarget: '< 2 ms per assessment (measured with performance.now())',
      roadmap: 'Signal weights auto-tuned monthly by XGBoost trained on analyst override decisions',
    },
  };

  return NextResponse.json(matrix, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

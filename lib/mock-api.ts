// /lib/mock-api.ts
import type { SentinelEvent, RiskAssessment, ProcessedEvent, Signal, Verdict } from './types';
import { USERS } from './users';
import { addEvent, getRequestRate } from './store';

/**
 * Submits a Sentinel event to our client-side detection engine.
 * Assesses risk based on network, behavioral, and transactional baselines.
 */
export async function submitEvent(event: SentinelEvent): Promise<RiskAssessment> {
  // Simulate network/engine latency (80ms to 180ms)
  const latencyMs = Math.floor(Math.random() * 100) + 80;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  const timestamp = event.timestamp || Date.now();
  const eventId = event.id || `evt_${Math.random().toString(36).substring(2, 11)}`;

  const baseline = USERS[event.userId];
  const signals: Signal[] = [];
  let score = 0;

  if (baseline) {
    // ---------------------------------------------------------
    // 1. Network Layer Anomalies
    // ---------------------------------------------------------
    
    // Country anomaly
    if (event.country !== baseline.usualCountry) {
      signals.push({
        name: 'Unusual Country',
        layer: 'network',
        weight: 30,
        reason: `Access from country '${event.country}' deviates from baseline '${baseline.usualCountry}'`,
      });
      score += 30;
    }

    // IP anomaly (IP is not in known list)
    if (!baseline.usualIPs.includes(event.ip)) {
      signals.push({
        name: 'Unusual IP Address',
        layer: 'network',
        weight: 15,
        reason: `IP address '${event.ip}' is not in the user's historical IP profile`,
      });
      score += 15;
    }

    // ASN anomaly (ASN not in known list)
    if (event.asn && !baseline.usualASNs.includes(event.asn)) {
      signals.push({
        name: 'Unusual Network Provider',
        layer: 'network',
        weight: 10,
        reason: `Network autonomous system '${event.asn}' does not match registered providers`,
      });
      score += 10;
    }

    // ---------------------------------------------------------
    // 2. Behavioral Layer Anomalies
    // ---------------------------------------------------------

    // Device fingerprint anomaly
    if (!baseline.usualDevices.includes(event.deviceFingerprint)) {
      signals.push({
        name: 'Unrecognized Device Fingerprint',
        layer: 'behavioral',
        weight: 25,
        reason: `Device signature '${event.deviceFingerprint}' is unknown for this user`,
      });
      score += 25;
    }

    // User-agent anomaly
    if (event.userAgent !== baseline.usualUserAgent) {
      // Just check direct equality; in real life this is a fuzzy regex
      signals.push({
        name: 'Unusual Browser Signature',
        layer: 'behavioral',
        weight: 15,
        reason: 'User agent string contains unexpected operating system or version updates',
      });
      score += 15;
    }

    // Input method anomaly (e.g. paste on sensitive fields)
    if (event.inputMethod === 'pasted' && (event.type === 'login' || event.type === 'transfer')) {
      signals.push({
        name: 'Field Value Pasted',
        layer: 'behavioral',
        weight: 20,
        reason: `Data entered via paste on sensitive ${event.type} field (potential credential stuffing / macro automation)`,
      });
      score += 20;
    } else if (event.inputMethod === 'autofill') {
      signals.push({
        name: 'Autofill Detected',
        layer: 'behavioral',
        weight: 5,
        reason: 'Form elements populated via browser autofill manager',
      });
      score += 5;
    }

    // Typing speed anomaly
    if (event.typingSpeedMs !== undefined && event.typingSpeedMs > 0) {
      if (event.typingSpeedMs < 60) {
        // High confidence bot speed
        signals.push({
          name: 'Automated Keystroke Speed',
          layer: 'behavioral',
          weight: 35,
          reason: `Typing velocity (${event.typingSpeedMs}ms per key) matches automated programmatic scripts`,
        });
        score += 35;
      } else if (event.typingSpeedMs < baseline.typicalTypingSpeedMs * 0.5) {
        // Significantly faster than typical
        signals.push({
          name: 'Abnormally Fast Keystrokes',
          layer: 'behavioral',
          weight: 15,
          reason: `Typing speed (${event.typingSpeedMs}ms) is over 2x faster than typical baseline (${baseline.typicalTypingSpeedMs}ms)`,
        });
        score += 15;
      }
    }

    // Request Rate Anomaly (Rate of requests in last minute)
    // Add current event to rate (getRequestRate gets rate in past 60s from store)
    const activeRate = getRequestRate(event.userId, 60000) + 1;
    if (activeRate > 8) {
      signals.push({
        name: 'High Event Frequency',
        layer: 'behavioral',
        weight: 40,
        reason: `User is emitting ${activeRate} events/min, indicating high-speed flood or brute force`,
      });
      score += 40;
    }

    // ---------------------------------------------------------
    // 3. Transactional Layer Anomalies
    // ---------------------------------------------------------

    if (event.type === 'transfer' && event.amount !== undefined) {
      // High amount anomaly
      const upperLimit = baseline.avgTransferAmount + 2 * baseline.stdTransferAmount;
      if (event.amount > upperLimit) {
        signals.push({
          name: 'Anomalous Transaction Amount',
          layer: 'transactional',
          weight: 30,
          reason: `Transfer amount €${event.amount} significantly exceeds historical bounds (avg €${baseline.avgTransferAmount} + 2std)`,
        });
        score += 30;
      }

      // Known/Unknown Payee anomaly
      const isKnownPayee = event.payeeId ? baseline.knownPayees.includes(event.payeeId) : false;
      if (!isKnownPayee && event.payeeId) {
        signals.push({
          name: 'Unknown Payee Destination',
          layer: 'transactional',
          weight: 20,
          reason: `Recipient account '${event.payeeId}' (${event.payeeName || 'Unnamed'}) has no historical transactions`,
        });
        score += 20;
      }
    }
  } else {
    // Standard baseline for generic/anonymous users or missing baseline
    if (event.inputMethod === 'pasted') {
      signals.push({ name: 'Field Pasted', layer: 'behavioral', weight: 10, reason: 'Pasted input method' });
      score += 10;
    }
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Verdict selection
  let verdict: Verdict = 'allow';
  if (score >= 70) {
    verdict = 'block';
  } else if (score >= 45) {
    verdict = 'hard_challenge';
  } else if (score >= 20) {
    verdict = 'soft_challenge';
  }

  // Create standard risk assessment
  const assessment: RiskAssessment = {
    eventId,
    score,
    verdict,
    signals,
    latencyMs,
  };

  // Compile final processed event
  const processedEvent: ProcessedEvent = {
    ...event,
    id: eventId,
    timestamp,
    ...assessment,
  };

  // Save to shared memory store
  addEvent(processedEvent);

  return assessment;
}

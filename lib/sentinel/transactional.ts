// /lib/sentinel/transactional.ts
import type { SentinelEvent, UserBaseline, Signal } from '../types';
import { getEventsForUser } from '../store';

// +25 — amount is more than 3 std deviations above user's historical mean
function detectAmountAnomaly(event: SentinelEvent, baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer' || !event.amount) return null;

  const threshold = baseline.avgTransferAmount + 3 * baseline.stdTransferAmount;
  if (event.amount <= threshold) return null;

  const sigmas = ((event.amount - baseline.avgTransferAmount) / baseline.stdTransferAmount).toFixed(1);

  return {
    name: 'amount_anomaly',
    layer: 'transactional',
    weight: 25,
    reason: `Amount €${event.amount} is ${sigmas}σ above user mean of €${baseline.avgTransferAmount} (σ=€${baseline.stdTransferAmount}, 3σ threshold=€${threshold})`,
  };
}

// +20 — transfer to an unknown payee that exceeds avg + 1σ
function detectNewPayeeLarge(event: SentinelEvent, baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer' || !event.amount) return null;
  if (event.isKnownPayee) return null;

  const threshold = baseline.avgTransferAmount + baseline.stdTransferAmount;
  if (event.amount <= threshold) return null;

  return {
    name: 'new_payee_large',
    layer: 'transactional',
    weight: 20,
    reason: `Transfer of €${event.amount} to unknown payee "${event.payeeName ?? event.payeeId ?? 'unknown'}" exceeds threshold of €${threshold} (avg €${baseline.avgTransferAmount} + 1σ)`,
  };
}

// +25 — payee was added within the last 60 s before this transfer
function detectRapidPayeeTransfer(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer' || !event.payeeId) return null;

  const recent = getEventsForUser(event.userId, 60_000);
  const addPayeeEvent = recent.find(
    e => e.type === 'add_payee' && e.payeeId === event.payeeId
  );
  if (!addPayeeEvent?.timestamp || !event.timestamp) return null;

  const elapsedMs = event.timestamp - addPayeeEvent.timestamp;

  return {
    name: 'rapid_payee_transfer',
    layer: 'transactional',
    weight: 25,
    reason: `Payee "${event.payeeName ?? event.payeeId}" was added ${elapsedMs} ms ago — transfer followed add_payee within 60 s window`,
  };
}

// +10 — large round-number transfer (common fraud amount pattern)
function detectRoundLargeAmount(event: SentinelEvent, _baseline: UserBaseline): Signal | null {
  if (event.type !== 'transfer' || !event.amount) return null;
  if (event.amount < 500 || event.amount % 100 !== 0) return null;

  return {
    name: 'round_large_amount',
    layer: 'transactional',
    weight: 10,
    reason: `Transfer of €${event.amount} is a round number ≥ €500 — consistent with fraud amount patterns`,
  };
}

export function transactionalDetectors(event: SentinelEvent, baseline: UserBaseline): Signal[] {
  return [
    detectAmountAnomaly(event, baseline),
    detectNewPayeeLarge(event, baseline),
    detectRapidPayeeTransfer(event, baseline),
    detectRoundLargeAmount(event, baseline),
  ].filter((s): s is Signal => s !== null);
}

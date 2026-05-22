import type { SentinelEvent, RiskAssessment } from './types';

export async function submitEvent(event: Partial<SentinelEvent>): Promise<RiskAssessment> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error('Failed to submit event to backend');
  }
  return res.json();
}

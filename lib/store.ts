// /lib/store.ts
import type { SentinelEvent, ProcessedEvent, EventType } from './types';

const events: ProcessedEvent[] = [];
const eventEmitters = new Set<(e: ProcessedEvent) => void>();

export function addEvent(event: ProcessedEvent) {
  events.push(event);
  eventEmitters.forEach(fn => fn(event));
  // Keep memory bounded
  if (events.length > 1000) events.shift();
}

export function getAllEvents() {
  return [...events];
}

export function getEventsForUser(userId: string, limitMs = 3600000) {
  const cutoff = Date.now() - limitMs;
  return events.filter(e => e.userId === userId && e.timestamp! > cutoff);
}

export function getLastEventForUser(userId: string) {
  return [...events].reverse().find(e => e.userId === userId);
}

export function getRecentEventForUserByType(userId: string, type: EventType, withinMs: number) {
  const cutoff = Date.now() - withinMs;
  return [...events].reverse().find(e =>
    e.userId === userId && e.type === type && e.timestamp! > cutoff
  );
}

export function getRequestRate(userId: string, withinMs = 60000) {
  const cutoff = Date.now() - withinMs;
  return events.filter(e => e.userId === userId && e.timestamp! > cutoff).length;
}

export function subscribeToEvents(fn: (e: ProcessedEvent) => void) {
  eventEmitters.add(fn);
  return () => eventEmitters.delete(fn);
}

export function overrideEvent(eventId: string, note: string): ProcessedEvent | null {
  const event = events.find(e => e.eventId === eventId);
  if (!event) return null;
  event.overridden = true;
  event.overrideNote = note;
  eventEmitters.forEach(fn => fn(event));
  return event;
}

export function clearStore() {
  events.length = 0;
}

export function getStats() {
  const allowed = events.filter(e => e.verdict === 'allow').length;
  const challenged = events.filter(e => e.verdict === 'soft_challenge' || e.verdict === 'hard_challenge').length;
  const blocked = events.filter(e => e.verdict === 'block').length;
  const avgLatency = events.length
    ? events.reduce((s, e) => s + e.latencyMs, 0) / events.length
    : 0;
  return { allowed, challenged, blocked, avgLatency: Math.round(avgLatency) };
}

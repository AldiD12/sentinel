// /app/api/stream/route.ts
import { subscribeToEvents, getAllEvents, getStats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  let closed = false;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(data);
        } catch {
          // Controller closed mid-stream — unsubscribe silently
          closed = true;
          cleanup();
        }
      };

      // Send initial snapshot on connect
      enqueue(`data: ${JSON.stringify({ type: 'snapshot', data: getAllEvents().slice(-50) })}\n\n`);
      enqueue(`data: ${JSON.stringify({ type: 'stats', data: getStats() })}\n\n`);

      const unsubscribe = subscribeToEvents((event) => {
        enqueue(`data: ${JSON.stringify({ type: 'event', data: event })}\n\n`);
        enqueue(`data: ${JSON.stringify({ type: 'stats', data: getStats() })}\n\n`);
      });

      const interval = setInterval(() => {
        enqueue(`: heartbeat\n\n`);
      }, 15000);

      cleanup = () => {
        unsubscribe();
        clearInterval(interval);
      };
    },

    cancel() {
      // Client disconnected cleanly
      closed = true;
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

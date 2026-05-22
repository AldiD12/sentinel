// /app/api/stream/route.ts
import { subscribeToEvents, getAllEvents, getStats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot
      const initial = getAllEvents().slice(-50);
      controller.enqueue(`data: ${JSON.stringify({ type: 'snapshot', data: initial })}\n\n`);
      controller.enqueue(`data: ${JSON.stringify({ type: 'stats', data: getStats() })}\n\n`);

      const unsubscribe = subscribeToEvents((event) => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'event', data: event })}\n\n`);
        controller.enqueue(`data: ${JSON.stringify({ type: 'stats', data: getStats() })}\n\n`);
      });

      // Cleanup on close
      const interval = setInterval(() => {
        controller.enqueue(`: heartbeat\n\n`);
      }, 15000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
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

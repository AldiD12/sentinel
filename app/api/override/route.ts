// /app/api/override/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { overrideEvent } from '@/lib/store';

export async function POST(req: NextRequest) {
  const { eventId, note } = await req.json() as { eventId: string; note: string };

  if (!eventId || !note) {
    return NextResponse.json({ error: 'eventId and note are required' }, { status: 400 });
  }

  const updated = overrideEvent(eventId, note);

  if (!updated) {
    return NextResponse.json({ error: `Event "${eventId}" not found` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, event: updated });
}

import { NextRequest, NextResponse } from 'next/server';
import { fetchMealLogs, appendMealLog, deleteMealLog } from '@/lib/sheets';
import { MealLogEntry } from '@/types/nutrition';
import { getCurrentSession } from '@/lib/authSession';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const data = await fetchMealLogs(session.username);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch meal logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: MealLogEntry = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    if (!body.dish || !body.portion || body.calories === undefined) {
      return NextResponse.json(
        { error: 'Dish name, portion, and calories are required' },
        { status: 400 }
      );
    }

    const entry: MealLogEntry = {
      ...body,
      timestamp: body.timestamp || new Date().toISOString(),
      user: session.name,
    };

    const result = await appendMealLog(entry, session.username);
    return NextResponse.json({ success: true, entry, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to append meal log' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!b.id || !b.dish) {
      return NextResponse.json({ error: 'id and dish are required' }, { status: 400 });
    }
    const result = await deleteMealLog(String(b.id), String(b.dish), String(b.timestamp || ''), session.name, session.username);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete meal log' },
      { status: 500 }
    );
  }
}

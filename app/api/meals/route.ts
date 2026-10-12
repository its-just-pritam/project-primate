import { NextRequest, NextResponse } from 'next/server';
import { fetchMealLogs, appendMealLog, deleteMealLog } from '@/lib/sheets';
import { MealLogEntry } from '@/types/nutrition';

export async function GET() {
  try {
    const data = await fetchMealLogs();
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

    if (!body.dish || !body.portion || body.calories === undefined) {
      return NextResponse.json(
        { error: 'Dish name, portion, and calories are required' },
        { status: 400 }
      );
    }

    const entry: MealLogEntry = {
      ...body,
      timestamp: body.timestamp || new Date().toISOString(),
      user: body.user || 'Pritam Mallick',
    };

    const result = await appendMealLog(entry);
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
    if (!b.id || !b.dish) {
      return NextResponse.json({ error: 'id and dish are required' }, { status: 400 });
    }
    const result = await deleteMealLog(String(b.id), String(b.dish), String(b.timestamp || ''));
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete meal log' },
      { status: 500 }
    );
  }
}
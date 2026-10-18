import { NextRequest, NextResponse } from 'next/server';
import { fetchWorkouts, appendWorkout, deleteWorkout } from '@/lib/sheets';
import { WorkoutEntry } from '@/types/nutrition';
import { getCurrentSession } from '@/lib/authSession';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    return NextResponse.json(await fetchWorkouts(session.name));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const name = String(body.name || '').trim();
    const caloriesBurnt = Number(body.caloriesBurnt);

    if (!name || !(caloriesBurnt > 0)) {
      return NextResponse.json(
        { error: 'Workout name and calories burnt (> 0) are required' },
        { status: 400 }
      );
    }

    const entry: WorkoutEntry = {
      name,
      caloriesBurnt,
      timestamp: body.timestamp || new Date().toISOString(),
      user: session.name,
    };
    const result = await appendWorkout(entry);
    return NextResponse.json({ success: true, entry, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to log workout' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!b.id || !b.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }
    const result = await deleteWorkout(String(b.id), String(b.name), String(b.timestamp || ''), session.name);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete workout' },
      { status: 500 }
    );
  }
}

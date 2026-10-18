import { NextRequest, NextResponse } from 'next/server';
import { appendPackaged, updatePackaged } from '@/lib/sheets';
import { MICRO_FIELDS, EMPTY_MICROS, Micronutrients } from '@/types/nutrition';
import { getCurrentSession } from '@/lib/authSession';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const dish = String(body.dish || '').trim();
    const quantity = Number(body.quantity) > 0 ? Number(body.quantity) : 1;

    if (!dish) {
      return NextResponse.json({ error: 'A name is required' }, { status: 400 });
    }

    const micros: Micronutrients = { ...EMPTY_MICROS };
    MICRO_FIELDS.forEach((f) => {
      micros[f.key] = num(body.micros?.[f.key]);
    });

    const result = await appendPackaged({
      dish,
      quantity,
      user: session.name,
      calories: num(body.calories),
      protein: num(body.protein),
      carbs: num(body.carbs),
      fats: num(body.fats),
      micros,
    });
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to add packaged food' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const dish = String(body.dish || '').trim();
    const quantity = Number(body.quantity) > 0 ? Number(body.quantity) : 1;

    if (!dish) {
      return NextResponse.json({ error: 'A name is required' }, { status: 400 });
    }

    const micros: Micronutrients = { ...EMPTY_MICROS };
    MICRO_FIELDS.forEach((f) => {
      micros[f.key] = num(body.micros?.[f.key]);
    });

    const result = await updatePackaged({
      dish,
      quantity,
      user: session.name,
      calories: num(body.calories),
      protein: num(body.protein),
      carbs: num(body.carbs),
      fats: num(body.fats),
      micros,
    });
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update packaged food' },
      { status: 500 }
    );
  }
}

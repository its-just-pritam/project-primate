import { NextRequest, NextResponse } from 'next/server';
import { fetchRecipes, appendRecipe, updateRecipe } from '@/lib/sheets';
import { Recipe } from '@/types/nutrition';
import { getCurrentSession } from '@/lib/authSession';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const data = await fetchRecipes(session.username);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const dish = String(body.dish || '').trim();
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((i: any) => ({
        ingredient: String(i?.ingredient || '').trim(),
        quantity: Number(i?.quantity),
      }))
      .filter((i: { ingredient: string; quantity: number }) => i.ingredient && i.quantity > 0);

    if (!dish || items.length === 0) {
      return NextResponse.json(
        { error: 'A dish name and at least one ingredient with a quantity are required' },
        { status: 400 }
      );
    }

    const result = await appendRecipe(dish, items, session.name, session.username);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to append recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    // `dish` is the new (desired) name; `originalDish` is the current name used to locate rows.
    const dish = String(body.dish || '').trim();
    const originalDish = String(body.originalDish || dish).trim();
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((i: any) => ({
        ingredient: String(i?.ingredient || '').trim(),
        quantity: Number(i?.quantity),
      }))
      .filter((i: { ingredient: string; quantity: number }) => i.ingredient && i.quantity > 0);

    if (!dish || items.length === 0) {
      return NextResponse.json(
        { error: 'A dish name and at least one ingredient with a quantity are required' },
        { status: 400 }
      );
    }

    const result = await updateRecipe(originalDish, items, dish !== originalDish ? dish : undefined, session.name, session.username);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { fetchRecipes, appendRecipe, updateRecipe } from '@/lib/sheets';
import { Recipe } from '@/types/nutrition';

export async function GET() {
  try {
    const data = await fetchRecipes();
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

    const result = await appendRecipe(dish, items);
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

    const result = await updateRecipe(dish, items);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update recipe' },
      { status: 500 }
    );
  }
}
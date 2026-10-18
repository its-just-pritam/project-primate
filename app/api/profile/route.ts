import { NextRequest, NextResponse } from 'next/server';
import { updateProfile, addPlan, deletePlan, updateAvatar } from '@/lib/sheets';
import { AVATARS } from '@/lib/avatars';
import { ProfileUpdate, PlanInput } from '@/types/nutrition';
import { getCurrentSession } from '@/lib/authSession';

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const profile: ProfileUpdate = {
      userName: session.name,
      weightKg: Number(b.weightKg),
      heightCm: Number(b.heightCm),
      workoutsPerWeek: Number(b.workoutsPerWeek),
      planName: String(b.planName || '').trim(),
      targetWeightKg: Number(b.targetWeightKg),
      restingCalories: Number(b.restingCalories),
      startDate: String(b.startDate || '').trim(),
      comment: String(b.comment || '').trim(),
      planRow: Number(b.planRow) || undefined,
    };

    const planValid =
      !profile.planRow ||
      (profile.planName &&
        profile.targetWeightKg > 0 &&
        profile.restingCalories > 0 &&
        !Number.isNaN(new Date(profile.startDate).getTime()));
    const valid =
      profile.userName &&
      profile.weightKg > 0 &&
      profile.heightCm >= 0 &&
      profile.workoutsPerWeek >= 0 &&
      planValid;

    if (!valid) {
      return NextResponse.json({ error: 'Invalid profile or plan values' }, { status: 400 });
    }

    const result = await updateProfile(profile);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Change the avatar only
export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const avatar = String(b.avatar || '');
    if (!AVATARS.includes(avatar)) {
      return NextResponse.json({ error: 'Unknown avatar' }, { status: 400 });
    }
    const result = await updateAvatar(avatar, session.name);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update avatar' },
      { status: 500 }
    );
  }
}

// Add a new plan
export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const plan: PlanInput = {
      planName: String(b.planName || '').trim(),
      userName: session.name,
      targetWeightKg: Number(b.targetWeightKg),
      restingCalories: Number(b.restingCalories),
      startDate: String(b.startDate || '').trim(),
      comment: String(b.comment || '').trim(),
    };
    if (
      !plan.planName ||
      !plan.userName ||
      !(plan.targetWeightKg > 0) ||
      !(plan.restingCalories > 0) ||
      Number.isNaN(new Date(plan.startDate).getTime())
    ) {
      return NextResponse.json({ error: 'Invalid plan values' }, { status: 400 });
    }
    const result = await addPlan(plan);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to add plan' }, { status: 500 });
  }
}

// Mark a plan as DELETED (by sheet row number) with an optional comment
export async function DELETE(req: NextRequest) {
  try {
    const b = await req.json();
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const rowNumber = Number(b.rowNumber);
    if (!Number.isInteger(rowNumber)) {
      return NextResponse.json({ error: 'rowNumber is required' }, { status: 400 });
    }
    const comment = typeof b.comment === 'string' ? b.comment.trim() : undefined;
    const result = await deletePlan(rowNumber, comment, session.name);
    return NextResponse.json({ success: true, isLive: result.isLive });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete plan' }, { status: 500 });
  }
}

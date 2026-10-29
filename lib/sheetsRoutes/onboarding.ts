import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { advanceUserOnboardingStep, getUserOnboardingStep, ONBOARDING_STEPS } from '@/lib/sheets';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const step = await getUserOnboardingStep(session.username);
    return NextResponse.json({ step });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read onboarding status' },
      { status: 500 }
    );
  }
}

/** Records onboarding progress as the number of completed steps; a missing step finishes onboarding. */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const step = body?.step ?? ONBOARDING_STEPS;
    if (!Number.isInteger(step) || step < 1 || step > ONBOARDING_STEPS) {
      return NextResponse.json({ error: `Onboarding step must be between 1 and ${ONBOARDING_STEPS}.` }, { status: 400 });
    }
    const stored = await advanceUserOnboardingStep(session.username, step);
    return NextResponse.json({ success: true, step: stored });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save onboarding progress' },
      { status: 500 }
    );
  }
}

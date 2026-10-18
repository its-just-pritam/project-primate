import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { completeUserOnboarding, getUserOnboardingStep } from '@/lib/sheets';

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

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    await completeUserOnboarding(session.username);
    return NextResponse.json({ success: true, step: 1 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

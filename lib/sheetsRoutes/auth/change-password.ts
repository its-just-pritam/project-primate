import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { changeSheetUserPassword } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (newPassword.length < 12 || newPassword.length > 256) {
      return NextResponse.json(
        { error: 'Enter a new password between 12 and 256 characters.' },
        { status: 400 }
      );
    }

    const changed = await changeSheetUserPassword(session.username, newPassword);
    if (!changed) return NextResponse.json({ error: 'Could not find a unique account for this session.' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change failed:', error);
    return NextResponse.json({ error: 'Could not change password. Please try again.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  let hasEmail = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  let hasKey = Boolean(process.env.GOOGLE_PRIVATE_KEY);
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID || '1JcGmHgvQA7jQEqryYJu1wINirAc-r9EA0fd5FUa4vIU';

  const credsPath = path.join(process.cwd(), 'credentials.json');
  if (fs.existsSync(credsPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (fileData.client_email && fileData.private_key) {
        hasEmail = true;
        hasKey = true;
        clientEmail = fileData.client_email;
      }
    } catch {}
  }

  return NextResponse.json({
    connected: hasEmail && hasKey,
    hasEmail,
    hasKey,
    sheetId,
    clientEmail: clientEmail ? `${clientEmail.slice(0, 12)}...` : null,
  });
}

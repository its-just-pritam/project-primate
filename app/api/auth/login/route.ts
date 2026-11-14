import { NextRequest } from 'next/server';
import * as backend from '@/lib/backendRoutes';

export const dynamic = 'force-dynamic';

export const POST = (request: NextRequest) => backend.login(request);

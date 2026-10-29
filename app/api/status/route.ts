import { selectHandler } from '@/lib/backend';
import * as backend from '@/lib/backendRoutes';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/status');

export const GET = selectHandler('GET', backend.status, sheets);

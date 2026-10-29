import { selectHandler } from '@/lib/backend';
import * as backend from '@/lib/backendRoutes';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/auth/signup');

export const POST = selectHandler('POST', backend.signup, sheets);

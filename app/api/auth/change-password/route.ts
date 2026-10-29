import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/auth/change-password');

export const POST = selectHandler('POST', proxyRoute('/api/auth/change-password'), sheets);

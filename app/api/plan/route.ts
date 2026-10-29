import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/plan');

export const GET = selectHandler('GET', proxyRoute('/api/plan'), sheets);

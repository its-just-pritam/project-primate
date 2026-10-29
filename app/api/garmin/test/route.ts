import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/garmin/test');

export const POST = selectHandler('POST', proxyRoute('/api/garmin/test'), sheets);

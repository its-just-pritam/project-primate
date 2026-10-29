import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/garmin/integration');

export const GET = selectHandler('GET', proxyRoute('/api/garmin/integration'), sheets);
export const POST = selectHandler('POST', proxyRoute('/api/garmin/integration'), sheets);
export const DELETE = selectHandler('DELETE', proxyRoute('/api/garmin/integration'), sheets);

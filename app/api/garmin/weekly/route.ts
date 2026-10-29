import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/garmin/weekly');

export const POST = selectHandler('POST', proxyRoute('/api/garmin/weekly'), sheets);

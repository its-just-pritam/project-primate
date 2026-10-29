import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/packaged');

export const POST = selectHandler('POST', proxyRoute('/api/packaged'), sheets);
export const PUT = selectHandler('PUT', proxyRoute('/api/packaged'), sheets);

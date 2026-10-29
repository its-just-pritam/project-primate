import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/recipes');

export const GET = selectHandler('GET', proxyRoute('/api/recipes'), sheets);
export const POST = selectHandler('POST', proxyRoute('/api/recipes'), sheets);
export const PUT = selectHandler('PUT', proxyRoute('/api/recipes'), sheets);

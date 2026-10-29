import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/profile');

export const POST = selectHandler('POST', proxyRoute('/api/profile'), sheets);
export const PUT = selectHandler('PUT', proxyRoute('/api/profile'), sheets);
export const DELETE = selectHandler('DELETE', proxyRoute('/api/profile'), sheets);

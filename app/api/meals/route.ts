import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/meals');

export const GET = selectHandler('GET', proxyRoute('/api/meals'), sheets);
export const POST = selectHandler('POST', proxyRoute('/api/meals'), sheets);
export const DELETE = selectHandler('DELETE', proxyRoute('/api/meals'), sheets);

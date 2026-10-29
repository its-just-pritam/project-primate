import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/workouts');

export const GET = selectHandler('GET', proxyRoute('/api/workouts'), sheets);
export const POST = selectHandler('POST', proxyRoute('/api/workouts'), sheets);
export const DELETE = selectHandler('DELETE', proxyRoute('/api/workouts'), sheets);

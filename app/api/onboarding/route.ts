import { proxyRoute, selectHandler } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const sheets = () => import('@/lib/sheetsRoutes/onboarding');

export const GET = selectHandler('GET', proxyRoute('/api/onboarding'), sheets);
export const POST = selectHandler('POST', proxyRoute('/api/onboarding'), sheets);

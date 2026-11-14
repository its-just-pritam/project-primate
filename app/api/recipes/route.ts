import { proxyRoute } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const GET = proxyRoute('/api/recipes');
export const POST = proxyRoute('/api/recipes');
export const PUT = proxyRoute('/api/recipes');

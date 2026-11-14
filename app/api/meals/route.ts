import { proxyRoute } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const GET = proxyRoute('/api/meals');
export const POST = proxyRoute('/api/meals');
export const DELETE = proxyRoute('/api/meals');

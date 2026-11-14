import { proxyRoute } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const POST = proxyRoute('/api/profile');
export const PUT = proxyRoute('/api/profile');
export const DELETE = proxyRoute('/api/profile');

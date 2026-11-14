import { proxyRoute } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const GET = proxyRoute('/api/garmin/integration');
export const POST = proxyRoute('/api/garmin/integration');
export const DELETE = proxyRoute('/api/garmin/integration');

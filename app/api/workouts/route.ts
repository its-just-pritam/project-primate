import { proxyRoute } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const GET = proxyRoute('/api/workouts');
export const POST = proxyRoute('/api/workouts');
export const DELETE = proxyRoute('/api/workouts');

import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { SharedPackagedDraft, parseSharedPackagedFood } from '@/lib/sharedNutritionParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

function isPublicIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 192 && b === 2) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    const firstHextet = parseInt(normalized.split(':')[0] || '0', 16);
    return firstHextet >= 0x2000 && firstHextet <= 0x3fff && !normalized.startsWith('2001:db8:') && !normalized.startsWith('2001:10:') && !normalized.startsWith('::ffff:');
  }
  return false;
}

async function requestPublicPage(url: URL): Promise<{ status: number; location?: string; contentType: string; body: string }> {
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || url.port && url.port !== '443') {
    throw new Error('Only public HTTPS links can be imported.');
  }
  const records = isIP(url.hostname) ? [{ address: url.hostname, family: isIP(url.hostname) }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicIp(record.address))) throw new Error('This link does not point to a public host.');
  // Prefer IPv4 because many serverless runtimes do not have outbound IPv6 routing.
  const pinned = records.find((record) => record.family === 4) || records[0];
  return new Promise((resolve, reject) => {
    const req = httpsRequest({
      protocol: 'https:', hostname: url.hostname, port: 443,
      path: `${url.pathname}${url.search}`, method: 'GET',
      headers: { Accept: 'text/html,application/xhtml+xml,application/ld+json;q=0.9', 'User-Agent': 'PlatitoNutritionPreview/1.0' },
      servername: isIP(url.hostname) ? undefined : url.hostname,
      lookup: ((_hostname: string, options: { all?: boolean }, callback: (error: Error | null, address: string | { address: string; family: number }[], family?: number) => void) => {
        if (options?.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
        else callback(null, pinned.address, pinned.family);
      }) as never,
      timeout: TIMEOUT_MS,
    }, (res) => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      const contentType = String(res.headers['content-type'] || '').toLowerCase();
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        res.resume();
        resolve({ status, location, contentType, body: '' });
        return;
      }
      if (status < 200 || status >= 300) { res.resume(); reject(new Error(`The public page returned HTTP ${status}.`)); return; }
      if (!/^(text\/html|application\/xhtml\+xml|application\/ld\+json)(;|$)/.test(contentType)) {
        res.resume(); reject(new Error('The link did not return a readable web page.')); return;
      }
      const declaredSize = Number(res.headers['content-length'] || 0);
      if (declaredSize > MAX_BYTES) { res.destroy(); reject(new Error('The linked page is too large to preview.')); return; }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) { res.destroy(new Error('The linked page is too large to preview.')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('The linked page took too long to respond.')));
    req.on('error', reject);
    req.end();
  });
}

function decodeEntities(value: string) {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function pageNutrition(html: string): SharedPackagedDraft {
  const summaries: string[] = [];
  const add = (label: string, value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') summaries.push(`${label}: ${value}`);
  };
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const type = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (type.some((item) => item === 'Product' || item === 'ProductGroup')) {
      add('name', node.name);
      const nutrition = node.nutrition || node.offers?.nutrition;
      if (nutrition && typeof nutrition === 'object') {
        add('calories', nutrition.calories || nutrition.energy); add('protein', nutrition.proteinContent);
        add('carbs', nutrition.carbohydrateContent); add('fat', nutrition.fatContent);
        add('sodium', nutrition.sodiumContent); add('calcium', nutrition.calciumContent);
        add('iron', nutrition.ironContent); add('potassium', nutrition.potassiumContent);
        add('vitamin C', nutrition.vitaminCContent); add('vitamin B12', nutrition.vitaminB12Content);
        add('vitamin D', nutrition.vitaminDContent);
      }
    }
    Object.values(node).forEach(visit);
  };
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    try { visit(JSON.parse(scriptMatch[1].replace(/^\s*<!--|-->\s*$/g, ''))); } catch { /* Ignore malformed page metadata. */ }
  }
  const plainText = decodeEntities(html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ').replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  summaries.push(plainText.slice(0, 50_000));
  return parseSharedPackagedFood({ id: 'public-link', title: '', text: summaries.join('\n'), url: '', files: [], receivedAt: 0 });
}

function mergeMissing(text: SharedPackagedDraft, page: SharedPackagedDraft): SharedPackagedDraft {
  const merged: SharedPackagedDraft = { ...page, ...text, micros: { ...page.micros, ...text.micros } };
  if (!text.dish && page.dish) merged.dish = page.dish;
  return merged;
}

export async function POST(request: NextRequest) {
  let input: { url?: unknown; title?: unknown; text?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof input.url !== 'string' || input.url.length > 2048 || typeof input.text !== 'string' || input.text.length > 12_000) {
    return NextResponse.json({ error: 'A public URL and shared text are required.' }, { status: 400 });
  }
  try {
    let url = new URL(input.url);
    for (let redirects = 0; ; redirects++) {
      const response = await requestPublicPage(url);
      if (response.location) {
        if (redirects >= MAX_REDIRECTS) throw new Error('The link redirected too many times.');
        url = new URL(response.location, url);
        continue;
      }
      const textDraft = parseSharedPackagedFood({ id: 'share', title: typeof input.title === 'string' ? input.title : '', text: input.text, url: '', files: [], receivedAt: 0 });
      const pageDraft = pageNutrition(response.body);
      return NextResponse.json({ values: mergeMissing(textDraft, pageDraft) }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read the public link.' }, { status: 422 });
  }
}

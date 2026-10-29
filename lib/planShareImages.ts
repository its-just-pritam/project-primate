import { PlanAnalytics } from '@/types/nutrition';

export const INVITATION_URL = 'https://project-primate.vercel.app/';

export type ShareDesignId = 'story' | 'journey' | 'poster';

export const SHARE_DESIGNS: { id: ShareDesignId; title: string; format: string; width: number; height: number }[] = [
  { id: 'story', title: 'Story ring', format: 'Story · 9:16', width: 1080, height: 1920 },
  { id: 'journey', title: 'Journey track', format: 'Post · 4:5', width: 1080, height: 1350 },
  { id: 'poster', title: 'Poster', format: 'Square · 1:1', width: 1080, height: 1080 },
];

/** Logo and font embedded as data URLs: an SVG drawn as an image cannot load anything external. */
export interface ShareAssets {
  logo: string;
  fontFace: string;
}

const FONT_STACK = "'PlatitoShare', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const URL_LABEL = INVITATION_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

const escapeSvgText = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] || character);

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Finds the app's self-hosted Manrope file (from next/font) and inlines it; falls back to system fonts. */
async function loadManropeFontFace(): Promise<string> {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue('font-family');
      if (!/manrope/i.test(family) || /fallback/i.test(family)) continue;
      const src = rule.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!src) continue;
      try {
        const font = await toDataUrl(await (await fetch(src)).blob());
        return `@font-face{font-family:'PlatitoShare';src:url(${font}) format('woff2');font-weight:200 800;}`;
      } catch {
        return '';
      }
    }
  }
  return '';
}

let assetsPromise: Promise<ShareAssets> | null = null;

export function loadShareAssets(): Promise<ShareAssets> {
  assetsPromise ??= Promise.all([
    fetch('/icon.png').then((response) => response.blob()).then(toDataUrl).catch(() => ''),
    loadManropeFontFace(),
  ]).then(([logo, fontFace]) => ({ logo, fontFace }));
  return assetsPromise;
}

interface ShareValues {
  title: string;
  planName: string;
  day: number;
  days: string;
  start: number;
  now: number;
  target: number;
  progress: number;
  change: string;
  changeIsLoss: boolean;
  fat: string;
  muscle: string;
  avgDeficit: string;
  daysLeft: string;
  finish: string;
}

const formatKg = (value: number) => {
  const rounded = Math.abs(value) >= 1 ? value.toFixed(1) : value.toFixed(2);
  const sign = Number(rounded) > 0 ? '+' : Number(rounded) < 0 ? '−' : '';
  return `${sign}${rounded.replace('-', '')} kg`;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function shareValues(plan: PlanAnalytics): ShareValues {
  const weightChange = plan.totalWeightChangeGrams / 1000;
  const name = plan.userName || 'My';
  const planName = plan.planName || 'Active plan';
  return {
    title: escapeSvgText(truncate(`${name}'s ${planName}`, 26)),
    planName: escapeSvgText(truncate(planName, 22)),
    day: plan.daysElapsed,
    days: `${plan.daysElapsed} ${plan.daysElapsed === 1 ? 'day' : 'days'}`,
    start: plan.currentWeight,
    now: round1(plan.currentWeight + weightChange),
    target: plan.targetWeight,
    progress: round1(plan.progressPercent),
    change: formatKg(weightChange),
    changeIsLoss: weightChange < 0,
    fat: formatKg(plan.totalFatMassChangeGrams / 1000),
    muscle: formatKg(plan.totalMuscleMassChangeGrams / 1000),
    avgDeficit: plan.averageCalorieDeficit.toLocaleString(),
    daysLeft: plan.daysRemaining > 0 ? `~${plan.daysRemaining} days` : '—',
    finish: escapeSvgText(truncate(plan.projectedDate || 'Keep going', 26)),
  };
}

const defs = (assets: ShareAssets) => `
  <defs>
    <style>${assets.fontFace}text{font-family:${FONT_STACK};}</style>
    <linearGradient id="avo" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8d866"/><stop offset=".45" stop-color="#93c35a"/><stop offset="1" stop-color="#466d2c"/></linearGradient>
    <linearGradient id="avoH" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#466d2c"/><stop offset=".6" stop-color="#93c35a"/><stop offset="1" stop-color="#d8d866"/></linearGradient>
    <radialGradient id="glowTop" cx=".5" cy="0" r=".9"><stop stop-color="#74aa45" stop-opacity=".28"/><stop offset="1" stop-color="#74aa45" stop-opacity="0"/></radialGradient>
  </defs>`;

const brand = (assets: ShareAssets, x: number, y: number, size: number, light = true) => `
  ${assets.logo ? `<image href="${assets.logo}" x="${x}" y="${y}" width="${size}" height="${size}"/>` : ''}
  <text x="${x + (assets.logo ? size + 18 : 0)}" y="${y + size * 0.68}" fill="${light ? '#ffffff' : '#18270f'}" font-size="${size * 0.56}" font-weight="800" letter-spacing="-1">Platito</text>`;

const tile = (x: number, y: number, w: number, label: string, value: string, color: string) => `
  <rect x="${x}" y="${y}" width="${w}" height="170" rx="32" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".1" stroke-width="2"/>
  <text x="${x + 36}" y="${y + 62}" fill="#94a3b8" font-size="24" font-weight="700" letter-spacing="2">${label}</text>
  <text x="${x + 36}" y="${y + 128}" fill="${color}" font-size="${value.length > 11 ? 42 : 52}" font-weight="800">${value}</text>`;

function storyRing(v: ShareValues, assets: ShareAssets) {
  const r = 270;
  const circumference = 2 * Math.PI * r;
  const filled = (circumference * Math.min(100, Math.max(0, v.progress))) / 100;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  ${defs(assets)}
  <rect width="1080" height="1920" fill="#0b1220"/>
  <rect width="1080" height="1100" fill="url(#glowTop)"/>
  ${brand(assets, 80, 90, 64)}
  <text x="80" y="290" fill="#ffffff" font-size="64" font-weight="800" letter-spacing="-1.5">${v.title}</text>
  <text x="80" y="350" fill="#94a3b8" font-size="32" font-weight="600">Day ${v.day} of the plan</text>
  <circle cx="540" cy="760" r="${r}" fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="44"/>
  ${filled > 0 ? `<circle cx="540" cy="760" r="${r}" fill="none" stroke="url(#avo)" stroke-width="44" stroke-linecap="round" stroke-dasharray="${filled} ${circumference}" transform="rotate(-90 540 760)"/>` : ''}
  <text x="540" y="790" text-anchor="middle" fill="#ffffff" font-size="150" font-weight="800" letter-spacing="-4">${v.progress}%</text>
  <text x="540" y="860" text-anchor="middle" fill="#b0d67a" font-size="34" font-weight="700" letter-spacing="3">TO GOAL</text>
  <text x="540" y="1170" text-anchor="middle" fill="#ffffff" font-size="68" font-weight="800">${v.start} kg <tspan fill="#93c35a">→</tspan> ${v.target} kg</text>
  <rect x="370" y="1205" width="340" height="64" rx="32" fill="#93c35a" fill-opacity=".16"/>
  <text x="540" y="1248" text-anchor="middle" fill="#cde6a3" font-size="30" font-weight="800">${v.change} so far</text>
  ${tile(80, 1330, 290, 'FAT', v.fat, '#fb7185')}
  ${tile(395, 1330, 290, 'MUSCLE', v.muscle, '#38bdf8')}
  ${tile(710, 1330, 290, 'AVG DEFICIT', v.avgDeficit, '#fbbf24')}
  <text x="80" y="1600" fill="#94a3b8" font-size="28" font-weight="600">Projected finish <tspan fill="#ffffff" font-weight="800">${v.finish}</tspan></text>
  <rect x="80" y="1680" width="920" height="150" rx="40" fill="url(#avoH)"/>
  <text x="130" y="1750" fill="#18270f" font-size="40" font-weight="800">Join me on Platito</text>
  <text x="130" y="1795" fill="#304823" font-size="26" font-weight="600">${URL_LABEL}</text>
  <circle cx="930" cy="1755" r="40" fill="#18270f" fill-opacity=".85"/>
  <path d="M914 1755h32m-12-12 12 12-12 12" fill="none" stroke="#cde6a3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function journeyTrack(v: ShareValues, assets: ShareAssets) {
  const trackX = 120;
  const trackW = 840;
  const span = v.start - v.target;
  const share = span === 0 ? 0 : (v.start - v.now) / span;
  const nowX = trackX + trackW * Math.min(1, Math.max(0, share));
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${defs(assets)}
  <rect width="1080" height="1350" fill="#0b1220"/>
  <rect width="1080" height="800" fill="url(#glowTop)"/>
  ${brand(assets, 80, 80, 56)}
  <text x="1000" y="125" text-anchor="end" fill="#94a3b8" font-size="28" font-weight="700">${v.planName.toUpperCase()}</text>
  <text x="80" y="330" fill="${v.changeIsLoss ? '#93c35a' : '#ffffff'}" font-size="180" font-weight="800" letter-spacing="-6">${v.change}</text>
  <text x="84" y="400" fill="#ffffff" font-size="44" font-weight="700">in ${v.days}, ${v.progress}% of the way there</text>
  <line x1="${trackX}" y1="560" x2="${trackX + trackW}" y2="560" stroke="#ffffff" stroke-opacity=".1" stroke-width="18" stroke-linecap="round"/>
  ${nowX > trackX ? `<line x1="${trackX}" y1="560" x2="${nowX}" y2="560" stroke="url(#avoH)" stroke-width="18" stroke-linecap="round"/>` : ''}
  <circle cx="${trackX}" cy="560" r="14" fill="#466d2c"/>
  <circle cx="${nowX}" cy="560" r="34" fill="#d8d866" stroke="#0b1220" stroke-width="8"/>
  ${assets.logo ? `<image href="${assets.logo}" x="${nowX - 24}" y="536" width="48" height="48"/>` : ''}
  <path d="M${trackX + trackW} 520v40" stroke="#ffffff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
  <path d="M${trackX + trackW} 520h-34l10 11-10 11h34z" fill="#ffffff" fill-opacity=".5"/>
  <text x="${trackX}" y="630" fill="#94a3b8" font-size="28" font-weight="700">${v.start} kg</text>
  <text x="${Math.min(Math.max(nowX, trackX + 90), trackX + trackW - 90)}" y="630" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="800">${v.now} kg</text>
  <text x="${trackX + trackW}" y="630" text-anchor="end" fill="#94a3b8" font-size="28" font-weight="700">${v.target} kg</text>
  ${tile(80, 720, 450, 'FAT', v.fat, '#fb7185')}
  ${tile(550, 720, 450, 'MUSCLE', v.muscle, '#38bdf8')}
  ${tile(80, 910, 450, 'AVG DEFICIT', `${v.avgDeficit} kcal/d`, '#fbbf24')}
  ${tile(550, 910, 450, 'TIME LEFT', v.daysLeft, '#ffffff')}
  <line x1="80" y1="1170" x2="1000" y2="1170" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
  <text x="80" y="1250" fill="#ffffff" font-size="40" font-weight="800">Join me on Platito</text>
  <text x="1000" y="1250" text-anchor="end" fill="#b0d67a" font-size="28" font-weight="700">${URL_LABEL}</text>
</svg>`;
}

function poster(v: ShareValues, assets: ShareAssets) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  ${defs(assets)}
  <rect width="1080" height="1080" fill="url(#avo)"/>
  ${assets.logo ? `<image href="${assets.logo}" x="560" y="300" width="620" height="620" opacity=".14"/>` : ''}
  ${brand(assets, 80, 80, 60, false)}
  <text x="80" y="390" fill="#18270f" font-size="128" font-weight="800" letter-spacing="-5">${v.days}.</text>
  <text x="80" y="530" fill="#18270f" font-size="128" font-weight="800" letter-spacing="-5">${v.change}.</text>
  <text x="80" y="670" fill="#ffffff" font-size="128" font-weight="800" letter-spacing="-5">${v.progress}% there.</text>
  <text x="84" y="760" fill="#304823" font-size="36" font-weight="700">${v.title} · ${v.start} → ${v.target} kg</text>
  <rect x="80" y="880" width="920" height="120" rx="60" fill="#18270f"/>
  <text x="140" y="955" fill="#ffffff" font-size="36" font-weight="800">Join me on Platito</text>
  <text x="940" y="955" text-anchor="end" fill="#b0d67a" font-size="26" font-weight="700">${URL_LABEL}</text>
</svg>`;
}

export function buildShareSvg(design: ShareDesignId, plan: PlanAnalytics, assets: ShareAssets): string {
  const values = shareValues(plan);
  if (design === 'story') return storyRing(values, assets);
  if (design === 'journey') return journeyTrack(values, assets);
  return poster(values, assets);
}

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export async function renderShareImage(design: ShareDesignId, plan: PlanAnalytics, assets: ShareAssets): Promise<File> {
  const { width, height } = SHARE_DESIGNS.find((option) => option.id === design)!;
  const image = new Image();
  image.src = svgToDataUrl(buildShareSvg(design, plan, assets));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is not supported in this browser.');
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not create the plan image.'))), 'image/png');
  });
  return new File([blob], `platito-plan-${design}.png`, { type: 'image/png' });
}

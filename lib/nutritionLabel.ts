export interface ParsedLabel {
  macros: Partial<Record<'calories' | 'protein' | 'carbs' | 'fats', number>>;
  micros: Partial<Record<'calcium' | 'iron' | 'potassium' | 'sodium' | 'vitaminC' | 'vitaminB12' | 'vitaminD', number>>;
}

const UNITS = 'kcal|kj|cal|mg|mcg|µg|μg|ug|iu|gms|gm|g';
const NUM = String.raw`(\d+(?:[.,]\d+)?)(?:\s*(${UNITS})(?![a-z]))?`;
const LABELS = String.raw`energy|calories|protein|carbohydrates?|carbs|fat\b|calcium|\biron\b|potassium|sodium|vitamin\s*[a-z]\d*|b[\s-]?12|cobalamin|ascorbic`;

const toNumber = (s: string) => parseFloat(s.replace(',', '.'));

// OCR often reads "O" for 0 and "l"/"I" for 1 inside numbers.
const cleanLine = (line: string) =>
  line.replace(/(?<=\d)[Oo](?=\d|\b)/g, '0').replace(/(?<=\d)[lI](?=\d)/g, '1');

const normalizeUnit = (u?: string) => {
  const unit = (u || '').toLowerCase();
  return unit === 'gm' || unit === 'gms' ? 'g' : unit;
};

// Finds the number belonging to the label at [start, end). Labels written as
// "Protein 13 g" take the number after; "13 g protein" lines take the number before.
function valueForLabel(
  line: string,
  start: number,
  end: number
): { value: number; unit: string } | null {
  const labelRe = new RegExp(LABELS, 'ig');
  const labels = Array.from(line.matchAll(labelRe)).map((l) => ({ start: l.index!, end: l.index! + l[0].length }));
  const valueFirst = labels.length > 0 && /\d/.test(line.slice(0, labels[0].start));

  if (valueFirst) {
    const prevEnd = labels.filter((l) => l.end <= start).reduce((mx, l) => Math.max(mx, l.end), 0);
    const nums = Array.from(line.slice(prevEnd, start).matchAll(new RegExp(NUM, 'ig')));
    const last = nums[nums.length - 1];
    return last ? { value: toNumber(last[1]), unit: normalizeUnit(last[2]) } : null;
  }

  const m = new RegExp(NUM, 'i').exec(line.slice(end));
  return m ? { value: toNumber(m[1]), unit: normalizeUnit(m[2]) } : null;
}

// Converts to the unit the app stores (mg, mcg or IU), based on the printed unit.
function toMg(v: { value: number; unit: string }) {
  if (v.unit === 'g') return v.value * 1000;
  if (v.unit === 'mcg' || v.unit === 'µg' || v.unit === 'μg' || v.unit === 'ug') return v.value / 1000;
  return v.value;
}
function toMcg(v: { value: number; unit: string }) {
  if (v.unit === 'mg') return v.value * 1000;
  if (v.unit === 'g') return v.value * 1_000_000;
  return v.value;
}
function toIu(v: { value: number; unit: string }) {
  if (v.unit === 'iu') return v.value;
  // Vitamin D: 1 mcg = 40 IU
  if (v.unit === 'mg') return v.value * 1000 * 40;
  return v.value * 40;
}
const toGrams = (v: { value: number; unit: string }) =>
  v.unit === 'mg' ? v.value / 1000 : v.value;

const round2 = (n: number) => Math.round(n * 100) / 100;

const NON_NAME =
  /nutrition|energy|calori|protein|carbo|\bfat\b|sugar|fibre|fiber|sodium|salt|calcium|iron|potassium|vitamin|serving|per\s*100|ingredients|allergen|net\s*(wt|weight)|\bmrp\b|batch|best before|expiry|manufactur|fssai|www\.|\.com|%/i;

export interface OcrLine {
  text: string;
  height: number;
}

// Guesses the product name as the largest-printed line that isn't nutrition-table text.
export function guessProductName(lines: OcrLine[]): string {
  const cleaned = lines
    .map((l) => ({ text: l.text.replace(/[^A-Za-z0-9&'’\-\s]/g, ' ').replace(/\s+/g, ' ').trim(), height: l.height }))
    .filter((l) => {
      const letters = (l.text.match(/[A-Za-z]/g) || []).length;
      return letters >= 3 && letters / l.text.replace(/\s/g, '').length > 0.7 && !NON_NAME.test(l.text);
    });
  if (cleaned.length === 0) return '';

  const idx = cleaned.reduce((best, l, i) => (l.height > cleaned[best].height ? i : best), 0);
  const parts = [cleaned[idx].text];
  // Names often wrap onto a second line of similar size.
  const next = cleaned[idx + 1];
  if (next && next.height >= cleaned[idx].height * 0.8) parts.push(next.text);

  return parts
    .join(' ')
    .split(' ')
    .map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

// Reads the first (usually "per serving" or first-column) values from nutrition label text.
export function parseNutritionLabel(text: string): ParsedLabel {
  const out: ParsedLabel = { macros: {}, micros: {} };
  const lines = text.split(/\r?\n/).map(cleanLine);

  const find = (
    include: RegExp,
    exclude?: RegExp
  ): { value: number; unit: string; line: string } | null => {
    for (const line of lines) {
      const m = include.exec(line);
      if (!m) continue;
      if (exclude && exclude.test(line.slice(Math.max(0, m.index - 12), m.index + m[0].length))) continue;
      const v = valueForLabel(line, m.index, m.index + m[0].length);
      if (v && Number.isFinite(v.value)) return { ...v, line };
    }
    return null;
  };

  // Unit-tagged calories anywhere ("282 kCal") win over label-based lookups.
  const kcal = /(\d+(?:[.,]\d+)?)\s*k?cal(?![a-z])/i.exec(text);
  if (kcal) {
    out.macros.calories = toNumber(kcal[1]);
  } else {
    const energy = find(/energy|calories/i);
    if (energy) {
      out.macros.calories = energy.unit === 'kj' ? round2(energy.value / 4.184) : energy.value;
    }
  }

  const protein = find(/protein/i);
  if (protein) out.macros.protein = round2(toGrams(protein));
  const carbs = find(/carbohydrate|carbs/i);
  if (carbs) out.macros.carbs = round2(toGrams(carbs));
  const fat = find(/(total\s+)?fat\b/i, /saturated|trans|mono|poly|\bsat\b/i);
  if (fat) out.macros.fats = round2(toGrams(fat));

  const calcium = find(/calcium/i);
  if (calcium) out.micros.calcium = round2(toMg(calcium));
  const iron = find(/\biron\b/i);
  if (iron) out.micros.iron = round2(toMg(iron));
  const potassium = find(/potassium/i);
  if (potassium) out.micros.potassium = round2(toMg(potassium));
  const sodium = find(/sodium/i);
  if (sodium) out.micros.sodium = round2(toMg(sodium));
  const vitC = find(/vitamin\s*c\b|ascorbic/i);
  if (vitC) out.micros.vitaminC = round2(toMg(vitC));
  const vitB12 = find(/(vitamin\s*)?b[\s-]?12|cobalamin/i);
  if (vitB12) out.micros.vitaminB12 = round2(toMcg(vitB12));
  const vitD = find(/vitamin\s*d\d?\b/i);
  if (vitD) out.micros.vitaminD = round2(toIu(vitD));

  return out;
}

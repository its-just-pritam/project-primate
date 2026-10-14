export interface ParsedLabel {
  macros: Partial<Record<'calories' | 'protein' | 'carbs' | 'fats', number>>;
  micros: Partial<Record<'calcium' | 'iron' | 'potassium' | 'sodium' | 'vitaminC' | 'vitaminB12' | 'vitaminD', number>>;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)\s*(kcal|kj|cal|mg|mcg|µg|μg|ug|iu|g)?`;

const toNumber = (s: string) => parseFloat(s.replace(',', '.'));

// OCR often reads "O" for 0 and "l"/"I" for 1 inside numbers.
const cleanLine = (line: string) =>
  line.replace(/(?<=\d)[Oo](?=\d|\b)/g, '0').replace(/(?<=\d)[lI](?=\d)/g, '1');

// First "<number> <unit>" found after the label on that line.
function valueAfter(line: string, labelEnd: number): { value: number; unit: string } | null {
  const m = new RegExp(NUM, 'i').exec(line.slice(labelEnd));
  if (!m) return null;
  return { value: toNumber(m[1]), unit: (m[2] || '').toLowerCase() };
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
      if (!m || (exclude && exclude.test(line))) continue;
      const v = valueAfter(line, m.index + m[0].length);
      if (v && Number.isFinite(v.value)) return { ...v, line };
    }
    return null;
  };

  const energy = find(/energy|calories/i);
  if (energy) {
    const kcal = /(\d+(?:[.,]\d+)?)\s*kcal/i.exec(energy.line);
    if (kcal) out.macros.calories = toNumber(kcal[1]);
    else if (energy.unit === 'kj') out.macros.calories = round2(energy.value / 4.184);
    else out.macros.calories = energy.value;
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

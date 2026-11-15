import type { PackagedInput } from '@/components/PackagedForm';
import type { IncomingShare } from '@/lib/sharedContent';
import type { Micronutrients } from '@/types/nutrition';

export type SharedPackagedDraft = Omit<Partial<PackagedInput>, 'micros'> & { micros?: Partial<Micronutrients> };

function findNumber(text: string, aliases: string[]) {
  for (const alias of aliases) {
    const expression = new RegExp(`(?:^|\\b)(?:${alias})\\s*(?:\\(([^)]*)\\))?\\s*[:=–|\\-]?\\s*([0-9]+(?:[.,][0-9]+)?)\\s*(kcal|kj|g|mg|mcg|μg|µg|iu)?`, 'i');
    const match = text.match(expression);
    if (!match) continue;
    const value = Number(match[2].replace(',', '.'));
    if (!Number.isFinite(value)) continue;
    const parentheticalUnit = match[1]?.match(/\b(kcal|kj|g|mg|mcg|μg|µg|iu)\b/i)?.[1];
    return { value, unit: (match[3] || parentheticalUnit || '').toLocaleLowerCase() };
  }
  return null;
}

function valueOf(text: string, aliases: string[], expectedUnit: string) {
  const found = findNumber(text, aliases);
  if (!found) return undefined;
  if (expectedUnit === 'kcal' && found.unit === 'kj') return Math.round(found.value * 0.239006 * 10) / 10;
  if (expectedUnit === 'iu' && ['mcg', 'μg', 'µg'].includes(found.unit)) return Math.round(found.value * 40);
  if (found.unit && expectedUnit && found.unit !== expectedUnit && !(expectedUnit === 'mcg' && ['μg', 'µg'].includes(found.unit))) {
    return undefined;
  }
  return found.value;
}

function sharedDishName(title: string, text: string) {
  const explicitName = text.match(/(?:^|[\n\r|])\s*(?:dish(?:\s+name)?|product(?:\s+name)?|food(?:\s+name)?|packaged\s+food(?:\s+name)?|name)\s*[:=–|\-]\s*([^\n\r|]+)/i)?.[1]?.trim();
  return explicitName || title.trim() || undefined;
}

/** Prefill packaged-food fields from clearly labeled text shared into the app. */
export function parseSharedPackagedFood(share: IncomingShare): SharedPackagedDraft {
  const text = [share.title, share.text, share.url].filter(Boolean).join('\n').replace(/[*_`]/g, '');
  const calories = valueOf(text, ['calories?', 'energy'], 'kcal');
  const protein = valueOf(text, ['protein'], 'g');
  const carbs = valueOf(text, ['total\\s+carbohydrates', 'carbohydrates', 'total\\s+carbs', 'carbs'], 'g');
  const fats = valueOf(text, ['total\\s+fat', 'total\\s+fats', 'fat', 'fats'], 'g');
  const micros: Partial<Micronutrients> = {};
  const fields = [
    ['calcium', ['calcium'], 'mg'],
    ['iron', ['iron'], 'mg'],
    ['potassium', ['potassium'], 'mg'],
    ['sodium', ['sodium'], 'mg'],
    ['vitaminC', ['vitamin\\s*c', 'vit\\s*c'], 'mg'],
    ['vitaminB12', ['vitamin\\s*b12', 'vit\\s*b12', 'b12'], 'mcg'],
    ['vitaminD', ['vitamin\\s*d', 'vit\\s*d'], 'iu'],
  ] as const;
  for (const [key, aliases, unit] of fields) {
    const value = valueOf(text, [...aliases], unit);
    if (value !== undefined) micros[key] = value;
  }

  return {
    dish: sharedDishName(share.title, share.text),
    quantity: 1,
    ...(calories !== undefined ? { calories } : {}),
    ...(protein !== undefined ? { protein } : {}),
    ...(carbs !== undefined ? { carbs } : {}),
    ...(fats !== undefined ? { fats } : {}),
    ...(Object.keys(micros).length ? { micros } : {}),
  };
}

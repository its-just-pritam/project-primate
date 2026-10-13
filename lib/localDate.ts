const pad = (n: number) => String(n).padStart(2, '0');

// YYYY-MM-DD in the browser's local timezone (not UTC).
export const toLocalDateKey = (input: Date | string): string => {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Parses a YYYY-MM-DD key as local midnight.
export const parseLocalDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

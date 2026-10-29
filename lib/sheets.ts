import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { promisify } from 'util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import {
  MealLogEntry,
  Recipe,
  PlanAnalytics,
  Micronutrients,
  DishIngredient,
  EMPTY_MICROS,
  WorkoutEntry,
  ProfileUpdate,
  PlanInput,
  PlanSummary,
} from '@/types/nutrition';
import {
  calculateDailyFatMassChangeGrams,
  calculateDailyWetMuscleMassChangeGrams,
  calculateThermicEffectOfFood,
} from '@/lib/bodyComposition';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID || '1JcGmHgvQA7jQEqryYJu1wINirAc-r9EA0fd5FUa4vIU';

type DailyNutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

const toUtcDateKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

// Bypass local SSL inspection/proxy certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const scrypt = promisify(scryptCallback);

export function getGoogleSheetsClient() {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Check if credentials.json exists in root directory
  const credsPath = path.join(process.cwd(), 'credentials.json');
  if (fs.existsSync(credsPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (fileData.client_email && fileData.private_key) {
        clientEmail = fileData.client_email;
        privateKey = fileData.private_key;
      }
    } catch (e) {
      console.error('Error parsing credentials.json:', e);
    }
  }

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle escaped newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export type SheetUser = { name: string; username: string; rowNumber: number };

/** Read rows from a user-owned tab and fail closed unless its Email header exists. */
async function getEmailScopedRowsWithHeaders(sheets: any, sheetName: string, email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('A user email is required to read this sheet');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  });
  const rows: any[][] = result.data.values || [];
  const headers = (rows[0] || []).map((value) => String(value || '').trim().toLowerCase());
  const emailColumns = headers.flatMap((header, index) => header === 'email' ? [index] : []);
  if (emailColumns.length !== 1) throw new Error(`${sheetName} sheet must have exactly one Email column`);
  const emailColumn = emailColumns[0];
  return {
    headers: rows[0] || [],
    rows: rows.slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[emailColumn] || '').trim().toLowerCase() === normalizedEmail),
  };
}

async function getEmailScopedRows(sheets: any, sheetName: string, email: string) {
  return (await getEmailScopedRowsWithHeaders(sheets, sheetName, email)).rows;
}

function normalizeSheetHeader(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findUniqueHeaderIndex(headers: unknown[], label: string, aliases: string[], sheetName = 'Packaged') {
  const accepted = aliases.map(normalizeSheetHeader);
  const matches = headers.flatMap((header, index) => accepted.includes(normalizeSheetHeader(header)) ? [index] : []);
  if (matches.length !== 1) throw new Error(`${sheetName} sheet must have exactly one ${label} column`);
  return matches[0];
}

const SHEET_HEADER_ALIASES: Record<string, string[]> = {
  user: ['user'], email: ['email'], name: ['name', 'workout', 'workoutname'],
  dish: ['dish', 'name', 'food'], portion: ['portion', 'quantity'],
  timestamp: ['timestamp', 'timestamputc', 'createdat', 'createdatutc', 'date'],
  ingredient: ['ingredient'], quantity: ['quantity', 'amount'],
  calories: ['calories', 'calorieskcal', 'caloriesburnt', 'caloriesburntkcal'], protein: ['protein', 'proteing'], carbs: ['carbs', 'carbsg', 'carbohydrates', 'carbohydratesg'],
  fats: ['fat', 'fatg', 'fats'], calcium: ['calcium', 'calciummg'], iron: ['iron', 'ironmg'], potassium: ['potassium', 'potassiummg'], sodium: ['sodium', 'sodiummg'],
  vitaminc: ['vitaminc', 'vitamincmg'], vitaminb12: ['vitaminb12', 'vitaminb12mcg'], vitamind: ['vitamind', 'vitamindmcg', 'vitamindiu'],
};

/** Build complete rows from named fields, placing every value under its matching header. */
async function appendRowsForUser(
  sheets: any,
  sheetName: string,
  records: Record<string, unknown>[],
  userName: string,
  email: string
) {
  const headerResult = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
  });
  const headers: string[] = headerResult.data.values?.[0] || [];
  const normalized = headers.map(normalizeSheetHeader);
  const output = records.map((record) => {
    const fields = { ...record, user: userName, email: email.trim().toLowerCase() };
    const row = new Array(headers.length).fill('');
    for (const [key, value] of Object.entries(fields)) {
      const aliases = SHEET_HEADER_ALIASES[normalizeSheetHeader(key)] || [normalizeSheetHeader(key)];
      const matches = normalized.flatMap((header, index) => aliases.includes(header) ? [index] : []);
      if (matches.length !== 1) throw new Error(`${sheetName} sheet must have exactly one column for ${key}`);
      row[matches[0]] = value ?? '';
    }
    return row;
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: output },
  });
}

type PlanSheetColumns = {
  name: number;
  user: number;
  email: number;
  targetWeight: number;
  restingCalories: number;
  startDate: number;
  comment: number;
  status: number;
};

async function readPlanSheet(sheets: any): Promise<{
  headers: string[];
  columns: PlanSheetColumns;
  rows: { row: any[]; rowNumber: number }[];
}> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Plan!A1:Z',
  });
  const rawRows: any[][] = result.data.values || [];
  const headers = rawRows[0] || [];
  const normalized = headers.map(normalizeSheetHeader);
  const column = (key: string, aliases: string[]) => {
    const matches = normalized.flatMap((header, index) => aliases.includes(header) ? [index] : []);
    if (matches.length !== 1) throw new Error(`Plan sheet must have exactly one ${key} column`);
    return matches[0];
  };
  const columns: PlanSheetColumns = {
    name: column('Name', ['name', 'planname']),
    user: column('User', ['user']),
    email: column('Email', ['email']),
    targetWeight: column('Target Weight', ['targetweight', 'targetweightkg']),
    restingCalories: column('Resting Calories', ['restingcalories', 'restingcalorieskcal']),
    startDate: column('Created At', ['createdat', 'createdatutc', 'startdate']),
    comment: column('Comment', ['comment']),
    status: column('Status', ['status']),
  };
  return {
    headers,
    columns,
    rows: rawRows.slice(1).map((row, index) => ({ row, rowNumber: index + 2 })),
  };
}

function normalizePlanRow(row: any[], columns: PlanSheetColumns) {
  // Preserve the internal order used by plan analytics, independent of sheet column order.
  return [
    row[columns.name] ?? '',
    row[columns.user] ?? '',
    row[columns.targetWeight] ?? '',
    row[columns.restingCalories] ?? '',
    row[columns.startDate] ?? '',
    row[columns.comment] ?? '',
    row[columns.status] ?? '',
  ];
}

async function getEmailScopedPlanRows(sheets: any, email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('A user email is required to read the Plan sheet');
  const planSheet = await readPlanSheet(sheets);
  return {
    ...planSheet,
    rows: planSheet.rows
      .filter(({ row, }) => String(row[planSheet.columns.email] || '').trim().toLowerCase() === normalizedEmail)
      .map(({ row, rowNumber }) => ({ row: normalizePlanRow(row, planSheet.columns), rowNumber })),
  };
}

async function appendPlanForUser(sheets: any, p: PlanInput, email: string) {
  const { headers, columns } = await readPlanSheet(sheets);
  const row = new Array(headers.length).fill('');
  row[columns.name] = p.planName;
  row[columns.user] = p.userName;
  row[columns.email] = email.trim().toLowerCase();
  row[columns.targetWeight] = p.targetWeightKg;
  row[columns.restingCalories] = p.restingCalories;
  row[columns.startDate] = p.startDate;
  row[columns.comment] = p.comment || '';
  row[columns.status] = planStatus(p.startDate);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Plan!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const digest = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${digest.toString('hex')}`;
}

export async function registerSheetUser(firstName: string, lastName: string, email: string, password: string): Promise<SheetUser> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const first = firstName.trim();
  const last = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const name = `${first} ${last}`.trim();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'User!A2:I' });
  const rows: any[][] = result.data.values || [];
  if (rows.some((row) => String(row[5] || '').trim().toLowerCase() === normalizedEmail)) {
    throw new Error('An account with that email already exists');
  }
  if (rows.some((row) => String(row[0] || '').trim().toLowerCase() === name.toLowerCase())) {
    throw new Error('An account with that first and last name already exists');
  }
  const passwordHash = await hashPassword(password);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!F1:J1',
    valueInputOption: 'RAW',
    requestBody: { values: [['Email', 'Password Hash', 'First Name', 'Last Name', 'Onboarding Step']] },
  });
  const userHeadersResult = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'User!A1:J1' });
  const userHeaders: string[] = userHeadersResult.data.values?.[0] || [];
  const userFields: Record<string, unknown> = {
    name, 'weight (kg)': 0, 'height (cm)': 0, 'workouts per week': 0, 'legacy unused column': '',
    email: normalizedEmail, 'password hash': passwordHash, 'first name': first, 'last name': last, 'onboarding step': 0,
  };
  const userHeaderAliases: Record<string, string[]> = {
    heightcm: ['heightcm', 'heightcms'],
    workoutsperweek: ['workoutperweek', 'workoutsperweek'],
    legacyunusedcolumn: ['avatar'],
  };
  const userRecord = new Array(userHeaders.length).fill('');
  for (const [field, value] of Object.entries(userFields)) {
    const normalizedField = normalizeSheetHeader(field);
    const acceptedHeaders = userHeaderAliases[normalizedField] || [normalizedField];
    const matches = userHeaders.flatMap((header, index) => acceptedHeaders.includes(normalizeSheetHeader(header)) ? [index] : []);
    if (matches.length !== 1) throw new Error(`User sheet must have exactly one ${field} column`);
    userRecord[matches[0]] = value;
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A:J',
    valueInputOption: 'RAW',
    requestBody: { values: [userRecord] },
  });
  return { name, username: normalizedEmail, rowNumber: rows.length + 2 };
}

/** Number of steps in the app's onboarding guide; a stored step of this value means onboarding is finished. */
export const ONBOARDING_STEPS = 5;

/** Returns how many onboarding steps the user has completed, from 0 to ONBOARDING_STEPS. */
export async function getUserOnboardingStep(email: string): Promise<number> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A1:J',
  });
  const rows: any[][] = result.data.values || [];
  const headers = (rows[0] || []).map((value) => String(value || '').trim().toLowerCase());
  const emailColumn = headers.indexOf('email');
  let stepColumn = headers.indexOf('onboarding step');
  if (emailColumn < 0) throw new Error('User sheet is missing its Email column');
  if (stepColumn < 0) {
    stepColumn = headers.length;
    const col = columnLetters(stepColumn + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `User!${col}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Onboarding Step']] },
    });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const index = rows.slice(1).findIndex((row) => String(row[emailColumn] || '').trim().toLowerCase() === normalizedEmail);
  if (index < 0) throw new Error('User record not found');
  return parseOnboardingStep(rows[index + 1]?.[stepColumn]);
}

function parseOnboardingStep(rawStep: unknown): number {
  const step = Math.trunc(Number(String(rawStep ?? '').trim() || 0));
  return Number.isFinite(step) ? Math.min(Math.max(step, 0), ONBOARDING_STEPS) : 0;
}

/** Raises the user's completed onboarding step to `step`, never lowering it, and returns the stored value. */
export async function advanceUserOnboardingStep(email: string, step: number): Promise<number> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A1:J',
  });
  const rows: any[][] = result.data.values || [];
  const headers = (rows[0] || []).map((value) => String(value || '').trim().toLowerCase());
  const emailColumn = headers.indexOf('email');
  let stepColumn = headers.indexOf('onboarding step');
  if (emailColumn < 0) throw new Error('User sheet is missing its Email column');
  if (stepColumn < 0) {
    stepColumn = headers.length;
    const col = columnLetters(stepColumn + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `User!${col}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Onboarding Step']] },
    });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const index = rows.slice(1).findIndex((row) => String(row[emailColumn] || '').trim().toLowerCase() === normalizedEmail);
  if (index < 0) throw new Error('User record not found');
  const stored = Math.max(parseOnboardingStep(rows[index + 1]?.[stepColumn]), step);
  const col = columnLetters(stepColumn + 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `User!${col}${index + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[stored]] },
  });
  return stored;
}

function columnLetters(columnNumber: number): string {
  let result = '';
  let n = columnNumber;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export async function authenticateSheetUser(username: string, password: string): Promise<SheetUser | null> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A2:G',
  });
  const rows: any[][] = result.data.values || [];
  const normalizedUsername = username.trim().toLowerCase();
  const usernameMatches = rows.filter((row) => String(row[5] || '').trim().toLowerCase() === normalizedUsername);
  if (usernameMatches.length !== 1) return null;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const name = String(row[0] || '').trim();
    const storedUsername = String(row[5] || '').trim();
    const storedHash = String(row[6] || '').trim();
    if (!name || storedUsername.toLowerCase() !== normalizedUsername || !storedHash) continue;
    if (rows.filter((candidate) => String(candidate[0] || '').trim() === name).length !== 1) return null;
    const [saltHex, digestHex] = storedHash.split(':');
    if (!/^[a-f0-9]{32}$/i.test(saltHex || '') || !/^[a-f0-9]{128}$/i.test(digestHex || '')) return null;
    const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer;
    const expected = Buffer.from(digestHex, 'hex');
    if (expected.length !== derived.length || !timingSafeEqual(expected, derived)) return null;
    return { name, username: storedUsername, rowNumber: index + 2 };
  }
  return null;
}

export async function changeSheetUserPassword(username: string, newPassword: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A2:G',
  });
  const rows: any[][] = result.data.values || [];
  const normalizedUsername = username.trim().toLowerCase();
  const matches = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[5] || '').trim().toLowerCase() === normalizedUsername);
  if (matches.length !== 1 || !String(matches[0].row[0] || '').trim()) return false;
  const passwordHash = await hashPassword(newPassword);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `User!G${matches[0].rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[passwordHash]] },
  });
  return true;
}

export type StoredGarminIntegration = {
  integration: string;
  apiKey: string;
  isLive: boolean;
};

async function findUserIntegrationColumns(sheets: any, email: string) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!A1:Z',
  });
  const rows: any[][] = result.data.values || [];
  const headers = rows[0] || [];
  const headerIndex = (label: string) => {
    const matches = headers.flatMap((header, index) => normalizeSheetHeader(header) === normalizeSheetHeader(label) ? [index] : []);
    if (matches.length !== 1) throw new Error(`User sheet must have exactly one ${label} column`);
    return matches[0];
  };
  const emailColumn = headerIndex('Email');
  const integrationColumn = headerIndex('Integration');
  const apiKeyColumn = headerIndex('Integration API Key');
  const normalizedEmail = email.trim().toLowerCase();
  const matches = rows.slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[emailColumn] || '').trim().toLowerCase() === normalizedEmail);
  if (matches.length !== 1) throw new Error('User record was not found or is duplicated');
  return { ...matches[0], integrationColumn, apiKeyColumn };
}

export async function getStoredGarminIntegration(email: string): Promise<StoredGarminIntegration> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { integration: '', apiKey: '', isLive: false };
  const match = await findUserIntegrationColumns(sheets, email);
  return {
    integration: String(match.row[match.integrationColumn] || '').trim(),
    apiKey: String(match.row[match.apiKeyColumn] || '').trim(),
    isLive: true,
  };
}

export async function saveGarminIntegration(email: string, apiKey: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return false;
  const match = await findUserIntegrationColumns(sheets, email);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `User!${columnLetters(match.integrationColumn + 1)}${match.rowNumber}`, values: [['Garmin Connect']] },
        { range: `User!${columnLetters(match.apiKeyColumn + 1)}${match.rowNumber}`, values: [[apiKey]] },
      ],
    },
  });
  return true;
}

export async function removeGarminIntegration(email: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return false;
  const match = await findUserIntegrationColumns(sheets, email);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `User!${columnLetters(match.integrationColumn + 1)}${match.rowNumber}`, values: [['']] },
        { range: `User!${columnLetters(match.apiKeyColumn + 1)}${match.rowNumber}`, values: [['']] },
      ],
    },
  });
  return true;
}

interface DishNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
  ingredients: DishIngredient[];
}

interface IngredientInfo {
  baseQuantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function scaleMicros(m: Micronutrients, factor: number): Micronutrients {
  return {
    calcium: round1(m.calcium * factor),
    iron: round2(m.iron * factor),
    potassium: round1(m.potassium * factor),
    sodium: round1(m.sodium * factor),
    vitaminC: round1(m.vitaminC * factor),
    vitaminB12: round2(m.vitaminB12 * factor),
    vitaminD: round1(m.vitaminD * factor),
  };
}

// Scales a dish's ingredient breakdown to the portion eaten.
export function scaleIngredients(ingredients: DishIngredient[], portion: number): DishIngredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    amount: round2(ing.amount * portion),
    calories: Math.round(ing.calories * portion),
    protein: round1(ing.protein * portion),
    carbs: round1(ing.carbs * portion),
    fats: round1(ing.fats * portion),
    micros: scaleMicros(ing.micros, portion),
  }));
}

// Compute dish nutrition dynamically from Ingredients and Recipe sheets
async function getDishCatalog(sheets: any, userEmail: string): Promise<{
  dishMap: Record<string, DishNutrition>;
  recipes: Recipe[];
  packaged: Recipe[];
  ingredientNames: string[];
  ingredientUnits: Record<string, { baseQuantity: number; unit: string }>;
}> {
  try {
    const [ingRes, recRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Ingredients!A2:N',
      }),
      getEmailScopedRows(sheets, 'Recipe', userEmail),
    ]);

    const ingRows = ingRes.data.values || [];
    const recRows = recRes.map(({ row }) => row);

    const ingMap: Record<string, IngredientInfo> = {};
    ingRows.forEach((r: any[]) => {
      const name = String(r[0] || '').trim();
      if (!name) return;
      ingMap[name] = {
        baseQuantity: parseFloat(r[1]) || 1,
        unit: String(r[2] || '').trim(),
        calories: parseFloat(r[3]) || 0,
        protein: parseFloat(r[4]) || 0,
        carbs: parseFloat(r[5]) || 0,
        fats: parseFloat(r[6]) || 0,
        micros: {
          calcium: parseFloat(r[7]) || 0,
          iron: parseFloat(r[8]) || 0,
          potassium: parseFloat(r[9]) || 0,
          sodium: parseFloat(r[10]) || 0,
          vitaminC: parseFloat(r[11]) || 0,
          vitaminB12: parseFloat(r[12]) || 0,
          vitaminD: parseFloat(r[13]) || 0,
        },
      };
    });

    const dishMap: Record<string, DishNutrition> = {};
    recRows.forEach((r: any[]) => {
      const dish = String(r[0] || '').trim();
      const ingName = String(r[1] || '').trim();
      const qty = parseFloat(r[2]) || 0;
      if (!dish) return;

      if (!dishMap[dish]) {
        dishMap[dish] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          micros: { ...EMPTY_MICROS },
          ingredients: [],
        };
      }

      // The recipe quantity is a multiple of the ingredient's base quantity (e.g. 1.5 x 100 g).
      const ing = ingMap[ingName];
      const dishEntry = dishMap[dish];
      if (ing) {
        dishEntry.calories += ing.calories * qty;
        dishEntry.protein += ing.protein * qty;
        dishEntry.carbs += ing.carbs * qty;
        dishEntry.fats += ing.fats * qty;
        (Object.keys(EMPTY_MICROS) as (keyof Micronutrients)[]).forEach((k) => {
          dishEntry.micros[k] += ing.micros[k] * qty;
        });
      }

      dishEntry.ingredients.push({
        name: ingName,
        quantity: qty,
        amount: round2(qty * (ing?.baseQuantity ?? 1)),
        unit: ing?.unit ?? '',
        calories: Math.round((ing?.calories ?? 0) * qty),
        protein: round1((ing?.protein ?? 0) * qty),
        carbs: round1((ing?.carbs ?? 0) * qty),
        fats: round1((ing?.fats ?? 0) * qty),
        micros: scaleMicros(ing?.micros ?? EMPTY_MICROS, qty),
      });
    });

    // Format recipes list
    const recipes: Recipe[] = Object.keys(dishMap).map((dishName, idx) => {
      const m = dishMap[dishName];
      return {
        id: `recipe-${idx + 1}`,
        name: dishName,
        servingUnit: '1 serving',
        calories: Math.round(m.calories),
        protein: Math.round(m.protein * 10) / 10,
        carbs: Math.round(m.carbs * 10) / 10,
        fats: Math.round(m.fats * 10) / 10,
        micros: scaleMicros(m.micros, 1),
        ingredients: m.ingredients,
      };
    });

    // Packaged items carry their nutrition directly; values are for `Quantity` servings.
    const packaged: Recipe[] = [];
    try {
      const { headers, rows: pkgRows } = await getEmailScopedRowsWithHeaders(sheets, 'Packaged', userEmail);
      const columns = {
        dish: findUniqueHeaderIndex(headers, 'Dish', ['dish', 'name', 'food']),
        quantity: findUniqueHeaderIndex(headers, 'Quantity', ['quantity', 'amount', 'portion']),
        calories: findUniqueHeaderIndex(headers, 'Calories', ['calories', 'calorieskcal']),
        protein: findUniqueHeaderIndex(headers, 'Protein', ['protein', 'proteing']),
        carbs: findUniqueHeaderIndex(headers, 'Carbohydrates', ['carbohydrates', 'carbohydratesg', 'carbs']),
        fats: findUniqueHeaderIndex(headers, 'Fat', ['fat', 'fatg', 'fats']),
        calcium: findUniqueHeaderIndex(headers, 'Calcium', ['calcium', 'calciummg']),
        iron: findUniqueHeaderIndex(headers, 'Iron', ['iron', 'ironmg']),
        potassium: findUniqueHeaderIndex(headers, 'Potassium', ['potassium', 'potassiummg']),
        sodium: findUniqueHeaderIndex(headers, 'Sodium', ['sodium', 'sodiummg']),
        vitaminC: findUniqueHeaderIndex(headers, 'Vitamin C', ['vitaminc', 'vitamincmg']),
        vitaminB12: findUniqueHeaderIndex(headers, 'Vitamin B12', ['vitaminb12', 'vitaminb12mcg']),
        vitaminD: findUniqueHeaderIndex(headers, 'Vitamin D', ['vitamind', 'vitamindiu', 'vitamindmcg']),
      };
      pkgRows.forEach(({ row: r }) => {
        const name = String(r[columns.dish] || '').trim();
        if (!name || dishMap[name]) return;
        const qtyValue = parseFloat(r[columns.quantity]);
        const qty = qtyValue > 0 ? qtyValue : 1;
        const micros = scaleMicros(
          {
            calcium: parseFloat(r[columns.calcium]) || 0,
            iron: parseFloat(r[columns.iron]) || 0,
            potassium: parseFloat(r[columns.potassium]) || 0,
            sodium: parseFloat(r[columns.sodium]) || 0,
            vitaminC: parseFloat(r[columns.vitaminC]) || 0,
            vitaminB12: parseFloat(r[columns.vitaminB12]) || 0,
            vitaminD: parseFloat(r[columns.vitaminD]) || 0,
          },
          1 / qty
        );
        const nutrition: DishNutrition = {
          calories: (parseFloat(r[columns.calories]) || 0) / qty,
          protein: (parseFloat(r[columns.protein]) || 0) / qty,
          carbs: (parseFloat(r[columns.carbs]) || 0) / qty,
          fats: (parseFloat(r[columns.fats]) || 0) / qty,
          micros,
          ingredients: [],
        };
        dishMap[name] = nutrition;
        packaged.push({
          id: `packaged-${packaged.length + 1}`,
          name,
          servingUnit: '1 serving',
          calories: Math.round(nutrition.calories),
          protein: round1(nutrition.protein),
          carbs: round1(nutrition.carbs),
          fats: round1(nutrition.fats),
          isPackaged: true,
          micros,
          ingredients: [],
        });
      });
    } catch (err) {
      console.error('Error reading Packaged sheet:', err);
    }

    return {
      dishMap,
      recipes,
      packaged,
      ingredientNames: Object.keys(ingMap).sort((a, b) => a.localeCompare(b)),
      ingredientUnits: Object.fromEntries(
        Object.entries(ingMap).map(([n, i]) => [n, { baseQuantity: i.baseQuantity, unit: i.unit }])
      ),
    };
  } catch (err) {
    console.error('Error resolving dish catalog from Recipe & Ingredients:', err);
    return { dishMap: {}, recipes: [], packaged: [], ingredientNames: [], ingredientUnits: {} };
  }
}

export async function fetchRecipes(userEmail: string): Promise<{
  recipes: Recipe[];
  packaged: Recipe[];
  ingredientNames: string[];
  ingredientUnits: Record<string, { baseQuantity: number; unit: string }>;
  isLive: boolean;
}> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return { recipes: [], packaged: [], ingredientNames: [], ingredientUnits: {}, isLive: false };
  }

  const { recipes, packaged, ingredientNames, ingredientUnits } = await getDishCatalog(sheets, userEmail);
  return {
    packaged,
    ingredientUnits,
    recipes,
    ingredientNames,
    isLive: true,
  };
}

export async function fetchMealLogs(userEmail: string): Promise<{ logs: MealLogEntry[]; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return { logs: [], isLive: false };
  }

  try {
    const [{ dishMap }, foodRes] = await Promise.all([
      getDishCatalog(sheets, userEmail),
      getEmailScopedRowsWithHeaders(sheets, 'Food', userEmail),
    ]);

    const columns = {
      dish: findUniqueHeaderIndex(foodRes.headers, 'Dish', ['dish', 'name', 'food'], 'Food'),
      portion: findUniqueHeaderIndex(foodRes.headers, 'Portion', ['portion', 'quantity'], 'Food'),
      timestamp: findUniqueHeaderIndex(foodRes.headers, 'Timestamp', ['timestamp', 'timestamputc', 'createdat', 'createdatutc', 'date'], 'Food'),
      user: findUniqueHeaderIndex(foodRes.headers, 'User', ['user'], 'Food'),
    };

    const logs: MealLogEntry[] = foodRes.rows
      .map(({ row, rowNumber }) => ({ row, index: rowNumber - 2 }))
      .map(({ row, index }) => {
      const dish = String(row[columns.dish] || '').trim();
      const portion = parseFloat(row[columns.portion]) || 1;
      const timestamp = String(row[columns.timestamp] || new Date().toISOString());
      const user = String(row[columns.user] || 'Pritam Mallick');

      // Calculate macros dynamically on the fly using Recipe & Ingredients
      const dishNutrition: DishNutrition = dishMap[dish] || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        micros: { ...EMPTY_MICROS },
        ingredients: [],
      };

      return {
        id: String(index + 1),
        dish,
        portion,
        calories: Math.round(dishNutrition.calories * portion),
        protein: Math.round(dishNutrition.protein * portion * 10) / 10,
        carbs: Math.round(dishNutrition.carbs * portion * 10) / 10,
        fats: Math.round(dishNutrition.fats * portion * 10) / 10,
        timestamp,
        user,
        micros: scaleMicros(dishNutrition.micros, portion),
        ingredients: scaleIngredients(dishNutrition.ingredients, portion),
      };
    });

    return { logs, isLive: true };
  } catch (error) {
    console.error('Error fetching meal logs:', error);
    throw error;
  }
}

export async function appendMealLog(
  entry: MealLogEntry,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    console.warn('Google Sheets credentials not set. Simulated log entry.');
    return { success: true, isLive: false };
  }

  // Email is stored in the sheet's Email column for account-scoped reads.
  await appendRowsForUser(
    sheets,
    'Food',
    [{ dish: entry.dish, portion: entry.portion, timestamp: entry.timestamp || new Date().toISOString() }],
    entry.user || 'Pritam Mallick',
    userEmail
  );

  return { success: true, isLive: true };
}

export async function appendRecipe(
  dish: string,
  items: { ingredient: string; quantity: number }[],
  userName: string,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return { success: true, isLive: false };
  }

  // One row per ingredient, with values matched to their named headers.
  await appendRowsForUser(
    sheets,
    'Recipe',
    items.map((i) => ({ dish, ingredient: i.ingredient, quantity: i.quantity })),
    userName,
    userEmail
  );
  return { success: true, isLive: true };
}

export async function appendPackaged(p: {
  dish: string;
  quantity: number;
  user: string;
  email: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
}): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: true, isLive: false };
  }

  await appendRowsForUser(sheets, 'Packaged', [{
    dish: p.dish, quantity: p.quantity, calories: p.calories, protein: p.protein, carbs: p.carbs,
    fats: p.fats, calcium: p.micros.calcium, iron: p.micros.iron, potassium: p.micros.potassium,
    sodium: p.micros.sodium, vitaminC: p.micros.vitaminC, vitaminB12: p.micros.vitaminB12,
    vitaminD: p.micros.vitaminD,
  }], p.user, p.email);
  return { success: true, isLive: true };
}

export async function updatePackaged(p: {
  dish: string;
  originalDish?: string;
  quantity: number;
  user: string;
  email: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
}): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: true, isLive: false };
  }

  const { headers, rows } = await getEmailScopedRowsWithHeaders(sheets, 'Packaged', p.email);
  const columns = {
    dish: findUniqueHeaderIndex(headers, 'Dish', ['dish', 'name', 'food']),
    quantity: findUniqueHeaderIndex(headers, 'Quantity', ['quantity', 'amount', 'portion']),
    user: findUniqueHeaderIndex(headers, 'User', ['user']),
    email: findUniqueHeaderIndex(headers, 'Email', ['email']),
    calories: findUniqueHeaderIndex(headers, 'Calories', ['calories', 'calorieskcal']),
    protein: findUniqueHeaderIndex(headers, 'Protein', ['protein', 'proteing']),
    carbs: findUniqueHeaderIndex(headers, 'Carbohydrates', ['carbohydrates', 'carbohydratesg', 'carbs']),
    fats: findUniqueHeaderIndex(headers, 'Fat', ['fat', 'fatg', 'fats']),
    calcium: findUniqueHeaderIndex(headers, 'Calcium', ['calcium', 'calciummg']),
    iron: findUniqueHeaderIndex(headers, 'Iron', ['iron', 'ironmg']),
    potassium: findUniqueHeaderIndex(headers, 'Potassium', ['potassium', 'potassiummg']),
    sodium: findUniqueHeaderIndex(headers, 'Sodium', ['sodium', 'sodiummg']),
    vitaminC: findUniqueHeaderIndex(headers, 'Vitamin C', ['vitaminc', 'vitamincmg']),
    vitaminB12: findUniqueHeaderIndex(headers, 'Vitamin B12', ['vitaminb12', 'vitaminb12mcg']),
    vitaminD: findUniqueHeaderIndex(headers, 'Vitamin D', ['vitamind', 'vitamindiu', 'vitamindmcg']),
  };
  const originalDish = (p.originalDish ?? p.dish).trim();
  const match = rows.find(({ row }) => String(row[columns.dish] || '').trim() === originalDish && String(row[columns.user] || '').trim() === p.user);
  if (!match) {
    throw new Error(`Packaged item "${originalDish}" was not found`);
  }

  const fields: Record<string, unknown> = {
    [columns.dish]: p.dish,
    [columns.quantity]: p.quantity,
    [columns.user]: p.user,
    [columns.email]: p.email.trim().toLowerCase(),
    [columns.calories]: p.calories,
    [columns.protein]: p.protein,
    [columns.carbs]: p.carbs,
    [columns.fats]: p.fats,
    [columns.calcium]: p.micros.calcium,
    [columns.iron]: p.micros.iron,
    [columns.potassium]: p.micros.potassium,
    [columns.sodium]: p.micros.sodium,
    [columns.vitaminC]: p.micros.vitaminC,
    [columns.vitaminB12]: p.micros.vitaminB12,
    [columns.vitaminD]: p.micros.vitaminD,
  };
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: Object.entries(fields).map(([column, value]) => ({
        range: `Packaged!${columnLetters(Number(column) + 1)}${match.rowNumber}`,
        values: [[value]],
      })),
    },
  });
  return { success: true, isLive: true };
}

export async function updateRecipe(
  dish: string,
  items: { ingredient: string; quantity: number }[],
  newDish: string | undefined,
  userName: string,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: true, isLive: false };
  }

  const targetName = (newDish ?? dish).trim() || dish;

  const scopedRows = await getEmailScopedRows(sheets, 'Recipe', userEmail);
  const rows: any[][] = scopedRows.map(({ row }) => row);
  const firstIdx = rows.findIndex((r) => String(r[0] || '').trim() === dish);
  if (firstIdx === -1) {
    throw new Error(`Recipe "${dish}" was not found`);
  }

  // Replace the dish's rows in place, keeping every other recipe untouched.
  // Use targetName so a rename is applied to every row of the dish.
  const newRows = items.map((i) => [targetName, i.ingredient, i.quantity]);
  const result: any[][] = [];
  rows.forEach((r, idx) => {
    if (String(r[0] || '').trim() === dish) {
      if (idx === firstIdx) result.push(...newRows);
    } else {
      result.push([r[0] ?? '', r[1] ?? '', r[2] ?? '']);
    }
  });

  // Update only rows owned by this email. Other users' recipe rows are untouched.
  for (let i = 0; i < scopedRows.length; i++) {
    const rowNumber = scopedRows[i].rowNumber;
    const updated = result[i];
    if (updated) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Recipe!A${rowNumber}:C${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updated] },
      });
    } else {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Recipe!A${rowNumber}:C${rowNumber}`,
      });
    }
  }
  if (result.length > scopedRows.length) {
    await appendRowsForUser(
      sheets,
      'Recipe',
      result.slice(scopedRows.length).map(([dishName, ingredient, quantity]) => ({
        dish: dishName,
        ingredient,
        quantity,
      })),
      userName,
      userEmail
    );
  }

  // Keep this user's existing meal logs linked to the recipe after a rename.
  if (targetName !== dish) {
    const foodRows = await getEmailScopedRowsWithHeaders(sheets, 'Food', userEmail);
    const dishColumn = findUniqueHeaderIndex(foodRows.headers, 'Dish', ['dish', 'name', 'food'], 'Food');
    const updates = foodRows.rows
      .filter(({ row }) => String(row[dishColumn] || '').trim() === dish)
      .map(({ rowNumber }) => ({
        range: `Food!${columnLetters(dishColumn + 1)}${rowNumber}`,
        values: [[targetName]],
      }));

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
      });
    }
  }
  return { success: true, isLive: true };
}

export async function fetchPlanAnalytics(userEmail: string, displayName?: string): Promise<{
  plan: PlanAnalytics;
  activePlans: PlanAnalytics[];
  isLive: boolean;
}> {
  const sheets = getGoogleSheetsClient();

  const fallbackPlan: PlanAnalytics = {
    planName: 'Cut 2026',
    userName: displayName || '',
    currentWeight: 83,
    targetWeight: 75,
    restingCalories: 2100,
    totalCalorieBurnt: 5250,
    totalCalorieConsumed: 3964,
    totalCalorieDeficit: 1286,
    averageCalorieDeficit: 643,
    totalFatMassChangeGrams: 0,
    averageDailyFatMassChangeGrams: 0,
    totalMuscleMassChangeGrams: 0,
    totalWeightChangeGrams: 0,
    averageDailyWeightChangeGrams: 0,
    projectedDate: 'Jan 14, 2027',
    daysElapsed: 2,
    daysRemaining: 94,
    progressPercent: 2,
    workoutCaloriesByDate: {},
    heightCm: 168,
    workoutsPerWeek: 3,
    startDate: '2026-10-11T00:00:00Z',
    plans: [],
    hasPlan: true,
  };

  if (!sheets) {
    return { plan: fallbackPlan, activePlans: [fallbackPlan], isLive: false };
  }

  try {
    const [planSheetData, userRes, workoutsData, mealLogsData] = await Promise.all([
      getEmailScopedPlanRows(sheets, userEmail),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'User!A2:G',
      }),
      fetchWorkouts(userEmail),
      fetchMealLogs(userEmail),
    ]);

    const allPlanEntries = planSheetData.rows;
    const allPlanRows: any[][] = allPlanEntries.map(({ row }) => row);
    const planEntries = allPlanEntries
      .filter(({ row }) => String(row[6] || '').trim().toUpperCase() !== 'DELETED');
    const planRows: any[][] = planEntries.map((e) => e.row);
    // A plan is ACTIVE once its start date has arrived, otherwise INACTIVE.
    // All active plans are returned, earliest first; the earliest is the default.
    const nowMs = Date.now();
    const startOf = (r: any[]) => new Date(String(r[4] || '')).getTime();
    const isStarted = (r: any[]) => {
      const ts = startOf(r);
      return !Number.isNaN(ts) && ts <= nowMs;
    };
    const activeEntries = planEntries
      .filter((e) => isStarted(e.row))
      .sort((a, b) => startOf(a.row) - startOf(b.row));
    const activeIdx = activeEntries.length > 0 ? 0 : -1;
    const activeRowNumbers = new Set(activeEntries.map((e) => e.rowNumber));
    // Deleted plans stay visible in the app but never drive tracking
    const planSummaries = allPlanEntries.map(({ row: r, rowNumber }) => {
      const deleted = String(r[6] || '').trim().toUpperCase() === 'DELETED';
      return {
        rowNumber,
        name: String(r[0] || ''),
        targetWeight: parseFloat(r[2]) || 0,
        restingCalories: parseFloat(r[3]) || 0,
        startDate: String(r[4] || ''),
        comment: String(r[5] || ''),
        status: (deleted ? 'DELETED' : isStarted(r) ? 'ACTIVE' : 'INACTIVE') as PlanSummary['status'],
        isActive: activeRowNumbers.has(rowNumber),
      };
    });
    const userRows: any[][] = userRes.data.values || [];
    const userRow = userRows.find((row) => String(row[5] || '').trim().toLowerCase() === userEmail.trim().toLowerCase()) || [];

    if (activeIdx < 0) {
      return {
        plan: {
          ...fallbackPlan,
          planName: '',
          userName: String(userRow[0] || fallbackPlan.userName),
          currentWeight: Number.isFinite(parseFloat(userRow[1])) ? parseFloat(userRow[1]) : fallbackPlan.currentWeight,
          targetWeight: 0,
          restingCalories: 0,
          totalCalorieBurnt: 0,
          totalCalorieConsumed: 0,
          totalCalorieDeficit: 0,
          averageCalorieDeficit: 0,
          totalFatMassChangeGrams: 0,
          averageDailyFatMassChangeGrams: 0,
          totalMuscleMassChangeGrams: 0,
          totalWeightChangeGrams: 0,
          averageDailyWeightChangeGrams: 0,
          projectedDate: '',
          daysElapsed: 0,
          daysRemaining: 0,
          progressPercent: 0,
          workoutCaloriesByDate: {},
          heightCm: parseFloat(userRow[2]) || 0,
          workoutsPerWeek: parseFloat(userRow[3]) || 0,
          startDate: '',
          plans: planSummaries,
          hasPlan: false,
        },
        activePlans: [],
        isLive: true,
      };
    }
    const workoutEntries = workoutsData.workouts;
    const mealLogs = mealLogsData.logs || [];

    const buildPlan = (planRow: any[]): PlanAnalytics => {
    const planName = String(planRow[0] || 'Cut 2026');
    const userName = String(planRow[1] || 'Pritam Mallick');
    const targetWeight = parseFloat(planRow[2]) || 75;
    const restingCalories = parseFloat(planRow[3]) || 2100;
    const createdAtStr = String(planRow[4] || '2026-10-11T00:00:00Z');
    const currentWeight = Number.isFinite(parseFloat(userRow[1])) ? parseFloat(userRow[1]) : 83;

    // Calculate days elapsed (from plan creation date)
    const startDate = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const daysElapsed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    // Fractional days drive the calorie maths so the current day accrues proportionally
    const elapsedDays = diffTime / (1000 * 60 * 60 * 24);

    // Only activity since the plan started counts towards the plan
    const startMs = startDate.getTime();
    const totalWorkoutBurnt = workoutEntries.reduce((sum, workout) => {
      const when = new Date(workout.timestamp).getTime();
      if (Number.isNaN(when) || when < startMs) return sum;
      return sum + workout.caloriesBurnt;
    }, 0);
    const workoutCaloriesByDate: Record<string, number> = {};
    workoutEntries.forEach((workout) => {
      const dateValue = String(workout.timestamp || '').trim();
      if (!dateValue) return;

      const parsedDate = new Date(dateValue);
      if (Number.isNaN(parsedDate.getTime())) {
        console.error('Skipping workout row with invalid date:', dateValue);
        return;
      }
      if (parsedDate.getTime() < startMs) return;
      const date = /^\d{4}-\d{2}-\d{2}/.test(dateValue)
        ? dateValue.slice(0, 10)
        : parsedDate.toISOString().split('T')[0];
      const calories = workout.caloriesBurnt;
      workoutCaloriesByDate[date] = (workoutCaloriesByDate[date] || 0) + calories;
    });

    // Total energy expenditure includes resting, logged workouts, and food thermogenesis.
    const totalRestingBurnt = elapsedDays * restingCalories;

    // Total calories consumed from food (calculated on the fly via Recipe & Ingredients)
    const totalCalorieConsumed = Math.round(
      mealLogs.reduce((sum, item) => {
        const when = new Date(item.timestamp).getTime();
        return !Number.isNaN(when) && when < startMs ? sum : sum + item.calories;
      }, 0)
    );

    const nutritionByDate: Record<string, DailyNutritionTotals> = {};
    mealLogs.forEach((item) => {
      const when = new Date(item.timestamp);
      if (Number.isNaN(when.getTime()) || when.getTime() < startMs) return;
      const dateKey = toUtcDateKey(when);
      const totals = nutritionByDate[dateKey] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      totals.calories += item.calories;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fats += item.fats;
      nutritionByDate[dateKey] = totals;
    });

    const totalThermicEffect = Object.values(nutritionByDate).reduce(
      (sum, totals) => sum + calculateThermicEffectOfFood({
        proteinG: totals.protein,
        carbohydrateG: totals.carbs,
        dietaryFatG: totals.fats,
      }),
      0
    );
    const totalCalorieBurnt = Math.round(
      totalRestingBurnt + totalWorkoutBurnt + totalThermicEffect
    );
    const totalCalorieDeficit = Math.round(totalCalorieBurnt - totalCalorieConsumed);
    const averageCalorieDeficit = Math.round(totalCalorieDeficit / Math.max(1, elapsedDays));

    const dailyFatMassChanges: number[] = [];
    const dailyMuscleMassChanges: number[] = [];
    const modelDay = new Date(startDate);
    modelDay.setUTCHours(0, 0, 0, 0);
    const modelNow = new Date();
    const today = new Date(modelNow);
    today.setUTCHours(0, 0, 0, 0);

    while (modelDay <= today) {
      const dateKey = toUtcDateKey(modelDay);
      const totals = nutritionByDate[dateKey] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const nextDay = new Date(modelDay);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const activeDayMs = Math.max(
        0,
        Math.min(nextDay.getTime(), modelNow.getTime()) -
          Math.max(modelDay.getTime(), startDate.getTime())
      );
      const dayRestingCalories = (activeDayMs / (1000 * 60 * 60 * 24)) * restingCalories;
      dailyFatMassChanges.push(
        calculateDailyFatMassChangeGrams({
          weightKg: currentWeight,
          proteinG: totals.protein,
          carbohydrateG: totals.carbs,
          dietaryFatG: totals.fats,
          calorieIntake: totals.calories,
          workoutCalories: workoutCaloriesByDate[dateKey] || 0,
          restingCalories: dayRestingCalories,
        })
      );
      dailyMuscleMassChanges.push(
        calculateDailyWetMuscleMassChangeGrams({
          weightKg: currentWeight,
          proteinG: totals.protein,
          carbohydrateG: totals.carbs,
          dietaryFatG: totals.fats,
          calorieIntake: totals.calories,
          workoutCalories: workoutCaloriesByDate[dateKey] || 0,
          restingCalories: dayRestingCalories,
        })
      );
      modelDay.setUTCDate(modelDay.getUTCDate() + 1);
    }

    const totalFatMassChangeGrams = dailyFatMassChanges.reduce((sum, change) => sum + change, 0);
    const averageDailyFatMassChangeGrams =
      totalFatMassChangeGrams / Math.max(1, dailyFatMassChanges.length);
    const totalMuscleMassChangeGrams = dailyMuscleMassChanges.reduce(
      (sum, change) => sum + change,
      0
    );
    const totalWeightChangeGrams = totalFatMassChangeGrams + totalMuscleMassChangeGrams;
    const averageDailyWeightChangeGrams =
      totalWeightChangeGrams / Math.max(1, dailyMuscleMassChanges.length);
    // Infer the plan-start weight from the current profile weight and modeled
    // change. Progress must follow the target direction: loss for cutting,
    // gain for bulking.
    const planStartWeightGrams = currentWeight * 1000 - totalWeightChangeGrams;
    const goalWeightChangeGrams = targetWeight * 1000 - planStartWeightGrams;
    const remainingGoalWeightChangeGrams = targetWeight * 1000 - currentWeight * 1000;
    const goalDirection = Math.sign(goalWeightChangeGrams);
    const progressPercent = goalWeightChangeGrams === 0
      ? 100
      : Math.min(100, Math.round((totalWeightChangeGrams / goalWeightChangeGrams) * 1000) / 10);

    let daysRemaining = 0;
    let projectedDate = progressPercent >= 100 ? 'Target achieved' : 'Need Daily Weight Change';

    if (progressPercent < 100 && remainingGoalWeightChangeGrams * goalDirection > 0 && averageDailyWeightChangeGrams * goalDirection > 0) {
      daysRemaining = Math.ceil(Math.abs(remainingGoalWeightChangeGrams) / Math.abs(averageDailyWeightChangeGrams));
      const projDateObj = new Date(Date.now() + daysRemaining * 86400000);
      projectedDate = projDateObj.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const plan: PlanAnalytics = {
      planName,
      userName,
      currentWeight,
      targetWeight,
      restingCalories,
      totalCalorieBurnt,
      totalCalorieConsumed,
      totalCalorieDeficit,
      averageCalorieDeficit,
      totalFatMassChangeGrams,
      averageDailyFatMassChangeGrams,
      totalMuscleMassChangeGrams,
      totalWeightChangeGrams,
      averageDailyWeightChangeGrams,
      projectedDate,
      daysElapsed,
      daysRemaining,
      progressPercent,
      workoutCaloriesByDate,
      heightCm: parseFloat(userRow[2]) || 0,
      workoutsPerWeek: parseFloat(userRow[3]) || 0,
      startDate: createdAtStr,
      plans: planSummaries,
      hasPlan: true,
    };
    return plan;
    };

    const activePlans = activeEntries.map((e) => buildPlan(e.row));
    return { plan: activePlans[activeIdx], activePlans, isLive: true };
  } catch (error) {
    console.error('Error fetching plan analytics:', error);
    return { plan: fallbackPlan, activePlans: [fallbackPlan], isLive: true };
  }
}

export async function fetchWorkouts(userEmail: string): Promise<{ workouts: WorkoutEntry[]; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { workouts: [], isLive: false };

  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('A user email is required to read this sheet');
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Workouts!A1:Z',
  });
  const rows: any[][] = result.data.values || [];
  const headers = (rows[0] || []).map(normalizeSheetHeader);
  const column = (label: string, aliases: string[]) => {
    const matches = headers.flatMap((header, index) => aliases.includes(header) ? [index] : []);
    if (matches.length !== 1) throw new Error(`Workouts sheet must have exactly one ${label} column`);
    return matches[0];
  };
  const nameColumn = column('Name', ['name', 'workout', 'workoutname']);
  const userColumn = column('User', ['user']);
  const emailColumn = column('Email', ['email']);
  const timestampColumn = column('Created At', ['timestamp', 'timestamputc', 'createdat', 'createdatutc', 'date']);
  const caloriesColumn = column('Calories Burnt', ['calories', 'calorieskcal', 'caloriesburnt', 'caloriesburntkcal']);
  const workouts: WorkoutEntry[] = [];
  rows.slice(1).forEach((row, index) => {
    if (String(row[emailColumn] || '').trim().toLowerCase() !== normalizedEmail) return;
    const name = String(row[nameColumn] || '').trim();
    const timestamp = String(row[timestampColumn] || '').trim();
    if (!name || Number.isNaN(new Date(timestamp).getTime())) return;
    const user = String(row[userColumn] || '').trim();
    workouts.push({
      id: String(index + 1),
      name,
      user,
      timestamp: new Date(timestamp).toISOString(),
      caloriesBurnt: parseFloat(row[caloriesColumn]) || 0,
    });
  });
  return { workouts, isLive: true };
}

export async function appendWorkout(
  entry: WorkoutEntry,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await appendRowsForUser(
    sheets,
    'Workouts',
    [{ name: entry.name, timestamp: entry.timestamp, calories: entry.caloriesBurnt, source: 'DIRECT' }],
    entry.user,
    userEmail
  );
  return { success: true, isLive: true };
}

/** Reconcile only this user's Garmin-sourced rows for one local date. */
export async function reconcileGarminWorkoutsForDate(
  entries: WorkoutEntry[],
  userEmail: string,
  date: string,
  timeZone: string
): Promise<{ imported: number; deleted: number }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) throw new Error('Google Sheets is not configured');
  const { headers, rows } = await getEmailScopedRowsWithHeaders(sheets, 'Workouts', userEmail);
  const nameColumn = findUniqueHeaderIndex(headers, 'Name', ['name', 'workout', 'workoutname'], 'Workouts');
  const timestampColumn = findUniqueHeaderIndex(headers, 'Created At', ['timestamp', 'timestamputc', 'createdat', 'createdatutc', 'date'], 'Workouts');
  const caloriesColumn = findUniqueHeaderIndex(headers, 'Calories Burnt', ['calories', 'calorieskcal', 'caloriesburnt', 'caloriesburntkcal'], 'Workouts');
  const sourceColumn = findUniqueHeaderIndex(headers, 'Source', ['source'], 'Workouts');
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const localDate = (value: Date) => {
    const parts = dateFormatter.formatToParts(value);
    const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const signature = (name: string, timestamp: string, calories: number) =>
    `${name.trim()}\u0000${new Date(timestamp).toISOString()}\u0000${calories}`;
  const desired = new Map<string, WorkoutEntry>();
  for (const entry of entries) desired.set(signature(entry.name, entry.timestamp, entry.caloriesBurnt), entry);

  const targetRows = rows.filter(({ row }) => {
    if (String(row[sourceColumn] || '').trim() !== 'Garmin Connect') return false;
    const timestamp = new Date(String(row[timestampColumn] || ''));
    return Number.isFinite(timestamp.getTime()) && localDate(timestamp) === date;
  });
  const keptSignatures = new Set<string>();
  const staleRows: number[] = [];
  for (const { row, rowNumber } of targetRows) {
    const timestamp = new Date(String(row[timestampColumn] || ''));
    const key = signature(String(row[nameColumn] || ''), timestamp.toISOString(), Number(row[caloriesColumn]) || 0);
    if (desired.has(key) && !keptSignatures.has(key)) {
      keptSignatures.add(key);
    } else {
      staleRows.push(rowNumber);
    }
  }

  const missing = Array.from(desired.entries()).filter(([key]) => !keptSignatures.has(key)).map(([, entry]) => entry);
  if (missing.length) {
    await appendRowsForUser(sheets, 'Workouts', missing.map((entry) => ({
      name: entry.name, timestamp: new Date(entry.timestamp).toISOString(), calories: entry.caloriesBurnt, source: 'Garmin Connect',
    })), missing[0].user, userEmail);
  }
  if (staleRows.length) {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = metadata.data.sheets?.find((sheet: any) => sheet.properties?.title === 'Workouts')?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) throw new Error('Workouts sheet not found');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [...staleRows].sort((a, b) => b - a).map((rowNumber) => ({
        deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } },
      })) },
    });
  }
  return { imported: missing.length, deleted: staleRows.length };
}

export async function updateProfile(
  p: ProfileUpdate,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  const users = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'User!A2:G' });
  const userRows: any[][] = users.data.values || [];
  const userIndex = userRows.findIndex((row) => String(row[0] || '').trim() === p.userName);
  if (userIndex < 0) throw new Error('User profile not found');
  const userRowNumber = userIndex + 2;
  let planSheet: Awaited<ReturnType<typeof getEmailScopedPlanRows>> | undefined;
  if (p.planRow) {
    planSheet = await getEmailScopedPlanRows(sheets, userEmail);
    const plan = planSheet.rows.find(({ rowNumber }) => rowNumber === p.planRow);
    if (!plan || String(plan.row[1] || '').trim() !== p.userName) throw new Error('Plan does not belong to this account');
  }
  const planData = p.planRow && planSheet
    ? [
        [planSheet.columns.name, p.planName],
        [planSheet.columns.targetWeight, p.targetWeightKg],
        [planSheet.columns.restingCalories, p.restingCalories],
        [planSheet.columns.startDate, p.startDate],
        [planSheet.columns.comment, p.comment || ''],
        [planSheet.columns.status, planStatus(p.startDate)],
      ].map(([column, value]) => ({
        range: `Plan!${columnLetters(Number(column) + 1)}${p.planRow}`,
        values: [[value]],
      }))
    : [];
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `User!A${userRowNumber}:D${userRowNumber}`,
          values: [[p.userName, p.weightKg, p.heightCm, p.workoutsPerWeek]],
        },
        ...planData,
      ],
    },
  });
  return { success: true, isLive: true };
}

const planStatus = (startDate: string) => {
  const ts = new Date(startDate).getTime();
  return !Number.isNaN(ts) && ts <= Date.now() ? 'ACTIVE' : 'INACTIVE';
};

export async function addPlan(p: PlanInput, userEmail: string): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await appendPlanForUser(sheets, p, userEmail);
  return { success: true, isLive: true };
}

// Soft delete: the row stays in the sheet with Status = DELETED and an optional comment.
export async function deletePlan(
  rowNumber: number,
  comment?: string,
  userName?: string,
  userEmail?: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  const planSheet = await getEmailScopedPlanRows(sheets, userEmail || '');
  const selected = planSheet.rows.find(({ rowNumber: actual }) => actual === rowNumber);
  if (!selected) throw new Error('Plan not found');
  if (userName && String(selected.row[1] || '').trim() !== userName) throw new Error('Plan does not belong to this account');

  const existingComment = String(selected.row[5] || '');
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `Plan!${columnLetters(planSheet.columns.comment + 1)}${rowNumber}`, values: [[comment === undefined ? existingComment : comment]] },
        { range: `Plan!${columnLetters(planSheet.columns.status + 1)}${rowNumber}`, values: [['DELETED']] },
      ],
    },
  });
  return { success: true, isLive: true };
}

// Removes a log row. The row is re-read first so a stale row number can never delete the wrong entry.
async function deleteLogRow(
  sheetTitle: 'Food' | 'Workouts',
  rowNumber: number,
  expectedName: string,
  expectedTimestamp: string,
  expectedUser: string | undefined,
  userEmail: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('Invalid row');

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = meta.data.sheets?.find((s: any) => s.properties?.title === sheetTitle)?.properties
    ?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error(`${sheetTitle} sheet not found`);

  const { headers, rows: scopedRows } = await getEmailScopedRowsWithHeaders(sheets, sheetTitle, userEmail);
  const isFood = sheetTitle === 'Food';
  const nameColumn = findUniqueHeaderIndex(headers, isFood ? 'Dish' : 'Name', isFood ? ['dish', 'name', 'food'] : ['name', 'workout', 'workoutname'], sheetTitle);
  const userColumn = findUniqueHeaderIndex(headers, 'User', ['user'], sheetTitle);
  const timestampColumn = findUniqueHeaderIndex(headers, isFood ? 'Timestamp' : 'Created At', ['timestamp', 'timestamputc', 'createdat', 'createdatutc', 'date'], sheetTitle);
  const selected = scopedRows.find(({ rowNumber: actual }) => actual === rowNumber);
  if (!selected) throw new Error('This entry does not belong to this account. Refresh and try again.');
  const row: any[] = selected.row;
  const sameName = String(row[nameColumn] || '').trim() === expectedName.trim();
  const sameUser = !expectedUser || String(row[userColumn] || '').trim() === expectedUser;
  const a = new Date(String(row[timestampColumn] || '')).getTime();
  const b = new Date(expectedTimestamp).getTime();
  const sameTime = Number.isNaN(a) || Number.isNaN(b) ? true : a === b;
  if (!sameName || !sameTime || !sameUser) throw new Error('This entry has changed or does not belong to this account. Refresh and try again.');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
  return { success: true, isLive: true };
}

export const deleteMealLog = (id: string, dish: string, timestamp: string, userName: string | undefined, userEmail: string) =>
  deleteLogRow('Food', Number(id) + 1, dish, timestamp, userName, userEmail);

export const deleteWorkout = (id: string, name: string, timestamp: string, userName: string | undefined, userEmail: string) =>
  deleteLogRow('Workouts', Number(id) + 1, name, timestamp, userName, userEmail);

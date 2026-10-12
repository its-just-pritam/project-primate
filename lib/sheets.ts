import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import {
  MealLogEntry,
  Recipe,
  DEFAULT_RECIPES,
  PlanAnalytics,
  Micronutrients,
  DishIngredient,
  EMPTY_MICROS,
  WorkoutEntry,
  ProfileUpdate,
  PlanInput,
  PlanSummary,
} from '@/types/nutrition';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID || '1JcGmHgvQA7jQEqryYJu1wINirAc-r9EA0fd5FUa4vIU';

// Bypass local SSL inspection/proxy certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function getGoogleSheetsClient() {
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
async function getDishCatalog(sheets: any): Promise<{
  dishMap: Record<string, DishNutrition>;
  recipes: Recipe[];
  ingredientNames: string[];
}> {
  try {
    const [ingRes, recRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Ingredients!A2:N',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Recipe!A2:C',
      }),
    ]);

    const ingRows = ingRes.data.values || [];
    const recRows = recRes.data.values || [];

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

    return { dishMap, recipes, ingredientNames: Object.keys(ingMap).sort((a, b) => a.localeCompare(b)) };
  } catch (err) {
    console.error('Error resolving dish catalog from Recipe & Ingredients:', err);
    // Fallback to defaults
    const fallbackMap: Record<string, DishNutrition> = {};
    DEFAULT_RECIPES.forEach((r) => {
      fallbackMap[r.name] = {
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        micros: { ...EMPTY_MICROS },
        ingredients: [],
      };
    });
    return { dishMap: fallbackMap, recipes: DEFAULT_RECIPES, ingredientNames: [] };
  }
}

export async function fetchRecipes(): Promise<{
  recipes: Recipe[];
  ingredientNames: string[];
  isLive: boolean;
}> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return { recipes: DEFAULT_RECIPES, ingredientNames: [], isLive: false };
  }

  const { recipes, ingredientNames } = await getDishCatalog(sheets);
  return {
    recipes: recipes.length > 0 ? recipes : DEFAULT_RECIPES,
    ingredientNames,
    isLive: true,
  };
}

export async function fetchMealLogs(): Promise<{ logs: MealLogEntry[]; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return {
      logs: [
        {
          id: '1',
          dish: 'Egg Dosa',
          portion: 2,
          calories: 650,
          protein: 38,
          carbs: 48,
          fats: 35,
          timestamp: '2026-10-12T06:56:11Z',
          user: 'Pritam Mallick',
        },
      ],
      isLive: false,
    };
  }

  try {
    const [{ dishMap }, foodRes] = await Promise.all([
      getDishCatalog(sheets),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Food!A2:D',
      }),
    ]);

    const rows = foodRes.data.values || [];
    const logs: MealLogEntry[] = rows.map((row: any[], index: number) => {
      const dish = String(row[0] || '').trim();
      const portion = parseFloat(row[1]) || 1;
      const timestamp = String(row[2] || new Date().toISOString());
      const user = String(row[3] || 'Pritam Mallick');

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
  entry: MealLogEntry
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    console.warn('Google Sheets credentials not set. Simulated log entry.');
    return { success: true, isLive: false };
  }

  // Append ONLY raw input fields: [Dish, Portion, Timestamp, User]
  const values = [
    [
      entry.dish,
      entry.portion,
      entry.timestamp || new Date().toISOString(),
      entry.user || 'Pritam Mallick',
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Food!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });

  return { success: true, isLive: true };
}

export async function appendRecipe(
  dish: string,
  items: { ingredient: string; quantity: number }[]
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return { success: true, isLive: false };
  }

  // One row per ingredient: Dish | Ingredient | Quantity
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Recipe!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: items.map((i) => [dish, i.ingredient, i.quantity]),
    },
  });
  return { success: true, isLive: true };
}

export async function updateRecipe(
  dish: string,
  items: { ingredient: string; quantity: number }[]
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: true, isLive: false };
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Recipe!A2:C',
  });
  const rows: any[][] = res.data.values || [];
  const firstIdx = rows.findIndex((r) => String(r[0] || '').trim() === dish);
  if (firstIdx === -1) {
    throw new Error(`Recipe "${dish}" was not found`);
  }

  // Replace the dish's rows in place, keeping every other recipe untouched.
  const newRows = items.map((i) => [dish, i.ingredient, i.quantity]);
  const result: any[][] = [];
  rows.forEach((r, idx) => {
    if (String(r[0] || '').trim() === dish) {
      if (idx === firstIdx) result.push(...newRows);
    } else {
      result.push([r[0] ?? '', r[1] ?? '', r[2] ?? '']);
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Recipe!A2:C${result.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: result },
  });
  if (result.length < rows.length) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Recipe!A${result.length + 2}:C${rows.length + 1}`,
    });
  }
  return { success: true, isLive: true };
}

export async function fetchPlanAnalytics(): Promise<{
  plan: PlanAnalytics;
  activePlans: PlanAnalytics[];
  isLive: boolean;
}> {
  const sheets = getGoogleSheetsClient();

  const fallbackPlan: PlanAnalytics = {
    planName: 'Cut 2026',
    userName: 'Pritam Mallick',
    currentWeight: 83,
    targetWeight: 75,
    restingCalories: 2100,
    totalCalorieBurnt: 5250,
    totalCalorieConsumed: 3964,
    totalCalorieDeficit: 1286,
    averageCalorieDeficit: 643,
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
    const [planRes, userRes, workoutsRes, mealLogsData] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Plan!A2:G',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'User!A2:E2',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Workouts!A2:D',
      }),
      fetchMealLogs(),
    ]);

    const allPlanRows: any[][] = planRes.data.values || [];
    const planEntries = allPlanRows
      .map((row, i) => ({ row, rowNumber: i + 2 }))
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
    const planSummaries = allPlanRows.map((r, i) => {
      const deleted = String(r[6] || '').trim().toUpperCase() === 'DELETED';
      return {
        rowNumber: i + 2,
        name: String(r[0] || ''),
        targetWeight: parseFloat(r[2]) || 0,
        restingCalories: parseFloat(r[3]) || 0,
        startDate: String(r[4] || ''),
        comment: String(r[5] || ''),
        status: (deleted ? 'DELETED' : isStarted(r) ? 'ACTIVE' : 'INACTIVE') as PlanSummary['status'],
        isActive: activeRowNumbers.has(i + 2),
      };
    });    const userRow = userRes.data.values?.[0] || [];

    if (activeIdx < 0) {
      return {
        plan: {
          ...fallbackPlan,
          planName: '',
          userName: String(userRow[0] || fallbackPlan.userName),
          currentWeight: parseFloat(userRow[1]) || fallbackPlan.currentWeight,
          targetWeight: 0,
          restingCalories: 0,
          totalCalorieBurnt: 0,
          totalCalorieConsumed: 0,
          totalCalorieDeficit: 0,
          averageCalorieDeficit: 0,
          projectedDate: '',
          daysElapsed: 0,
          daysRemaining: 0,
          progressPercent: 0,
          workoutCaloriesByDate: {},
          heightCm: parseFloat(userRow[2]) || 0,
          workoutsPerWeek: parseFloat(userRow[3]) || 0,
          avatar: String(userRow[4] || '').trim() || undefined,
          startDate: '',
          plans: planSummaries,
          hasPlan: false,
        },
        activePlans: [],
        isLive: true,
      };
    }
    const workoutRows = workoutsRes.data.values || [];
    const mealLogs = mealLogsData.logs || [];

    const buildPlan = (planRow: any[]): PlanAnalytics => {
    const planName = String(planRow[0] || 'Cut 2026');
    const userName = String(planRow[1] || 'Pritam Mallick');
    const targetWeight = parseFloat(planRow[2]) || 75;
    const restingCalories = parseFloat(planRow[3]) || 2100;
    const createdAtStr = String(planRow[4] || '2026-10-11T00:00:00Z');
    const currentWeight = parseFloat(userRow[1]) || 83;

    // Calculate days elapsed (from plan creation date)
    const startDate = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const daysElapsed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Only activity since the plan started counts towards the plan
    const startMs = startDate.getTime();
    const totalWorkoutBurnt = workoutRows.reduce((sum: number, row: any[]) => {
      const when = new Date(String(row[2] || '')).getTime();
      if (Number.isNaN(when) || when < startMs) return sum;
      return sum + (parseFloat(row[3]) || 0);
    }, 0);
    const workoutCaloriesByDate: Record<string, number> = {};
    workoutRows.forEach((row: any[]) => {
      const dateValue = String(row[2] || '').trim();
      if (!dateValue) return;

      const parsedDate = new Date(dateValue);
      if (Number.isNaN(parsedDate.getTime())) {
        console.error('Skipping workout row with invalid date:', dateValue);
        return;
      }
      const date = /^\d{4}-\d{2}-\d{2}/.test(dateValue)
        ? dateValue.slice(0, 10)
        : parsedDate.toISOString().split('T')[0];
      const calories = parseFloat(row[3]) || 0;
      workoutCaloriesByDate[date] = (workoutCaloriesByDate[date] || 0) + calories;
    });

    // Total resting calories burnt
    const totalRestingBurnt = daysElapsed * restingCalories;
    const totalCalorieBurnt = Math.round(totalRestingBurnt + totalWorkoutBurnt);

    // Total calories consumed from food (calculated on the fly via Recipe & Ingredients)
    const totalCalorieConsumed = Math.round(
      mealLogs.reduce((sum, item) => {
        const when = new Date(item.timestamp).getTime();
        return !Number.isNaN(when) && when < startMs ? sum : sum + item.calories;
      }, 0)
    );

    // Calorie deficit
    const totalCalorieDeficit = Math.round(totalCalorieBurnt - totalCalorieConsumed);
    const averageCalorieDeficit = Math.round(totalCalorieDeficit / daysElapsed);

    // Weight to lose (8 kg = ~61,600 kcal)
    const weightToLose = Math.max(0, currentWeight - targetWeight);
    const totalDeficitNeeded = weightToLose * 7700;
    const remainingDeficit = Math.max(0, totalDeficitNeeded - totalCalorieDeficit);

    let daysRemaining = 0;
    let projectedDate = 'Target achieved';

    if (remainingDeficit > 0 && averageCalorieDeficit > 0) {
      daysRemaining = Math.ceil(remainingDeficit / averageCalorieDeficit);
      const projDateObj = new Date(Date.now() + daysRemaining * 86400000);
      projectedDate = projDateObj.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (averageCalorieDeficit <= 0) {
      projectedDate = 'Need Calorie Deficit';
      daysRemaining = 0;
    }

    const progressPercent =
      totalDeficitNeeded > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((totalCalorieDeficit / totalDeficitNeeded) * 100))
          )
        : 100;

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
      projectedDate,
      daysElapsed,
      daysRemaining,
      progressPercent,
      workoutCaloriesByDate,
      heightCm: parseFloat(userRow[2]) || 0,
      workoutsPerWeek: parseFloat(userRow[3]) || 0,
      avatar: String(userRow[4] || '').trim() || undefined,
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

export async function fetchWorkouts(): Promise<{ workouts: WorkoutEntry[]; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { workouts: [], isLive: false };

  // Columns: Name, User, Created At (UTC), Calories Burnt (kCal)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Workouts!A2:D',
  });
  const rows: any[][] = res.data.values || [];
  const workouts: WorkoutEntry[] = [];
  rows.forEach((row, index) => {
    const name = String(row[0] || '').trim();
    const timestamp = String(row[2] || '').trim();
    if (!name || Number.isNaN(new Date(timestamp).getTime())) return;
    workouts.push({
      id: String(index + 1),
      name,
      user: String(row[1] || '').trim(),
      timestamp: new Date(timestamp).toISOString(),
      caloriesBurnt: parseFloat(row[3]) || 0,
    });
  });
  return { workouts, isLive: true };
}

export async function appendWorkout(
  entry: WorkoutEntry
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Workouts!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[entry.name, entry.user, entry.timestamp, entry.caloriesBurnt]],
    },
  });
  return { success: true, isLive: true };
}

export async function updateProfile(
  p: ProfileUpdate
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'User!A2:D2',
          values: [[p.userName, p.weightKg, p.heightCm, p.workoutsPerWeek]],
        },
        ...(p.planRow
          ? [
              {
                range: `Plan!A${p.planRow}:G${p.planRow}`,
                values: [[p.planName, p.userName, p.targetWeightKg, p.restingCalories, p.startDate, p.comment || '', planStatus(p.startDate)]],
              },
            ]
          : []),
      ],
    },
  });
  return { success: true, isLive: true };
}

export async function updateAvatar(avatar: string): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'User!E2',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[avatar]] },
  });
  return { success: true, isLive: true };
}

const planStatus = (startDate: string) => {
  const ts = new Date(startDate).getTime();
  return !Number.isNaN(ts) && ts <= Date.now() ? 'ACTIVE' : 'INACTIVE';
};

export async function addPlan(p: PlanInput): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Plan!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[p.planName, p.userName, p.targetWeightKg, p.restingCalories, p.startDate, p.comment || '', planStatus(p.startDate)]],
    },
  });
  return { success: true, isLive: true };
}

// Soft delete: the row stays in the sheet with Status = DELETED and an optional comment.
export async function deletePlan(
  rowNumber: number,
  comment?: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Plan!A2:G',
  });
  const rows: any[][] = current.data.values || [];
  if (rowNumber < 2 || rowNumber > rows.length + 1) throw new Error('Plan not found');

  const existingComment = String(rows[rowNumber - 2]?.[5] || '');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Plan!F${rowNumber}:G${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[comment === undefined ? existingComment : comment, 'DELETED']] },
  });
  return { success: true, isLive: true };
}

// Removes a log row. The row is re-read first so a stale row number can never delete the wrong entry.
async function deleteLogRow(
  sheetTitle: 'Food' | 'Workouts',
  rowNumber: number,
  expectedName: string,
  expectedTimestamp: string
): Promise<{ success: boolean; isLive: boolean }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return { success: true, isLive: false };
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('Invalid row');

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = meta.data.sheets?.find((s: any) => s.properties?.title === sheetTitle)?.properties
    ?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error(`${sheetTitle} sheet not found`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A${rowNumber}:D${rowNumber}`,
  });
  const row: any[] = res.data.values?.[0] || [];
  const sameName = String(row[0] || '').trim() === expectedName.trim();
  const a = new Date(String(row[2] || '')).getTime();
  const b = new Date(expectedTimestamp).getTime();
  const sameTime = Number.isNaN(a) || Number.isNaN(b) ? true : a === b;
  if (!sameName || !sameTime) throw new Error('This entry has changed. Refresh and try again.');

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

export const deleteMealLog = (id: string, dish: string, timestamp: string) =>
  deleteLogRow('Food', Number(id) + 1, dish, timestamp);

export const deleteWorkout = (id: string, name: string, timestamp: string) =>
  deleteLogRow('Workouts', Number(id) + 1, name, timestamp);

export interface Micronutrients {
  calcium: number;
  iron: number;
  potassium: number;
  sodium: number;
  vitaminC: number;
  vitaminB12: number;
  vitaminD: number;
}

export const MICRO_FIELDS: { key: keyof Micronutrients; label: string; unit: string }[] = [
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'IU' },
];

export const EMPTY_MICROS: Micronutrients = {
  calcium: 0,
  iron: 0,
  potassium: 0,
  sodium: 0,
  vitaminC: 0,
  vitaminB12: 0,
  vitaminD: 0,
};

// Nutrition of one ingredient as used in a dish (already scaled to the quantity used).
export interface DishIngredient {
  name: string;
  quantity?: number;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
}

export interface MealLogEntry {
  id?: string;
  dish: string;
  portion: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: string;
  user: string;
  micros?: Micronutrients;
  ingredients?: DishIngredient[];
}

export interface Recipe {
  id: string;
  name: string;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
  isPackaged?: boolean;
  micros?: Micronutrients;
  ingredients?: DishIngredient[];
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface PlanSummary {
  rowNumber: number;
  name: string;
  targetWeight: number;
  restingCalories: number;
  startDate: string;
  comment: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  isActive: boolean; // the started plan currently driving tracking
}

export interface PlanInput {
  planName: string;
  userName: string;
  targetWeightKg: number;
  restingCalories: number;
  startDate: string;
  comment?: string;
}

export interface PlanAnalytics {
  planName: string;
  userName: string;
  currentWeight: number;
  targetWeight: number;
  restingCalories: number;
  totalCalorieBurnt: number;
  totalCalorieConsumed: number;
  totalCalorieDeficit: number;
  averageCalorieDeficit: number;
  totalFatMassChangeGrams: number;
  averageDailyFatMassChangeGrams: number;
  totalMuscleMassChangeGrams: number;
  totalWeightChangeGrams: number;
  averageDailyWeightChangeGrams: number;
  projectedDate: string;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
  workoutCaloriesByDate: Record<string, number>;
  heightCm: number;
  workoutsPerWeek: number;
  avatar?: string;
  startDate: string;
  plans: PlanSummary[];
  hasPlan: boolean;
}

export interface ProfileUpdate {
  userName: string;
  weightKg: number;
  heightCm: number;
  workoutsPerWeek: number;
  planName: string;
  targetWeightKg: number;
  restingCalories: number;
  startDate: string;
  comment?: string;
  planRow?: number;
}

export const DEFAULT_TARGETS: DailyTargets = {
  calories: 2200,
  protein: 150,
  carbs: 220,
  fats: 70,
};

// Initial seeded recipes from your Google Sheet
export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'egg-dosa',
    name: 'Egg Dosa',
    servingUnit: '1 dosa',
    calories: 325,
    protein: 19,
    carbs: 24,
    fats: 17.5,
    category: 'breakfast',
  },
  {
    id: 'chicken-keema-potatoes',
    name: 'Chicken Keema and Baked Potatoes',
    servingUnit: '1 portion',
    calories: 724,
    protein: 74.75,
    carbs: 45.75,
    fats: 24.9,
    category: 'dinner',
  },
  {
    id: 'protein-shake',
    name: 'Protein Shake',
    servingUnit: '1 scoop / shake',
    calories: 320,
    protein: 60,
    carbs: 4,
    fats: 6,
    category: 'snack',
  },
];

export interface WorkoutEntry {
  id?: string;
  name: string;
  caloriesBurnt: number;
  timestamp: string;
  user: string;
}

const FAT_TISSUE_ENERGY_DENSITY = 7.7;
const PROTEIN_TEF_RATE = 0.2;
const FAT_TEF_RATE = 0.03;
const CARBOHYDRATE_TEF_RATE = 0.08;
const PROTEIN_FIRST_PASS_OXIDATION = 0.35;
const BASAL_PROTEIN_LOSS_PER_KG = 0.34;
const EXERCISE_PROTEIN_OXIDATION_PER_KCAL = 0.0125;
const DEFICIT_PROTEIN_CATABOLISM_PER_KCAL = 0.05;
const MAX_DEFICIT_PROTEIN_CATABOLISM_G = 25;
const WET_MUSCLE_MASS_PER_DRY_PROTEIN = 5;

export interface DailyBodyCompositionInputs {
  weightKg: number;
  proteinG: number;
  carbohydrateG: number;
  dietaryFatG: number;
  calorieIntake: number;
  workoutCalories: number;
  restingCalories: number;
}

export const calculateThermicEffectOfFood = ({
  proteinG,
  carbohydrateG,
  dietaryFatG,
}: Pick<DailyBodyCompositionInputs, 'proteinG' | 'carbohydrateG' | 'dietaryFatG'>) =>
  proteinG * 4 * PROTEIN_TEF_RATE +
  dietaryFatG * 9 * FAT_TEF_RATE +
  carbohydrateG * 4 * CARBOHYDRATE_TEF_RATE;

export const calculateDailyFatMassChangeGrams = ({
  proteinG,
  carbohydrateG,
  dietaryFatG,
  calorieIntake,
  workoutCalories,
  restingCalories,
}: DailyBodyCompositionInputs) => {
  const thermicEffectOfFood = calculateThermicEffectOfFood({
    proteinG,
    carbohydrateG,
    dietaryFatG,
  });
  const energyBalance =
    calorieIntake - restingCalories - workoutCalories - thermicEffectOfFood;

  return energyBalance / FAT_TISSUE_ENERGY_DENSITY;
};

export const calculateDailyWetMuscleMassChangeGrams = ({
  weightKg,
  proteinG,
  carbohydrateG,
  dietaryFatG,
  calorieIntake,
  workoutCalories,
  restingCalories,
}: DailyBodyCompositionInputs) => {
  const thermicEffectOfFood = calculateThermicEffectOfFood({
    proteinG,
    carbohydrateG,
    dietaryFatG,
  });
  const totalEnergyExpenditure = restingCalories + workoutCalories + thermicEffectOfFood;
  const energyDeficit = Math.max(0, totalEnergyExpenditure - calorieIntake);
  const availableProtein = (1 - PROTEIN_FIRST_PASS_OXIDATION) * proteinG;
  const basalProteinLoss = BASAL_PROTEIN_LOSS_PER_KG * weightKg;
  const exerciseProteinOxidation =
    EXERCISE_PROTEIN_OXIDATION_PER_KCAL *
    workoutCalories *
    (1 + workoutCalories / restingCalories);
  const deficitProteinCatabolism = Math.min(
    DEFICIT_PROTEIN_CATABOLISM_PER_KCAL * energyDeficit,
    MAX_DEFICIT_PROTEIN_CATABOLISM_G
  );
  const dryProteinMassChange =
    availableProtein - basalProteinLoss - exerciseProteinOxidation - deficitProteinCatabolism;

  return dryProteinMassChange * WET_MUSCLE_MASS_PER_DRY_PROTEIN;
};

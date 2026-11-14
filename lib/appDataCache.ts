import type { MealLogEntry, PlanAnalytics, Recipe, WorkoutEntry } from '@/types/nutrition';

const DATABASE_NAME = 'platito-app-data';
const STORE_NAME = 'user-snapshots';
const DATABASE_VERSION = 1;

export type AppDataSnapshot = {
  logs: MealLogEntry[];
  workouts: WorkoutEntry[];
  recipes: Recipe[];
  packaged: Recipe[];
  ingredientNames: string[];
  ingredientUnits: Record<string, { baseQuantity: number; unit: string }>;
  plan: PlanAnalytics | null;
  activePlans: PlanAnalytics[];
  onboardingStep: number | null;
};

type StoredSnapshot = { userKey: string; savedAt: number; data: AppDataSnapshot };

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'userKey' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the local data cache.'));
    request.onblocked = () => reject(new Error('The local data cache is blocked by another tab.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

export async function readAppDataCache(userKey: string): Promise<AppDataSnapshot | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(userKey);
    request.onsuccess = () => resolve((request.result as StoredSnapshot | undefined)?.data ?? null);
    request.onerror = () => reject(request.error || new Error('Could not read the local data cache.'));
  });
}

export async function writeAppDataCache(userKey: string, data: AppDataSnapshot) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ userKey, savedAt: Date.now(), data } satisfies StoredSnapshot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not update the local data cache.'));
    transaction.onabort = () => reject(transaction.error || new Error('The local data cache update was aborted.'));
  });
}

export async function clearAppDataCache(userKey: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(userKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not clear the local data cache.'));
    transaction.onabort = () => reject(transaction.error || new Error('The local data cache clear was aborted.'));
  });
}

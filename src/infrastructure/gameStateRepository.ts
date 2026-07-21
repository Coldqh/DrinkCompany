import { createInitialState, migrateGameState, type GameState } from '../domain/game';

const DATABASE_NAME = 'drink-company';
const DATABASE_VERSION = 1;
const STORE_NAME = 'game-state';
const STATE_KEY = 'primary';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть локальное сохранение'));
  });
}

export async function loadGameState(): Promise<GameState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result ? migrateGameState(request.result) : createInitialState());
    request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать сохранение'));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveGameState(state: GameState): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Не удалось сохранить игру'));
  });
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function parseGameState(serialized: string): GameState {
  try {
    const parsed = JSON.parse(serialized) as { schemaVersion?: number };
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3 && parsed.schemaVersion !== 4 && parsed.schemaVersion !== 5) throw new Error('Файл не является сохранением Drink Company');
    const migrated = migrateGameState(parsed);
    return migrated;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Файл сохранения повреждён');
    throw error;
  }
}

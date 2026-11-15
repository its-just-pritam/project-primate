export type IncomingShare = {
  id: string;
  title: string;
  text: string;
  url: string;
  files: File[];
  receivedAt: number;
};

const DB_NAME = 'platito-shared-content';
const STORE_NAME = 'incoming-shares';
const DB_VERSION = 1;

function openShareDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support local share storage.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open shared content.'));
  });
}

export async function readIncomingShare(id: string): Promise<IncomingShare | null> {
  const database = await openShareDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const share = (request.result as IncomingShare | undefined) ?? null;
      database.close();
      resolve(share);
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error('Could not read shared content.'));
    };
  });
}

export async function deleteIncomingShare(id: string) {
  const database = await openShareDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error || new Error('Could not clear shared content.'));
    transaction.onabort = () => reject(transaction.error || new Error('Clearing shared content was aborted.'));
  });
}

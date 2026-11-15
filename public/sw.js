const DB_NAME = 'platito-shared-content';
const STORE_NAME = 'incoming-shares';
const DB_VERSION = 1;
const MAX_FILES = 8;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function openShareDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open share storage.'));
  });
}

async function saveSharedContent(request) {
  const form = await request.formData();
  const files = form.getAll('files').filter((value) => value instanceof File && value.type.startsWith('image/'));
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const id = crypto.randomUUID();
  const target = new URL('/', self.location.origin);

  if (files.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
    target.searchParams.set('shareError', 'size');
    return Response.redirect(target.href, 303);
  }

  const item = {
    id,
    title: String(form.get('title') || '').slice(0, 500),
    text: String(form.get('text') || '').slice(0, 20000),
    url: String(form.get('url') || '').slice(0, 4000),
    files,
    receivedAt: Date.now(),
  };
  const database = await openShareDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(item);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Could not save shared content.'));
    transaction.onabort = () => reject(transaction.error || new Error('Saving shared content was aborted.'));
  });
  database.close();
  target.searchParams.set('shared', id);
  return Response.redirect(target.href, 303);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/share-target') return;
  event.respondWith(saveSharedContent(event.request).catch(() => {
    const target = new URL('/', self.location.origin);
    target.searchParams.set('shareError', 'save');
    return Response.redirect(target.href, 303);
  }));
});

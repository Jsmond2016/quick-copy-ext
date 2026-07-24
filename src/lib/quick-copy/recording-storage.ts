const DATABASE_NAME = 'quick-copy-recordings';
const STORE_NAME = 'recordings';

interface StoredRecording {
  id: string;
  blob: Blob;
  savedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地录屏存储。'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('本地录屏存储失败。'));
    transaction.onabort = () => reject(transaction.error ?? new Error('本地录屏存储已取消。'));
  });
}

export async function saveRecordingPreview(id: string, blob: Blob): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    store.put({ id, blob, savedAt: Date.now() } satisfies StoredRecording);
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function getRecordingPreview(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    const stored = await new Promise<StoredRecording | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredRecording | undefined);
      request.onerror = () => reject(request.error ?? new Error('读取本地录屏失败。'));
    });
    return stored?.blob instanceof Blob ? stored.blob : null;
  } finally {
    database.close();
  }
}

export async function clearRecordingPreview(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}

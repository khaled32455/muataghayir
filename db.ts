
import { FontRecord } from './types';

const DB_NAME = 'CertificateGeneratorDB';
const FONT_STORE_NAME = 'fonts';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(FONT_STORE_NAME)) {
        dbInstance.createObjectStore(FONT_STORE_NAME, { keyPath: 'name' });
      }
    };
  });
};

export const saveFont = async (font: FontRecord): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FONT_STORE_NAME);
    const request = store.put(font);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error saving font:', request.error);
      reject(request.error);
    };
  });
};

export const getFonts = async (): Promise<FontRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE_NAME], 'readonly');
    const store = transaction.objectStore(FONT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as FontRecord[]);
    request.onerror = () => {
      console.error('Error getting fonts:', request.error);
      reject(request.error);
    };
  });
};

export const deleteFont = async (fontName: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FONT_STORE_NAME);
    const request = store.delete(fontName);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error deleting font:', request.error);
      reject(request.error);
    };
  });
};

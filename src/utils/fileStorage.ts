// IndexedDB persistent file storage for UCW Workshop Planner
// Allows storing slides, PDFs, datasets, and guides of any size persistently in the browser

const DB_NAME = 'ucw_workshop_planner_db';
const DB_VERSION = 1;
const STORE_FILES = 'materials_files';
const STORE_METADATA = 'materials_metadata';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const fileStorage = {
  // Save a physical file/blob to IndexedDB
  saveFile: async (id: string, file: File | Blob): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        const req = store.put(file, id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not save file to IndexedDB:', err);
    }
  },

  // Retrieve a file/blob from IndexedDB and return an object URL or data URL
  getFileUrl: async (id: string): Promise<string | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const req = store.get(id);
        req.onsuccess = () => {
          const fileOrBlob = req.result;
          if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
            resolve(URL.createObjectURL(fileOrBlob));
          } else if (typeof fileOrBlob === 'string') {
            resolve(fileOrBlob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not retrieve file from IndexedDB:', err);
      return null;
    }
  },

  // Retrieve the raw File / Blob from IndexedDB
  getFileBlob: async (id: string): Promise<Blob | File | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result;
          if (res instanceof Blob || res instanceof File) {
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not get blob from IndexedDB:', err);
      return null;
    }
  },

  // Save metadata to local IndexedDB store
  saveMetadata: async (metadata: any): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_METADATA, 'readwrite');
        const store = tx.objectStore(STORE_METADATA);
        const req = store.put(metadata);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not save metadata to IndexedDB:', err);
    }
  },

  // Get all metadata records from IndexedDB
  getAllMetadata: async (): Promise<any[]> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_METADATA, 'readonly');
        const store = tx.objectStore(STORE_METADATA);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not get metadata from IndexedDB:', err);
      return [];
    }
  },

  // Delete a file and its metadata from IndexedDB
  deleteFile: async (id: string): Promise<void> => {
    try {
      const db = await openDB();
      const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
      tx.objectStore(STORE_FILES).delete(id);
      tx.objectStore(STORE_METADATA).delete(id);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Could not delete file from IndexedDB:', err);
    }
  },
};

import { Estimate, ProfileCatalog, ProfileMeta } from '../types';

const DB_NAME = 'SmetaProDB';
const DB_VERSION = 1;
const ESTIMATES_STORE = 'estimates';
const PROFILES_STORE = 'cached_profiles';
const ACTIVE_ESTIMATE_KEY = 'smetapro_active_estimate_id';
const LOCALSTORAGE_ESTIMATES_KEY = 'smetapro_estimates_v1';
const LOCALSTORAGE_PROFILES_KEY = 'smetapro_profiles_v1';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean;

  constructor() {
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    if (this.isIndexedDBAvailable) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(ESTIMATES_STORE)) {
            const store = db.createObjectStore(ESTIMATES_STORE, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(PROFILES_STORE)) {
            db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to localStorage');
          this.isIndexedDBAvailable = false;
          reject(request.error);
        };
      } catch (err) {
        console.warn('IndexedDB error, falling back to localStorage', err);
        this.isIndexedDBAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  // --- Estimates Storage ---

  async saveEstimate(estimate: Estimate): Promise<void> {
    estimate.updatedAt = Date.now();

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readwrite');
          const store = tx.objectStore(ESTIMATES_STORE);
          const req = store.put(estimate);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        // Also keep sync in localStorage fallback
        this.saveToLocalStorageEstimates(estimate);
        return;
      } catch (err) {
        console.warn('IndexedDB save failed, using localStorage fallback', err);
      }
    }

    this.saveToLocalStorageEstimates(estimate);
  }

  async getEstimate(id: string): Promise<Estimate | null> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const item = await new Promise<Estimate | null>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readonly');
          const store = tx.objectStore(ESTIMATES_STORE);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (item) return item;
      } catch (err) {
        console.warn('IndexedDB get failed, checking localStorage fallback', err);
      }
    }

    const all = this.getFromLocalStorageEstimates();
    return all.find((e) => e.id === id) || null;
  }

  async getAllEstimates(): Promise<Estimate[]> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const items = await new Promise<Estimate[]>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readonly');
          const store = tx.objectStore(ESTIMATES_STORE);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        if (items && items.length > 0) {
          // Sort descending by updatedAt
          return items.sort((a, b) => b.updatedAt - a.updatedAt);
        }
      } catch (err) {
        console.warn('IndexedDB getAll failed, reading localStorage', err);
      }
    }

    const fromStorage = this.getFromLocalStorageEstimates();
    return fromStorage.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteEstimate(id: string): Promise<void> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readwrite');
          const store = tx.objectStore(ESTIMATES_STORE);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('IndexedDB delete failed', err);
      }
    }

    const estimates = this.getFromLocalStorageEstimates().filter((e) => e.id !== id);
    try {
      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(estimates));
    } catch (e) {
      console.error(e);
    }
  }

  // --- LocalStorage helpers for estimates ---

  private getFromLocalStorageEstimates(): Estimate[] {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorageEstimates(estimate: Estimate): void {
    try {
      const all = this.getFromLocalStorageEstimates();
      const idx = all.findIndex((e) => e.id === estimate.id);
      if (idx >= 0) {
        all[idx] = estimate;
      } else {
        all.push(estimate);
      }
      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }

  // --- Active Estimate pointer ---

  getActiveEstimateId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_ESTIMATE_KEY);
    } catch {
      return null;
    }
  }

  setActiveEstimateId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_ESTIMATE_KEY, id);
    } catch (e) {
      console.error(e);
    }
  }

  // --- Profile Offline Cache ---

  async saveCachedProfile(profile: ProfileCatalog): Promise<void> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PROFILES_STORE, 'readwrite');
          const store = tx.objectStore(PROFILES_STORE);
          const req = store.put(profile);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('Failed to cache profile in IndexedDB', err);
      }
    }

    try {
      const key = `${LOCALSTORAGE_PROFILES_KEY}_${profile.id}`;
      localStorage.setItem(key, JSON.stringify(profile));
    } catch (e) {
      console.warn('LocalStorage profile cache error', e);
    }
  }

  async getCachedProfile(id: string): Promise<ProfileCatalog | null> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const profile = await new Promise<ProfileCatalog | null>((resolve, reject) => {
          const tx = db.transaction(PROFILES_STORE, 'readonly');
          const store = tx.objectStore(PROFILES_STORE);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (profile) return profile;
      } catch (err) {
        console.warn('IndexedDB getCachedProfile failed', err);
      }
    }

    try {
      const raw = localStorage.getItem(`${LOCALSTORAGE_PROFILES_KEY}_${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveCachedProfilesMeta(list: ProfileMeta[]): void {
    try {
      localStorage.setItem('smetapro_profiles_meta_list', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  getCachedProfilesMeta(): ProfileMeta[] | null {
    try {
      const raw = localStorage.getItem('smetapro_profiles_meta_list');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getLastUsedProfileId(): string {
    try {
      return localStorage.getItem('smetapro_last_profile_id') || 'plumbing';
    } catch {
      return 'plumbing';
    }
  }

  setLastUsedProfileId(id: string): void {
    try {
      localStorage.setItem('smetapro_last_profile_id', id);
    } catch (e) {
      console.error(e);
    }
  }
}

export const storage = new StorageService();

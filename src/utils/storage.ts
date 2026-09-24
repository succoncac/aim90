import { AppState } from '../types';
import { STORAGE_KEY } from '../constants';

const DB_NAME = 'AIConsoleMultiproviderDB';
const STORE_NAME = 'app_state';
const STATE_ID = 'current_session';

/**
 * Open IndexedDB for resilient, high-capacity client-side persistence
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save state asynchronously to IndexedDB (and fallback/sync to localStorage)
 */
export async function saveAppState(state: AppState): Promise<void> {
  // 1. Always attempt localStorage first (synchronous & immediate)
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    // Also save a timestamped backup key
    localStorage.setItem(`${STORAGE_KEY}_backup`, json);
  } catch (err) {
    console.warn('localStorage quota exceeded or blocked, relying on IndexedDB:', err);
  }

  // 2. Persist full state into IndexedDB (virtually unlimited quota, survives cache clears)
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    // Non-fatal if IndexedDB fails (e.g. strict incognito mode)
    console.warn('IndexedDB write warning:', idbErr);
  }
}

/**
 * Load state asynchronously from IndexedDB or localStorage
 */
export async function loadAppState(): Promise<Partial<AppState> | null> {
  // 1. Try reading from IndexedDB first (most resilient and complete)
  try {
    const db = await openIndexedDB();
    const idbState = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (idbState && typeof idbState === 'object') {
      return idbState;
    }
  } catch (idbErr) {
    console.warn('IndexedDB read warning:', idbErr);
  }

  // 2. Fallback to localStorage primary key
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (lsErr) {
    console.warn('localStorage read warning:', lsErr);
  }

  // 3. Fallback to localStorage backup key
  try {
    const backup = localStorage.getItem(`${STORAGE_KEY}_backup`);
    if (backup) {
      return JSON.parse(backup);
    }
  } catch (bkErr) {
    console.warn('localStorage backup read warning:', bkErr);
  }

  return null;
}

/**
 * Clear all persistent state across both storages
 */
export async function clearAllAppState(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_backup`);
  } catch {}

  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {}
}

/**
 * Export state as downloadable JSON file
 */
export function exportStateAsJson(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-console-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import state from a JSON file hoặc file HTML gộp (HTML bundle)
 */
export function importStateFromJson(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        let jsonStr = text;

        // Nếu là file HTML gộp, trích xuất chuỗi JSON từ thẻ <script id="ai-app-state-data">
        if (file.name.endsWith('.html') || text.includes('id="ai-app-state-data"') || text.includes('<!DOCTYPE html>')) {
          const match = text.match(/<script\s+id=["']ai-app-state-data["'][\s\S]*?>([\s\S]*?)<\/script>/i);
          if (match && match[1]) {
            jsonStr = match[1].trim();
          } else {
            throw new Error('Không tìm thấy khối dữ liệu sao lưu hợp lệ trong file HTML này');
          }
        }

        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Cấu trúc dữ liệu không hợp lệ');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err?.message || 'Dữ liệu không hợp lệ hoặc file bị lỗi'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsText(file);
  });
}


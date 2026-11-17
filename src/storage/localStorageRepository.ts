import type { AppData } from '@/domain/types';
import type { Repository } from './repository';
import { normalizeAppData } from './schema';

export const STORAGE_KEY = 'suivi-candidatures:v1';
const BACKUP_KEY = `${STORAGE_KEY}:backup`;

export class LocalStorageRepository implements Repository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): AppData | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeAppData(JSON.parse(raw));
    } catch (err) {
      // Données corrompues : on les met de côté plutôt que de les perdre.
      console.error('Données locales illisibles, sauvegarde conservée sous', BACKUP_KEY, err);
      this.storage.setItem(BACKUP_KEY, raw);
      return null;
    }
  }

  save(data: AppData): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }

  subscribe(onExternalChange: (data: AppData) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const data = this.load();
      if (data) onExternalChange(data);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

/** Repli en mémoire (navigation privée stricte, tests...). */
export class MemoryRepository implements Repository {
  private data: AppData | null = null;
  load() {
    return this.data;
  }
  save(data: AppData) {
    this.data = structuredClone(data);
  }
  clear() {
    this.data = null;
  }
}

export function createDefaultRepository(): Repository {
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return new LocalStorageRepository();
  } catch {
    return new MemoryRepository();
  }
}

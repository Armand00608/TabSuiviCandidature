import type { AppData } from '@/domain/types';

/**
 * Abstraction de la persistance. L'application ne dépend que de cette
 * interface : on peut remplacer le stockage local par une API / Supabase /
 * Firebase en écrivant une nouvelle implémentation, sans toucher à l'UI.
 */
export interface Repository {
  /** Renvoie `null` s'il n'existe encore aucune donnée. */
  load(): AppData | null;
  save(data: AppData): void;
  clear(): void;
  /**
   * Optionnel : notifie quand les données changent ailleurs (autre onglet,
   * autre appareil...). Renvoie une fonction de désabonnement.
   */
  subscribe?(onExternalChange: (data: AppData) => void): () => void;
}

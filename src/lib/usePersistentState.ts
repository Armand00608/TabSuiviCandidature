import { useEffect, useState } from 'react';

/** `useState` mémorisé dans le navigateur (préférences d'affichage uniquement). */
export function usePersistentState<T>(key: string, initial: T) {
  const storageKey = `suivi-candidatures:pref:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* stockage indisponible : préférence non mémorisée */
    }
  }, [storageKey, value]);
  return [value, setValue] as const;
}

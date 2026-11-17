import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * L'ouverture d'une fiche est portée par l'URL (`?app=<id>`) : le lien est
 * partageable / mis en favori et le bouton "retour" du navigateur la ferme.
 */
export function useOpenApplication() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('app');
  const open = useCallback(
    (id: string) =>
      setParams((p) => {
        p.set('app', id);
        return p;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams((p) => {
        p.delete('app');
        return p;
      }),
    [setParams],
  );
  return { openId, open, close };
}

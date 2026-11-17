import { useRef } from 'react';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { downloadFile } from '@/lib/download';

export function DataPage() {
  const store = useStore();
  const notify = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    downloadFile(`suivi-candidatures-sauvegarde-${store.today}.json`, JSON.stringify(store.data, null, 2), 'application/json');
    notify('Sauvegarde téléchargée');
  };

  const importJson = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (!window.confirm('Remplacer TOUTES les données actuelles par celles de ce fichier ?')) return;
      store.importData(json);
      notify('Sauvegarde restaurée');
    } catch (err) {
      window.alert(`Import impossible : ${err instanceof Error ? err.message : 'fichier invalide'}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    if (!window.confirm('Remplacer toutes les données par le suivi de stage de départ ? Les données actuelles seront perdues.')) return;
    store.resetToDemo();
    notify('Données réinitialisées');
  };

  const total = store.data.applications.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sauvegarde & données</h1>
          <p className="muted">
            {store.trackers.length} suivi(s), {total} candidature(s).
          </p>
        </div>
      </div>

      <section className="card card-pad section">
        <h2 style={{ marginBottom: 8 }}>Où sont mes données ?</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Tout est enregistré automatiquement <strong>dans ce navigateur</strong> (aucun compte, aucun serveur). Pour passer sur un autre
          ordinateur ou par sécurité, exportez régulièrement une sauvegarde et réimportez-la où vous voulez.
        </p>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={exportJson}>
            ⤒ Télécharger une sauvegarde (.json)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⤓ Restaurer une sauvegarde
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </section>

      <section className="card card-pad section">
        <h2 style={{ marginBottom: 8 }}>Réinitialiser</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Recharge le suivi « Stage 2027 » d’origine et efface le reste.</p>
        <button className="btn btn-danger" onClick={reset}>
          Réinitialiser les données
        </button>
      </section>
    </>
  );
}

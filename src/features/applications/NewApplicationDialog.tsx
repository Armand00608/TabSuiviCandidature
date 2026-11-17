import { useState } from 'react';
import type { Tracker } from '@/domain/types';
import { useStore } from '@/state/store';
import { Overlay } from '@/components/Overlay';
import { useToast } from '@/components/Toast';
import { ApplicationForm, emptyDraft } from './ApplicationForm';

export function NewApplicationDialog({ tracker, onClose }: { tracker: Tracker; onClose: () => void }) {
  const store = useStore();
  const notify = useToast();
  const [draft, setDraft] = useState(() => emptyDraft(tracker));
  const [addAnother, setAddAnother] = useState(false);

  const submit = () => {
    if (!draft.company.trim()) return;
    store.addApplication(tracker.id, draft);
    notify(`« ${draft.company} » ajoutée`);
    if (addAnother) setDraft({ ...emptyDraft(tracker), type: draft.type, city: draft.city });
    else onClose();
  };

  return (
    <Overlay
      title={`Nouvelle candidature · ${tracker.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <label className="checkbox left small">
            <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} />
            Enchaîner avec une autre
          </label>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={!draft.company.trim()} onClick={submit}>
            Ajouter
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ApplicationForm tracker={tracker} draft={draft} onChange={setDraft} />
        <button type="submit" hidden />
      </form>
    </Overlay>
  );
}

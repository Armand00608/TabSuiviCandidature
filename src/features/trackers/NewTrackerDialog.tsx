import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrackerKind } from '@/domain/types';
import { TRACKER_TEMPLATES } from '@/domain/templates';
import { useStore } from '@/state/store';
import { Overlay } from '@/components/Overlay';
import { Field } from '@/components/Field';

const KINDS = Object.keys(TRACKER_TEMPLATES) as TrackerKind[];

export function NewTrackerDialog({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const [kind, setKind] = useState<TrackerKind>('alternance');
  const [name, setName] = useState('');
  const template = TRACKER_TEMPLATES[kind];

  const submit = () => {
    const tracker = store.createTracker(kind, name || template.label);
    onClose();
    navigate(`/suivi/${tracker.id}`);
  };

  return (
    <Overlay
      title="Nouveau suivi"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Créer le suivi
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <div className="field">
            <span>Type de recherche</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 6 }}>
            {KINDS.map((k) => {
              const t = TRACKER_TEMPLATES[k];
              return (
                <button
                  type="button"
                  key={k}
                  className="card"
                  onClick={() => setKind(k)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                    borderColor: k === kind ? t.color : undefined,
                    boxShadow: k === kind ? `0 0 0 2px ${t.color}` : undefined,
                  }}
                >
                  <strong>
                    <span className="dot" style={{ background: t.color, display: 'inline-block', marginRight: 6 }} />
                    {t.label}
                  </strong>
                  <div className="muted small">{t.description}</div>
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Nom du suivi" hint="Ex. « Alternance 2027-2028 », « Stage été »">
          <input className="input" value={name} placeholder={template.label} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="info-box">
          <strong>Inclus :</strong> {template.statuses.length} statuts ({template.statuses.map((s) => s.label).join(', ')})
          {template.customFields.length > 0 && <> · champs : {template.customFields.map((f) => f.label).join(', ')}</>}. Tout est
          personnalisable ensuite.
        </div>
      </form>
    </Overlay>
  );
}

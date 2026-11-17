import type { Application, CustomFieldDef, Tracker } from '@/domain/types';
import type { ApplicationPatch } from '@/domain/automation';
import { Field } from '@/components/Field';

/** Champs éditables d'une candidature (brouillon contrôlé par le parent). */
export type Draft = Required<
  Pick<
    ApplicationPatch,
    'company' | 'city' | 'type' | 'position' | 'contactName' | 'contactInfo' | 'statusId' | 'sentAt' | 'dueDate' | 'nextAction' | 'link' | 'notes' | 'custom'
  >
>;

export function draftFrom(app: Application): Draft {
  return {
    company: app.company,
    city: app.city,
    type: app.type,
    position: app.position,
    contactName: app.contactName,
    contactInfo: app.contactInfo,
    statusId: app.statusId,
    sentAt: app.sentAt,
    dueDate: app.dueDate,
    nextAction: app.nextAction,
    link: app.link,
    notes: app.notes,
    custom: { ...app.custom },
  };
}

export function emptyDraft(tracker: Tracker): Draft {
  return {
    company: '',
    city: '',
    type: tracker.applicationTypes[0] ?? '',
    position: '',
    contactName: '',
    contactInfo: '',
    statusId: tracker.statuses[0]?.id ?? '',
    sentAt: null,
    dueDate: null,
    nextAction: '',
    link: '',
    notes: '',
    custom: {},
  };
}

/** Ne garde que les champs modifiés, pour un historique précis. */
export function diffDraft(app: Application, draft: Draft): ApplicationPatch {
  const original = draftFrom(app);
  const patch: ApplicationPatch = {};
  for (const key of Object.keys(draft) as (keyof Draft)[]) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(original[key])) {
      (patch as Record<string, unknown>)[key] = draft[key];
    }
  }
  return patch;
}

function CustomInput({ field, value, onChange }: { field: CustomFieldDef; value: string; onChange: (v: string) => void }) {
  switch (field.type) {
    case 'longtext':
      return <textarea className="textarea" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return (
        <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
          {value && !(field.options ?? []).includes(value) && <option>{value}</option>}
        </select>
      );
    default:
      return (
        <input
          className="input"
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function ApplicationForm({
  tracker,
  draft,
  onChange,
  autoActionHint,
}: {
  tracker: Tracker;
  draft: Draft;
  onChange: (d: Draft) => void;
  /** Suggestion affichée quand l'action est générée automatiquement. */
  autoActionHint?: boolean;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const listId = `types-${tracker.id}`;

  return (
    <div className="form-grid">
      <Field label="Entreprise *">
        <input className="input" required value={draft.company} onChange={(e) => set('company', e.target.value)} autoFocus={!draft.company} />
      </Field>
      <Field label="Ville">
        <input className="input" value={draft.city} onChange={(e) => set('city', e.target.value)} />
      </Field>

      <Field label="Type">
        <input className="input" list={listId} value={draft.type} onChange={(e) => set('type', e.target.value)} />
        <datalist id={listId}>
          {tracker.applicationTypes.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field label="Statut">
        <select className="select" value={draft.statusId} onChange={(e) => set('statusId', e.target.value)}>
          {tracker.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Poste / angle d'approche" className="span-2">
        <input className="input" value={draft.position} onChange={(e) => set('position', e.target.value)} />
      </Field>

      <Field label="Contact">
        <input className="input" value={draft.contactName} placeholder="Nom, rôle" onChange={(e) => set('contactName', e.target.value)} />
      </Field>
      <Field label="Email / LinkedIn du contact">
        <input className="input" value={draft.contactInfo} onChange={(e) => set('contactInfo', e.target.value)} />
      </Field>

      <Field label="Date d'envoi" hint="Les relances sont planifiées à partir de cette date">
        <input className="input" type="date" value={draft.sentAt ?? ''} onChange={(e) => set('sentAt', e.target.value || null)} />
      </Field>
      <Field label="Échéance de la prochaine action">
        <input className="input" type="date" value={draft.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />
      </Field>

      <Field
        label="Prochaine action"
        className="span-2"
        hint={autoActionHint ? '✨ Proposée automatiquement. Écrivez la vôtre pour la remplacer ; videz le champ pour revenir à la suggestion.' : undefined}
      >
        <input className="input" value={draft.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
      </Field>

      <Field label="Lien de l'offre" className="span-2">
        <input className="input" type="url" value={draft.link} placeholder="https://" onChange={(e) => set('link', e.target.value)} />
      </Field>

      {tracker.customFields.map((f) => (
        <Field key={f.id} label={f.label} className={f.type === 'longtext' ? 'span-2' : undefined}>
          <CustomInput field={f} value={draft.custom[f.id] ?? ''} onChange={(v) => set('custom', { ...draft.custom, [f.id]: v })} />
        </Field>
      ))}

      <Field label="Notes" className="span-2">
        <textarea className="textarea" rows={4} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </div>
  );
}

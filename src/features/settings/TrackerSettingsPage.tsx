import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CustomFieldDef, CustomFieldType, StatusCategory, StatusDef, Tone, Tracker } from '@/domain/types';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/status';
import { useStore } from '@/state/store';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { NotFound } from '@/features/layout/NotFound';
import { slugify, uid } from '@/lib/id';

const TONES: { value: Tone; label: string }[] = [
  { value: 'neutral', label: 'Gris' },
  { value: 'info', label: 'Bleu' },
  { value: 'warning', label: 'Orange' },
  { value: 'accent', label: 'Violet' },
  { value: 'success', label: 'Vert' },
  { value: 'danger', label: 'Rouge' },
];

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'longtext', label: 'Texte long' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Nombre' },
  { value: 'url', label: 'Lien' },
  { value: 'select', label: 'Liste de choix' },
];

const CATEGORY_HELP: Record<StatusCategory, string> = {
  todo: 'pas encore envoyée',
  waiting: 'déclenche les relances',
  active: 'échanges en cours',
  positive: 'offre / succès',
  rejected: 'refus (compte comme réponse)',
  closed: 'piste close',
};

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function TrackerSettingsPage() {
  const { trackerId = '' } = useParams();
  const store = useStore();
  const tracker = store.getTracker(trackerId);
  if (!tracker) return <NotFound message="Ce suivi n’existe pas ou a été supprimé." />;
  return <SettingsForm key={tracker.id} tracker={tracker} />;
}

function SettingsForm({ tracker }: { tracker: Tracker }) {
  const store = useStore();
  const notify = useToast();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Tracker>(() => structuredClone(tracker));
  const [typesText, setTypesText] = useState(tracker.applicationTypes.join(', '));
  const usage = store.applicationsOf(tracker.id).reduce<Record<string, number>>((acc, a) => {
    acc[a.statusId] = (acc[a.statusId] ?? 0) + 1;
    return acc;
  }, {});

  const set = (patch: Partial<Tracker>) => setDraft((d) => ({ ...d, ...patch }));
  const setSettings = (patch: Partial<Tracker['settings']>) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const setStatus = (i: number, patch: Partial<StatusDef>) =>
    set({ statuses: draft.statuses.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setField = (i: number, patch: Partial<CustomFieldDef>) =>
    set({ customFields: draft.customFields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Le suivi doit avoir un nom.');
  if (!draft.statuses.length) errors.push('Il faut au moins un statut.');
  if (!draft.statuses.some((s) => s.category === 'waiting')) errors.push('Ajoutez un statut « En attente » pour que les relances fonctionnent.');
  if (draft.statuses.some((s) => !s.label.trim())) errors.push('Chaque statut doit avoir un libellé.');

  const save = () => {
    const applicationTypes = typesText.split(',').map((t) => t.trim()).filter(Boolean);
    store.updateTracker({ ...draft, applicationTypes, customFields: draft.customFields.filter((f) => f.label.trim()) });
    notify('Paramètres enregistrés');
  };

  const removeStatus = (i: number) => {
    const s = draft.statuses[i];
    const n = usage[s.id] ?? 0;
    if (n && !window.confirm(`${n} candidature(s) utilisent « ${s.label} ». Elles passeront au premier statut. Continuer ?`)) return;
    set({ statuses: draft.statuses.filter((_, j) => j !== i) });
  };

  const addStatus = () => {
    const label = 'Nouveau statut';
    let id = slugify(label);
    while (draft.statuses.some((s) => s.id === id)) id = `${slugify(label)}_${uid().slice(0, 4)}`;
    set({ statuses: [...draft.statuses, { id, label, category: 'active', tone: 'accent' }] });
  };

  const deleteTracker = () => {
    const n = store.applicationsOf(tracker.id).length;
    const answer = window.prompt(`Supprimer « ${tracker.name} » et ses ${n} candidature(s) ? Tapez le nom du suivi pour confirmer.`);
    if (answer?.trim() !== tracker.name.trim()) return;
    store.deleteTracker(tracker.id);
    notify('Suivi supprimé');
    navigate('/');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <Link to={`/suivi/${tracker.id}`} className="small">
            ← {tracker.name}
          </Link>
          <h1 style={{ marginTop: 6 }}>Paramètres du suivi</h1>
        </div>
        <div className="page-actions">
          <Link className="btn" to={`/suivi/${tracker.id}`}>
            Annuler
          </Link>
          <button className="btn btn-primary" onClick={save} disabled={errors.length > 0}>
            Enregistrer
          </button>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="warning-box" style={{ marginBottom: 16 }}>
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      <section className="card card-pad section">
        <h2 style={{ marginBottom: 14 }}>Général</h2>
        <div className="form-grid">
          <Field label="Nom">
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Couleur">
            <input className="input" type="color" value={draft.color} onChange={(e) => set({ color: e.target.value })} style={{ height: 36, padding: 3 }} />
          </Field>
          <Field label="Description" className="span-2">
            <input className="input" value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="Types de candidature" hint="Séparés par des virgules" className="span-2">
            <input className="input" value={typesText} onChange={(e) => setTypesText(e.target.value)} />
          </Field>
          <label className="checkbox">
            <input type="checkbox" checked={draft.archived} onChange={(e) => set({ archived: e.target.checked })} />
            Archiver ce suivi (recherche terminée)
          </label>
        </div>
      </section>

      <section className="card card-pad section">
        <h2 style={{ marginBottom: 4 }}>Automatisations</h2>
        <p className="muted small" style={{ marginTop: 0, marginBottom: 14 }}>
          Les relances sont calculées à partir de la date d’envoi puis de la dernière relance.
        </p>
        <div className="form-grid">
          <Field label="Relancer après (jours)">
            <input className="input" type="number" min={1} max={90} value={draft.settings.followUpDelayDays} onChange={(e) => setSettings({ followUpDelayDays: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Nombre maximum de relances">
            <input className="input" type="number" min={0} max={10} value={draft.settings.maxFollowUps} onChange={(e) => setSettings({ maxFollowUps: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
          <Field label="Piste froide après (jours sans réponse)" hint="Compté depuis la dernière relance">
            <input className="input" type="number" min={1} max={180} value={draft.settings.staleAfterDays} onChange={(e) => setSettings({ staleAfterDays: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <div />
          <label className="checkbox span-2">
            <input type="checkbox" checked={draft.settings.autoFillSentDate} onChange={(e) => setSettings({ autoFillSentDate: e.target.checked })} />
            Renseigner la date d’envoi automatiquement quand une candidature passe « en attente »
          </label>
          <label className="checkbox span-2">
            <input type="checkbox" checked={draft.settings.autoNextAction} onChange={(e) => setSettings({ autoNextAction: e.target.checked })} />
            Proposer automatiquement la prochaine action (✨) selon le statut
          </label>
          <label className="checkbox span-2">
            <input type="checkbox" checked={draft.settings.autoCloseStale} onChange={(e) => setSettings({ autoCloseStale: e.target.checked })} />
            Clore automatiquement les pistes froides (sinon elles apparaissent dans « À faire »)
          </label>
        </div>
      </section>

      <section className="card card-pad section">
        <div className="section-title">
          <h2>Statuts</h2>
          <button className="btn btn-sm" onClick={addStatus}>
            ＋ Statut
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          La <strong>catégorie</strong> pilote les automatisations : {CATEGORY_ORDER.map((c) => `${CATEGORY_LABELS[c]} = ${CATEGORY_HELP[c]}`).join(' · ')}.
        </p>
        <div className="list-editor">
          {draft.statuses.map((s, i) => (
            <div key={s.id} className="list-row status">
              <input className="input" value={s.label} onChange={(e) => setStatus(i, { label: e.target.value })} aria-label="Libellé" />
              <select className="select" value={s.category} onChange={(e) => setStatus(i, { category: e.target.value as StatusCategory })} aria-label="Catégorie">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <select className={`select tone-${s.tone}`} value={s.tone} onChange={(e) => setStatus(i, { tone: e.target.value as Tone })} aria-label="Couleur">
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-icon btn-ghost" onClick={() => set({ statuses: move(draft.statuses, i, -1) })} aria-label="Monter" disabled={i === 0}>
                ↑
              </button>
              <button className="btn btn-icon btn-ghost" onClick={() => set({ statuses: move(draft.statuses, i, 1) })} aria-label="Descendre" disabled={i === draft.statuses.length - 1}>
                ↓
              </button>
              <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeStatus(i)} aria-label="Supprimer" title={usage[s.id] ? `${usage[s.id]} candidature(s)` : undefined}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad section">
        <div className="section-title">
          <h2>Champs personnalisés</h2>
          <button className="btn btn-sm" onClick={() => set({ customFields: [...draft.customFields, { id: uid('cf'), label: '', type: 'text' }] })}>
            ＋ Champ
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Ajoutez les informations propres à cette recherche (rythme d’alternance, gratification, durée…).
        </p>
        <div className="list-editor">
          {draft.customFields.length === 0 && <div className="muted small">Aucun champ personnalisé.</div>}
          {draft.customFields.map((f, i) => (
            <div key={f.id} className="list-row field">
              <input className="input" placeholder="Libellé" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
              <select className="select" value={f.type} onChange={(e) => setField(i, { type: e.target.value as CustomFieldType })}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {f.type === 'select' ? (
                <input
                  className="input"
                  placeholder="Choix séparés par des virgules"
                  defaultValue={(f.options ?? []).join(', ')}
                  onBlur={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                />
              ) : (
                <span />
              )}
              <button className="btn btn-icon btn-ghost btn-danger" aria-label="Supprimer" onClick={() => set({ customFields: draft.customFields.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad section" style={{ borderColor: 'var(--tone-danger-bg)' }}>
        <h2 style={{ marginBottom: 8 }}>Zone de danger</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Supprime le suivi et toutes ses candidatures. Pensez à exporter une sauvegarde avant.</p>
        <button className="btn btn-danger" onClick={deleteTracker}>
          Supprimer ce suivi
        </button>
      </section>
    </>
  );
}

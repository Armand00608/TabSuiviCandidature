import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/state/store';
import { followUpState, isStale } from '@/domain/automation';
import { getStatus, noResponseStatus } from '@/domain/status';
import { Overlay } from '@/components/Overlay';
import { StatusBadge } from '@/components/Status';
import { ContactLinks, ExternalLink } from '@/components/ExternalLink';
import { useToast } from '@/components/Toast';
import { formatDate, formatDateTime, relativeDays } from '@/lib/dates';
import { ApplicationForm, diffDraft, draftFrom } from './ApplicationForm';

export function ApplicationDrawer({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const store = useStore();
  const notify = useToast();
  const app = store.data.applications.find((a) => a.id === applicationId);
  const tracker = app && store.getTracker(app.trackerId);

  // `base` = version de la candidature à partir de laquelle le brouillon a été
  // créé. Si elle change "de l'extérieur" (action rapide, autre onglet...) et
  // que rien n'a été modifié localement, le brouillon est resynchronisé.
  const [base, setBase] = useState(app);
  const [draft, setDraft] = useState(() => (app ? draftFrom(app) : null));
  const patch = useMemo(() => (base && draft ? diffDraft(base, draft) : {}), [base, draft]);
  const dirty = Object.keys(patch).length > 0;
  if (app && app !== base && !dirty) {
    setBase(app);
    setDraft(draftFrom(app));
  }

  if (!app || !tracker || !draft) {
    return (
      <Overlay title="Candidature introuvable" onClose={onClose} variant="drawer">
        <p className="muted">Cette candidature a peut-être été supprimée.</p>
      </Overlay>
    );
  }

  const status = getStatus(tracker, app.statusId);
  const fu = followUpState(app, tracker, store.today);
  const stale = isStale(app, tracker, store.today);

  const save = () => {
    if (!draft.company.trim()) return;
    store.patchApplication(app.id, patch);
    notify('Modifications enregistrées');
  };
  const requestClose = () => {
    if (dirty && !window.confirm('Des modifications ne sont pas enregistrées. Fermer quand même ?')) return;
    onClose();
  };
  const remove = () => {
    if (!window.confirm(`Supprimer définitivement « ${app.company} » ?`)) return;
    const snapshot = app;
    store.deleteApplications([app.id]);
    onClose();
    notify(`« ${snapshot.company} » supprimée`, {
      label: 'Annuler',
      run: () => store.restoreApplications([snapshot]),
    });
  };

  return (
    <Overlay
      variant="drawer"
      title={app.company || 'Sans nom'}
      onClose={requestClose}
      headerExtra={
        <>
          <button
            className={`star${app.starred ? ' on' : ''}`}
            title={app.starred ? 'Retirer des favoris' : 'Marquer comme prioritaire'}
            onClick={() => store.patchApplication(app.id, { starred: !app.starred })}
          >
            ★
          </button>
        </>
      }
      footer={
        <>
          <button className="btn btn-danger left" onClick={remove}>
            Supprimer
          </button>
          <button className="btn" onClick={requestClose}>
            Fermer
          </button>
          <button className="btn btn-primary" disabled={!dirty || !draft.company.trim()} onClick={save}>
            Enregistrer
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <StatusBadge status={status} />
        <Link to={`/suivi/${tracker.id}`} className="small" onClick={requestClose}>
          <span className="dot" style={{ background: tracker.color, display: 'inline-block', marginRight: 5 }} />
          {tracker.name}
        </Link>
        {app.link && (
          <ExternalLink value={app.link} className="offer-link">
            Voir l’offre ↗
          </ExternalLink>
        )}
        {app.contactInfo && (
          <span className="small">
            Contact : <ContactLinks value={app.contactInfo} />
          </span>
        )}
      </div>

      <div className="quick-actions">
        {status.category === 'todo' && (
          <button className="btn btn-sm btn-primary" onClick={() => store.markSent(app.id)}>
            📨 Marquer envoyée aujourd’hui
          </button>
        )}
        {(status.category === 'waiting' || status.category === 'todo') && app.sentAt && (
          <button
            className="btn btn-sm"
            onClick={() => {
              store.recordFollowUp(app.id);
              notify('Relance enregistrée');
            }}
          >
            🔔 J’ai relancé aujourd’hui
          </button>
        )}
        {stale && (
          <button className="btn btn-sm" onClick={() => store.setStatus(app.id, noResponseStatus(tracker)!.id)}>
            🧊 Clore : sans réponse
          </button>
        )}
        <span className="small muted">
          {app.sentAt && <>Envoyée le {formatDate(app.sentAt)}. </>}
          {app.followUps.length > 0 && <>Relances : {app.followUps.map(formatDate).join(', ')}. </>}
          {fu.kind === 'scheduled' && <>Prochaine relance {relativeDays(fu.date, store.today)} ({formatDate(fu.date)}).</>}
          {fu.kind === 'due' && <strong style={{ color: 'var(--tone-danger-fg)' }}>Relance à faire {fu.lateBy ? `(en retard de ${fu.lateBy} j)` : 'aujourd’hui'}.</strong>}
          {stale && <>Plus de relance prévue, aucune réponse.</>}
          {!app.sentAt && status.category === 'todo' && <>Pas encore envoyée.</>}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
      >
        <ApplicationForm tracker={tracker} draft={draft} onChange={setDraft} autoActionHint={app.nextActionIsAuto && draft.nextAction === app.nextAction} />
        <button type="submit" hidden />
      </form>

      <hr className="divider" />
      <h3 style={{ marginBottom: 12 }}>Historique</h3>
      <ul className="timeline">
        {[...app.history].reverse().map((h) => (
          <li key={h.id} className={`k-${h.kind}`}>
            <time>{formatDateTime(h.at)}</time>
            {h.message}
          </li>
        ))}
      </ul>
    </Overlay>
  );
}

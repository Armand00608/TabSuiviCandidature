import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/state/store';
import { computeStats, computeTasks } from '@/domain/automation';
import { TRACKER_TEMPLATES } from '@/domain/templates';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/status';
import type { StatusCategory } from '@/domain/types';
import { formatLongDate } from '@/lib/dates';
import { TaskList } from './TaskList';
import { NewTrackerDialog } from '@/features/trackers/NewTrackerDialog';

export const CATEGORY_COLORS: Record<StatusCategory, string> = {
  todo: 'var(--tone-neutral-fg)',
  waiting: 'var(--tone-info-fg)',
  active: 'var(--tone-accent-fg)',
  positive: 'var(--tone-success-fg)',
  rejected: 'var(--tone-danger-fg)',
  closed: 'var(--border)',
};

export function DashboardPage() {
  const store = useStore();
  const [creating, setCreating] = useState(false);
  const trackers = store.trackers.filter((t) => !t.archived);
  const tasks = useMemo(() => computeTasks(store.trackers, store.data.applications, store.today), [store.trackers, store.data.applications, store.today]);
  const overdue = tasks.filter((t) => t.inDays <= 0).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bonjour 👋</h1>
          <p className="muted">
            {formatLongDate(store.today).replace(/^./, (c) => c.toUpperCase())}
            {overdue > 0 ? ` · ${overdue} action(s) à faire aujourd’hui` : ' · tout est à jour'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            ＋ Nouveau suivi
          </button>
        </div>
      </div>

      <section className="section">
        <div className="section-title">
          <h2>À faire cette semaine</h2>
          <span className="muted small">Calculé automatiquement à partir des dates d’envoi et des relances</span>
        </div>
        <div className="card">
          <TaskList tasks={tasks} showTracker={trackers.length > 1} />
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Mes suivis</h2>
        </div>
        {trackers.length === 0 ? (
          <div className="card empty">
            <span className="emoji">🗂️</span>
            <p>Aucun suivi pour l’instant.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Créer mon premier suivi
            </button>
          </div>
        ) : (
          <div className="grid-cards">
            {trackers.map((t) => {
              const stats = computeStats(t, store.applicationsOf(t.id), store.today);
              return (
                <Link key={t.id} to={`/suivi/${t.id}`} className="card tracker-card" style={{ ['--accent' as string]: t.color }}>
                  <div>
                    <div className="kind">{TRACKER_TEMPLATES[t.kind].label}</div>
                    <h3 style={{ fontSize: '1.15rem', marginTop: 2 }}>{t.name}</h3>
                    {t.description && <div className="small muted" style={{ marginTop: 4 }}>{t.description}</div>}
                  </div>
                  <div className="progress" title="Répartition par catégorie de statut">
                    {CATEGORY_ORDER.map((c) =>
                      stats.byCategory[c] ? (
                        <span
                          key={c}
                          title={`${CATEGORY_LABELS[c]} : ${stats.byCategory[c]}`}
                          style={{ width: `${(stats.byCategory[c] / stats.total) * 100}%`, background: CATEGORY_COLORS[c] }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }} className="small">
                    <span><strong>{stats.total}</strong> <span className="muted">pistes</span></span>
                    <span><strong>{stats.sent}</strong> <span className="muted">envoyées</span></span>
                    <span>
                      <strong>{stats.responseRate === null ? '—' : `${stats.responseRate}%`}</strong> <span className="muted">réponses</span>
                    </span>
                  </div>
                  {stats.followUpsDue > 0 && <span className="badge tone-danger">🔔 {stats.followUpsDue} relance(s) à faire</span>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {creating && <NewTrackerDialog onClose={() => setCreating(false)} />}
    </>
  );
}

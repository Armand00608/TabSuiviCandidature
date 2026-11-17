import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '@/state/store';
import { computeStats, computeTasks } from '@/domain/automation';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/status';
import { DEFAULT_QUERY, filterApplications, sortApplications, type Query, type SortKey } from '@/domain/query';
import { applicationsToRows } from '@/domain/tableIO';
import { toDelimited } from '@/lib/csv';
import { downloadFile } from '@/lib/download';
import { slugify } from '@/lib/id';
import { TaskList } from '@/features/dashboard/TaskList';
import { ApplicationTable } from '@/features/applications/ApplicationTable';
import { ApplicationBoard } from '@/features/applications/ApplicationBoard';
import { NewApplicationDialog } from '@/features/applications/NewApplicationDialog';
import { ImportDialog } from '@/features/import/ImportDialog';
import { useOpenApplication } from '@/features/layout/useOpenApplication';
import { NotFound } from '@/features/layout/NotFound';
import { usePersistentState } from '@/lib/usePersistentState';

type View = 'table' | 'board';

export function TrackerPage() {
  const { trackerId = '' } = useParams();
  const store = useStore();
  const tracker = store.getTracker(trackerId);
  const { open } = useOpenApplication();
  const [view, setView] = usePersistentState<View>('view', 'table');
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [dialog, setDialog] = useState<'new' | 'import' | null>(null);
  useEffect(() => setQuery(DEFAULT_QUERY), [trackerId]);

  const all = useMemo(() => store.applicationsOf(trackerId), [store, trackerId]);
  const stats = useMemo(() => tracker && computeStats(tracker, all, store.today), [tracker, all, store.today]);
  const tasks = useMemo(() => (tracker ? computeTasks([tracker], all, store.today) : []), [tracker, all, store.today]);
  const visible = useMemo(() => {
    if (!tracker) return [];
    const q = view === 'board' ? { ...query, category: 'all' as const } : query;
    return sortApplications(filterApplications(all, tracker, q), tracker, query.sort, query.desc);
  }, [all, tracker, query, view]);

  if (!tracker || !stats) return <NotFound message="Ce suivi n’existe pas ou a été supprimé." />;

  const set = (patch: Partial<Query>) => setQuery((q) => ({ ...q, ...patch }));
  const onSort = (sort: SortKey) => set({ sort, desc: query.sort === sort ? !query.desc : false });
  const types = [...new Set([...tracker.applicationTypes, ...all.map((a) => a.type).filter(Boolean)])];
  const openCount = stats.total - stats.byCategory.closed - stats.byCategory.rejected;

  const exportCsv = () => {
    const rows = applicationsToRows(tracker, sortApplications(all, tracker, 'status', false));
    // BOM + point-virgule : ouverture directe dans Excel (version française).
    downloadFile(`${slugify(tracker.name)}-${store.today}.csv`, '﻿' + toDelimited(rows, ';'), 'text/csv;charset=utf-8');
  };

  const chips: { key: Query['category']; label: string; n: number }[] = [
    { key: 'open', label: 'En cours', n: openCount },
    { key: 'all', label: 'Toutes', n: stats.total },
    ...CATEGORY_ORDER.filter((c) => stats.byCategory[c] > 0).map((c) => ({ key: c, label: CATEGORY_LABELS[c], n: stats.byCategory[c] })),
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            <span className="dot" style={{ background: tracker.color, display: 'inline-block', width: 14, height: 14, marginRight: 10 }} />
            {tracker.name}
            {tracker.archived && <span className="badge tone-neutral" style={{ marginLeft: 10, verticalAlign: 'middle' }}>Archivé</span>}
          </h1>
          {tracker.description && <p className="muted">{tracker.description}</p>}
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setDialog('import')}>
            ⤓ Importer
          </button>
          <button className="btn" onClick={exportCsv} disabled={!all.length}>
            ⤒ Exporter CSV
          </button>
          <Link className="btn" to={`/suivi/${tracker.id}/parametres`}>
            ⚙ Paramètres
          </Link>
          <button className="btn btn-primary" onClick={() => setDialog('new')}>
            ＋ Ajouter
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="card stat">
          <div className="value">{stats.total}</div>
          <div className="label">pistes</div>
        </div>
        <div className="card stat">
          <div className="value">{stats.byCategory.todo}</div>
          <div className="label">à envoyer</div>
        </div>
        <div className="card stat">
          <div className="value">{stats.sent}</div>
          <div className="label">envoyées</div>
        </div>
        <div className={`card stat${stats.followUpsDue ? ' alert' : ''}`}>
          <div className="value">{stats.followUpsDue}</div>
          <div className="label">relances à faire</div>
        </div>
        <div className="card stat">
          <div className="value">{stats.byCategory.active + stats.byCategory.positive}</div>
          <div className="label">entretiens / offres</div>
        </div>
        <div className="card stat">
          <div className="value">{stats.responseRate === null ? '—' : `${stats.responseRate}%`}</div>
          <div className="label">taux de réponse</div>
        </div>
      </div>

      {tasks.length > 0 && (
        <section className="section">
          <div className="section-title">
            <h2>À faire</h2>
          </div>
          <div className="card">
            <TaskList tasks={tasks} />
          </div>
        </section>
      )}

      <div className="toolbar">
        <input
          className="input search"
          type="search"
          placeholder="Rechercher (entreprise, ville, notes…)"
          value={query.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <select className="select" value={query.type} onChange={(e) => set({ type: e.target.value })} aria-label="Type">
          <option value="">Tous les types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {view === 'table' && (
          <select className="select" value={query.sort} onChange={(e) => set({ sort: e.target.value as SortKey, desc: false })} aria-label="Tri">
            <option value="priority">Tri : priorité</option>
            <option value="company">Tri : entreprise</option>
            <option value="city">Tri : ville</option>
            <option value="sentAt">Tri : date d’envoi</option>
            <option value="followUp">Tri : prochaine relance</option>
            <option value="status">Tri : statut</option>
            <option value="updatedAt">Tri : dernière modification</option>
          </select>
        )}
        <div className="segmented" style={{ marginLeft: 'auto' }}>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
            ☰ Tableau
          </button>
          <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
            ▦ Kanban
          </button>
        </div>
      </div>

      {view === 'table' && (
        <div className="chips">
          {chips.map((c) => (
            <button key={c.key} className={`chip${query.category === c.key ? ' active' : ''}`} onClick={() => set({ category: c.key })}>
              {c.label}
              <span className="n">{c.n}</span>
            </button>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <div className="card empty">
          <span className="emoji">📭</span>
          <p>Aucune candidature dans ce suivi.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setDialog('new')}>
              Ajouter une candidature
            </button>
            <button className="btn" onClick={() => setDialog('import')}>
              Importer depuis un tableur
            </button>
          </div>
        </div>
      ) : view === 'table' ? (
        visible.length ? (
          <ApplicationTable tracker={tracker} applications={visible} sort={query.sort} desc={query.desc} onSort={onSort} onOpen={open} />
        ) : (
          <div className="card empty">Aucune candidature ne correspond aux filtres.</div>
        )
      ) : (
        <ApplicationBoard tracker={tracker} applications={visible} onOpen={open} />
      )}

      {dialog === 'new' && <NewApplicationDialog tracker={tracker} onClose={() => setDialog(null)} />}
      {dialog === 'import' && <ImportDialog tracker={tracker} onClose={() => setDialog(null)} />}
    </>
  );
}

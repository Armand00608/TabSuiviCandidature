import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '@/state/store';
import { computeStats } from '@/domain/automation';
import { NewTrackerDialog } from '@/features/trackers/NewTrackerDialog';
import { ApplicationDrawer } from '@/features/applications/ApplicationDrawer';
import { useOpenApplication } from './useOpenApplication';

export function AppLayout() {
  const store = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const location = useLocation();
  const { openId, close } = useOpenApplication();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const active = store.trackers.filter((t) => !t.archived);
  const archived = store.trackers.filter((t) => t.archived);

  const trackerLink = (t: (typeof active)[number]) => {
    const stats = computeStats(t, store.applicationsOf(t.id), store.today);
    return (
      <NavLink key={t.id} to={`/suivi/${t.id}`} className="nav-link">
        <span className="dot" style={{ background: t.color }} />
        <span className="truncate">{t.name}</span>
        {stats.followUpsDue > 0 ? (
          <span className="alert" title={`${stats.followUpsDue} relance(s) à faire`}>
            {stats.followUpsDue}
          </span>
        ) : (
          <span className="count">{stats.total}</span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="layout">
      <div className="mobile-bar">
        <button className="btn btn-icon" onClick={() => setMenuOpen(true)} aria-label="Menu">
          ☰
        </button>
        <strong>Suivi Candidatures</strong>
      </div>

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <Link to="/" className="brand">
          <span>📋</span> Suivi Candidatures
        </Link>
        <NavLink to="/" end className="nav-link">
          🏠 Tableau de bord
        </NavLink>

        <div className="nav-section">Mes suivis</div>
        {active.map(trackerLink)}
        <button className="nav-link btn-ghost" style={{ border: 'none', background: 'none', font: 'inherit', cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setCreating(true)}>
          ＋ Nouveau suivi
        </button>

        {archived.length > 0 && (
          <>
            <div className="nav-section">Archivés</div>
            {archived.map(trackerLink)}
          </>
        )}

        <div className="sidebar-footer">
          <NavLink to="/donnees" className="nav-link">
            💾 Sauvegarde & données
          </NavLink>
        </div>
      </aside>
      {menuOpen && <div className="overlay" style={{ zIndex: 35 }} onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <Outlet />
      </main>

      {creating && <NewTrackerDialog onClose={() => setCreating(false)} />}
      {openId && <ApplicationDrawer key={openId} applicationId={openId} onClose={close} />}
    </div>
  );
}

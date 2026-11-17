import { useState } from 'react';
import type { Application, Tracker } from '@/domain/types';
import { followUpState } from '@/domain/automation';
import { useStore } from '@/state/store';
import { relativeDays } from '@/lib/dates';

/** Vue Kanban : une colonne par statut, glisser-déposer pour changer de statut. */
export function ApplicationBoard({ tracker, applications, onOpen }: { tracker: Tracker; applications: Application[]; onOpen: (id: string) => void }) {
  const store = useStore();
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="board">
      {tracker.statuses.map((status) => {
        const items = applications.filter((a) => a.statusId === status.id);
        return (
          <div
            key={status.id}
            className={`column${over === status.id ? ' drop' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status.id);
            }}
            onDragLeave={() => setOver((o) => (o === status.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) store.setStatus(id, status.id);
            }}
          >
            <div className="column-head">
              <span className={`badge tone-${status.tone}`}>{status.label}</span>
              <span className="muted small">{items.length}</span>
            </div>
            {items.map((a) => {
              const fu = followUpState(a, tracker, store.today);
              return (
                <div
                  key={a.id}
                  className="kcard"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  onClick={() => onOpen(a.id)}
                >
                  <div className="title">
                    {a.starred && <span style={{ color: '#f5b301' }}>★ </span>}
                    {a.company}
                  </div>
                  {a.position && <div className="meta truncate">{a.position}</div>}
                  <div className="meta">
                    {[a.city, a.type].filter(Boolean).join(' · ')}
                    {fu.kind === 'due' && <span className="followup due"> · 🔔 relancer</span>}
                    {fu.kind === 'scheduled' && <> · relance {relativeDays(fu.date, store.today)}</>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

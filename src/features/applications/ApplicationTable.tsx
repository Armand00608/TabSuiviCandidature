import type { Application, Tracker } from '@/domain/types';
import type { SortKey } from '@/domain/query';
import { followUpState } from '@/domain/automation';
import { getStatus, isOpenCategory } from '@/domain/status';
import { StatusSelect } from '@/components/Status';
import { useStore } from '@/state/store';
import { formatDate, relativeDays } from '@/lib/dates';

interface Props {
  tracker: Tracker;
  applications: Application[];
  sort: SortKey;
  desc: boolean;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
}

export function ApplicationTable({ tracker, applications, sort, desc, onSort, onOpen }: Props) {
  const store = useStore();

  const Th = ({ k, children }: { k?: SortKey; children: React.ReactNode }) => (
    <th aria-sort={k && sort === k ? (desc ? 'descending' : 'ascending') : undefined}>
      {k ? (
        <button onClick={() => onSort(k)}>
          {children} {sort === k ? (desc ? '↓' : '↑') : ''}
        </button>
      ) : (
        children
      )}
    </th>
  );

  return (
    <div className="card table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 30 }} />
            <Th k="company">Entreprise</Th>
            <Th k="city">Ville</Th>
            <Th>Type</Th>
            <Th>Contact</Th>
            <Th k="sentAt">Envoi</Th>
            <Th k="followUp">Relance</Th>
            <Th k="status">Statut</Th>
            <Th>Prochaine action</Th>
            <Th>Lien</Th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => {
            const status = getStatus(tracker, a.statusId);
            const fu = followUpState(a, tracker, store.today);
            return (
              <tr key={a.id} onClick={() => onOpen(a.id)} className={isOpenCategory(status.category) ? '' : 'is-closed'}>
                <td>
                  <button
                    className={`star${a.starred ? ' on' : ''}`}
                    aria-label="Favori"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.patchApplication(a.id, { starred: !a.starred });
                    }}
                  >
                    ★
                  </button>
                </td>
                <td className="company">
                  {a.company}
                  {a.position && <div className="sub truncate" style={{ maxWidth: 280 }}>{a.position}</div>}
                </td>
                <td className="nowrap">{a.city}</td>
                <td className="nowrap">{a.type}</td>
                <td>
                  {a.contactName}
                  {a.contactInfo && <div className="sub truncate" style={{ maxWidth: 180 }}>{a.contactInfo}</div>}
                </td>
                <td className="nowrap">{formatDate(a.sentAt)}</td>
                <td className="nowrap">
                  {fu.kind === 'due' && <span className="followup due">🔔 {fu.lateBy ? `+${fu.lateBy} j` : 'auj.'}</span>}
                  {fu.kind === 'scheduled' && (
                    <span className={`followup${fu.inDays <= 2 ? ' soon' : ''}`} title={formatDate(fu.date)}>
                      {relativeDays(fu.date, store.today)}
                    </span>
                  )}
                  {fu.kind === 'none' && a.followUps.length > 0 && <span className="muted small">{a.followUps.length} faite(s)</span>}
                </td>
                <td>
                  <StatusSelect tracker={tracker} value={a.statusId} onChange={(id) => store.setStatus(a.id, id)} />
                </td>
                <td className="cell-action">
                  <div className="truncate" title={a.nextAction}>
                    {a.nextActionIsAuto && a.nextAction && <span title="Proposée automatiquement">✨ </span>}
                    {a.nextAction}
                  </div>
                  {a.dueDate && <div className="sub">avant le {formatDate(a.dueDate)}</div>}
                </td>
                <td>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Ouvrir l'offre">
                      ↗
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

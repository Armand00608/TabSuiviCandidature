import type { StatusDef, Tracker } from '@/domain/types';
import { getStatus } from '@/domain/status';

export function StatusBadge({ status }: { status: StatusDef }) {
  return <span className={`badge tone-${status.tone}`}>{status.label}</span>;
}

/** Sélecteur de statut stylé comme un badge, utilisable directement dans le tableau. */
export function StatusSelect({
  tracker,
  value,
  onChange,
}: {
  tracker: Tracker;
  value: string;
  onChange: (statusId: string) => void;
}) {
  const current = getStatus(tracker, value);
  return (
    <select
      className={`status-select tone-${current.tone}`}
      value={current.id}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Statut"
    >
      {tracker.statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

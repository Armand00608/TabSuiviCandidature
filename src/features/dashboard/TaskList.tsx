import type { Task } from '@/domain/automation';
import { noResponseStatus } from '@/domain/status';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { formatDate, relativeDays } from '@/lib/dates';
import { useOpenApplication } from '@/features/layout/useOpenApplication';

const KIND_ICON: Record<Task['kind'], string> = { followup: '🔔', stale: '🧊', deadline: '📅' };

export function TaskList({ tasks, showTracker }: { tasks: Task[]; showTracker?: boolean }) {
  const store = useStore();
  const notify = useToast();
  const { open } = useOpenApplication();

  if (!tasks.length) {
    return (
      <div className="empty" style={{ padding: 28 }}>
        <span className="emoji">✅</span>
        Rien d’urgent : aucune relance ni échéance dans les 7 prochains jours.
      </div>
    );
  }

  return (
    <ul className="tasks">
      {tasks.map((task) => {
        const tracker = store.getTracker(task.trackerId);
        const whenClass = task.inDays < 0 ? 'late' : task.inDays === 0 ? 'today' : '';
        return (
          <li key={task.id} className="task">
            <span className={`when ${whenClass}`} title={formatDate(task.date)}>
              {task.kind === 'stale' ? 'À trancher' : relativeDays(task.date, store.today)}
            </span>
            <span aria-hidden>{KIND_ICON[task.kind]}</span>
            <div className="what">
              <button onClick={() => open(task.applicationId)}>{task.label}</button>
              {showTracker && tracker && (
                <div className="small muted">
                  <span className="dot" style={{ background: tracker.color, display: 'inline-block', marginRight: 5 }} />
                  {tracker.name}
                </div>
              )}
            </div>
            <div className="actions">
              {task.kind === 'followup' && task.inDays <= 0 && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    store.recordFollowUp(task.applicationId);
                    notify('Relance enregistrée, la suivante est planifiée');
                  }}
                >
                  ✓ Relancé
                </button>
              )}
              {task.kind === 'stale' && tracker && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const s = noResponseStatus(tracker);
                    if (s) store.setStatus(task.applicationId, s.id);
                  }}
                >
                  Clore
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

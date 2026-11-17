import type { AppData, Application, Tracker } from '@/domain/types';
import type { ApplicationPatch, Clock } from '@/domain/automation';
import { applyPatch, changeStatus, markSent, recordFollowUp, refreshAutoFields } from '@/domain/automation';

/**
 * Toutes les mutations passent par ce reducer pur. L'horloge (`clock`) est
 * fournie dans l'action pour garder le reducer déterministe et testable.
 */
export type Action =
  | { type: 'tracker/create'; tracker: Tracker }
  | { type: 'tracker/update'; tracker: Tracker; clock: Clock }
  | { type: 'tracker/delete'; trackerId: string }
  | { type: 'app/add'; applications: Application[] }
  | { type: 'app/patch'; id: string; patch: ApplicationPatch; clock: Clock }
  | { type: 'app/status'; id: string; statusId: string; clock: Clock }
  | { type: 'app/markSent'; id: string; date: string; clock: Clock }
  | { type: 'app/followUp'; id: string; date: string; clock: Clock }
  | { type: 'app/delete'; ids: string[] }
  | { type: 'data/replace'; data: AppData }
  | { type: 'auto/refresh'; clock: Clock };

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'tracker/create':
      return { ...state, trackers: [...state.trackers, action.tracker] };

    case 'tracker/update': {
      const tracker = { ...action.tracker, updatedAt: action.clock.now };
      const statusIds = new Set(tracker.statuses.map((s) => s.id));
      const fallback = tracker.statuses[0]?.id ?? '';
      return {
        ...state,
        trackers: state.trackers.map((t) => (t.id === tracker.id ? tracker : t)),
        // Les candidatures dont le statut a été supprimé basculent sur le premier statut,
        // puis les champs automatiques sont recalculés avec les nouveaux réglages.
        applications: state.applications.map((a) => {
          if (a.trackerId !== tracker.id) return a;
          const fixed = statusIds.has(a.statusId) ? a : { ...a, statusId: fallback };
          return refreshAutoFields(fixed, tracker, action.clock);
        }),
      };
    }

    case 'tracker/delete':
      return {
        ...state,
        trackers: state.trackers.filter((t) => t.id !== action.trackerId),
        applications: state.applications.filter((a) => a.trackerId !== action.trackerId),
      };

    case 'app/add':
      return { ...state, applications: [...state.applications, ...action.applications] };

    case 'app/patch':
    case 'app/status':
    case 'app/markSent':
    case 'app/followUp':
      return updateOne(state, action.id, (app, tracker) => {
        switch (action.type) {
          case 'app/patch':
            return applyPatch(app, tracker, action.patch, action.clock);
          case 'app/status':
            return changeStatus(app, tracker, action.statusId, action.clock);
          case 'app/markSent':
            return markSent(app, tracker, action.date, action.clock);
          case 'app/followUp':
            return recordFollowUp(app, tracker, action.date, action.clock);
        }
      });

    case 'app/delete': {
      const ids = new Set(action.ids);
      return { ...state, applications: state.applications.filter((a) => !ids.has(a.id)) };
    }

    case 'data/replace':
      return action.data;

    case 'auto/refresh': {
      const trackers = new Map(state.trackers.map((t) => [t.id, t]));
      let changed = false;
      const applications = state.applications.map((a) => {
        const t = trackers.get(a.trackerId);
        const next = t ? refreshAutoFields(a, t, action.clock) : a;
        if (next !== a) changed = true;
        return next;
      });
      return changed ? { ...state, applications } : state;
    }
  }
}

function updateOne(
  state: AppData,
  id: string,
  fn: (app: Application, tracker: Tracker) => Application,
): AppData {
  const app = state.applications.find((a) => a.id === id);
  const tracker = app && state.trackers.find((t) => t.id === app.trackerId);
  if (!app || !tracker) return state;
  const next = fn(app, tracker);
  return next === app ? state : { ...state, applications: state.applications.map((a) => (a.id === id ? next : a)) };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppData, Application, Tracker, TrackerKind } from '@/domain/types';
import type { ApplicationPatch, Clock } from '@/domain/automation';
import type { NewApplicationInput } from '@/domain/application';
import { createApplication } from '@/domain/application';
import { createTracker } from '@/domain/templates';
import type { Repository } from '@/storage/repository';
import { normalizeAppData } from '@/storage/schema';
import { buildSeedData } from '@/data/seed';
import { today } from '@/lib/dates';
import { reducer } from './reducer';

const clock = (): Clock => ({ today: today(), now: new Date().toISOString() });

export interface Store {
  data: AppData;
  today: string;
  trackers: Tracker[];
  getTracker(id: string): Tracker | undefined;
  applicationsOf(trackerId: string): Application[];

  createTracker(kind: TrackerKind, name: string, description?: string): Tracker;
  updateTracker(tracker: Tracker): void;
  deleteTracker(id: string): void;

  addApplication(trackerId: string, input: NewApplicationInput): Application | undefined;
  addApplications(trackerId: string, inputs: NewApplicationInput[]): number;
  patchApplication(id: string, patch: ApplicationPatch): void;
  setStatus(id: string, statusId: string): void;
  markSent(id: string, date?: string): void;
  recordFollowUp(id: string, date?: string): void;
  deleteApplications(ids: string[]): void;
  /** Ré-insère des candidatures supprimées (annulation). */
  restoreApplications(apps: Application[]): void;

  importData(json: unknown): void;
  resetToDemo(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => repository.load() ?? buildSeedData());
  const [currentDay, setCurrentDay] = useState(today);

  // Persistance : chaque nouvel état est enregistré.
  useEffect(() => {
    repository.save(data);
  }, [data, repository]);

  // Automatisation : recalcul au démarrage, puis à chaque changement de jour
  // (onglet laissé ouvert la nuit) et quand l'onglet redevient visible.
  useEffect(() => {
    const tick = () => {
      const c = clock();
      setCurrentDay(c.today);
      dispatch({ type: 'auto/refresh', clock: c });
    };
    tick();
    const interval = window.setInterval(tick, 60 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Synchronisation entre plusieurs onglets ouverts.
  useEffect(() => repository.subscribe?.((fresh) => dispatch({ type: 'data/replace', data: fresh })), [repository]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const getTracker = useCallback((id: string) => data.trackers.find((t) => t.id === id), [data.trackers]);
  const applicationsOf = useCallback(
    (trackerId: string) => data.applications.filter((a) => a.trackerId === trackerId),
    [data.applications],
  );

  const actions = useMemo(
    () => ({
      createTracker(kind: TrackerKind, name: string, description?: string) {
        const tracker = createTracker(kind, { name, description });
        dispatch({ type: 'tracker/create', tracker });
        return tracker;
      },
      updateTracker: (tracker: Tracker) => dispatch({ type: 'tracker/update', tracker, clock: clock() }),
      deleteTracker: (trackerId: string) => dispatch({ type: 'tracker/delete', trackerId }),

      addApplication(trackerId: string, input: NewApplicationInput) {
        const tracker = dataRef.current.trackers.find((t) => t.id === trackerId);
        if (!tracker) return undefined;
        const app = createApplication(tracker, input, clock());
        dispatch({ type: 'app/add', applications: [app] });
        return app;
      },
      addApplications(trackerId: string, inputs: NewApplicationInput[]) {
        const tracker = dataRef.current.trackers.find((t) => t.id === trackerId);
        if (!tracker) return 0;
        const c = clock();
        dispatch({ type: 'app/add', applications: inputs.map((i) => createApplication(tracker, i, c)) });
        return inputs.length;
      },
      patchApplication: (id: string, patch: ApplicationPatch) => dispatch({ type: 'app/patch', id, patch, clock: clock() }),
      setStatus: (id: string, statusId: string) => dispatch({ type: 'app/status', id, statusId, clock: clock() }),
      markSent(id: string, date?: string) {
        const c = clock();
        dispatch({ type: 'app/markSent', id, date: date ?? c.today, clock: c });
      },
      recordFollowUp(id: string, date?: string) {
        const c = clock();
        dispatch({ type: 'app/followUp', id, date: date ?? c.today, clock: c });
      },
      deleteApplications: (ids: string[]) => dispatch({ type: 'app/delete', ids }),
      restoreApplications: (applications: Application[]) => dispatch({ type: 'app/add', applications }),
      importData: (json: unknown) => dispatch({ type: 'data/replace', data: normalizeAppData(json) }),
      resetToDemo: () => dispatch({ type: 'data/replace', data: buildSeedData() }),
    }),
    [],
  );

  const store = useMemo<Store>(
    () => ({ data, today: currentDay, trackers: data.trackers, getTracker, applicationsOf, ...actions }),
    [data, currentDay, getTracker, applicationsOf, actions],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

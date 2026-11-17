import type { StatusCategory, StatusDef, Tracker } from './types';

export const CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo: 'À faire',
  waiting: 'En attente',
  active: 'En cours',
  positive: 'Positif',
  rejected: 'Refus',
  closed: 'Clos',
};

export const CATEGORY_ORDER: StatusCategory[] = ['todo', 'waiting', 'active', 'positive', 'rejected', 'closed'];

const UNKNOWN_STATUS: StatusDef = { id: '__unknown', label: 'Statut inconnu', category: 'todo', tone: 'neutral' };

export function getStatus(tracker: Tracker, statusId: string): StatusDef {
  return tracker.statuses.find((s) => s.id === statusId) ?? tracker.statuses[0] ?? UNKNOWN_STATUS;
}

export function firstStatusOf(tracker: Tracker, category: StatusCategory): StatusDef | undefined {
  return tracker.statuses.find((s) => s.category === category);
}

/** Statut utilisé après une relance : "relancee" s'il existe, sinon le 2e statut "en attente". */
export function followUpStatus(tracker: Tracker): StatusDef | undefined {
  const waiting = tracker.statuses.filter((s) => s.category === 'waiting');
  return tracker.statuses.find((s) => s.id === 'relancee') ?? waiting[1] ?? waiting[0];
}

/** Statut utilisé pour clore une piste sans réponse. */
export function noResponseStatus(tracker: Tracker): StatusDef | undefined {
  return tracker.statuses.find((s) => s.id === 'sans_reponse') ?? firstStatusOf(tracker, 'closed');
}

export function isOpenCategory(c: StatusCategory): boolean {
  return c !== 'closed' && c !== 'rejected';
}

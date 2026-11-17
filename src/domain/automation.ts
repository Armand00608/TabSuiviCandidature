/**
 * Moteur d'automatisation : fonctions pures (sans effet de bord) qui calculent
 * les relances, les suggestions d'actions et les transitions de statut.
 * Toute la logique "intelligente" du site est ici, testée unitairement.
 */
import type { Application, HistoryEntry, HistoryKind, ISODate, StatusCategory, Tracker } from './types';
import { addDays, diffDays, formatDate } from '@/lib/dates';
import { uid } from '@/lib/id';
import { firstStatusOf, followUpStatus, getStatus, noResponseStatus } from './status';

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

/** Date du dernier contact sortant (dernière relance ou envoi initial). */
export function lastContactDate(app: Application): ISODate | null {
  return app.followUps.at(-1) ?? app.sentAt;
}

/** Date de la prochaine relance prévue, ou `null` si aucune relance n'est à faire. */
export function nextFollowUpDate(app: Application, tracker: Tracker): ISODate | null {
  if (getStatus(tracker, app.statusId).category !== 'waiting') return null;
  const last = lastContactDate(app);
  if (!last) return null;
  if (app.followUps.length >= tracker.settings.maxFollowUps) return null;
  return addDays(last, tracker.settings.followUpDelayDays);
}

export type FollowUpState =
  | { kind: 'none' }
  | { kind: 'scheduled'; date: ISODate; inDays: number }
  | { kind: 'due'; date: ISODate; lateBy: number };

export function followUpState(app: Application, tracker: Tracker, today: ISODate): FollowUpState {
  const date = nextFollowUpDate(app, tracker);
  if (!date) return { kind: 'none' };
  const inDays = diffDays(today, date);
  return inDays <= 0 ? { kind: 'due', date, lateBy: Math.abs(inDays) } : { kind: 'scheduled', date, inDays };
}

/**
 * Une piste est "froide" quand toutes les relances ont été faites et qu'aucune
 * réponse n'est arrivée après `staleAfterDays` jours.
 */
export function isStale(app: Application, tracker: Tracker, today: ISODate): boolean {
  if (getStatus(tracker, app.statusId).category !== 'waiting') return false;
  const last = lastContactDate(app);
  if (!last) return false;
  if (app.followUps.length < tracker.settings.maxFollowUps) return false;
  return diffDays(last, today) >= tracker.settings.staleAfterDays;
}

/** Prochaine action proposée automatiquement selon l'état de la candidature. */
export function suggestNextAction(app: Application, tracker: Tracker, today: ISODate): string {
  const category = getStatus(tracker, app.statusId).category;
  switch (category) {
    case 'todo':
      if (!app.contactName.trim() && /spontan/i.test(app.type)) return 'Trouver un contact puis envoyer la candidature';
      return 'Envoyer la candidature';
    case 'waiting': {
      if (isStale(app, tracker, today)) return 'Pas de réponse : clore la piste ?';
      const next = nextFollowUpDate(app, tracker);
      if (next) return `Relancer le ${formatDate(next)}`;
      return 'Attendre la réponse';
    }
    case 'active':
      return "Préparer l'entretien / la prochaine étape";
    case 'positive':
      return "Répondre à l'offre";
    case 'rejected':
    case 'closed':
      return '';
  }
}

// ---------------------------------------------------------------------------
// Transitions (retournent une nouvelle candidature, n'altèrent jamais l'entrée)
// ---------------------------------------------------------------------------

export interface Clock {
  today: ISODate;
  now: string;
}

function log(app: Application, kind: HistoryKind, message: string, clock: Clock): HistoryEntry[] {
  return [...app.history, { id: uid('h'), at: clock.now, kind, message }];
}

/**
 * Changement d'étape : une action écrite à la main pour l'étape précédente
 * devient obsolète. On repasse sur la suggestion automatique en gardant une
 * trace de l'ancienne action dans l'historique.
 */
function expireManualAction(app: Application, clock: Clock): Application {
  if (app.nextActionIsAuto) return app;
  const previous = app.nextAction.trim();
  return {
    ...app,
    nextActionIsAuto: true,
    history: previous ? log(app, 'auto', `Action précédente : « ${previous} »`, clock) : app.history,
  };
}

/**
 * Recalcule les champs dérivés : prochaine action automatique et clôture
 * automatique des pistes froides. Renvoie la même référence si rien ne change
 * (permet d'éviter des rendus / sauvegardes inutiles).
 */
export function refreshAutoFields(app: Application, tracker: Tracker, clock: Clock): Application {
  let next = app;

  if (tracker.settings.autoCloseStale && isStale(next, tracker, clock.today)) {
    const target = noResponseStatus(tracker);
    if (target && target.id !== next.statusId) {
      next = {
        ...next,
        statusId: target.id,
        history: log(next, 'auto', `Clôturée automatiquement : « ${target.label} » (aucune réponse)`, clock),
        updatedAt: clock.now,
      };
    }
  }

  if (tracker.settings.autoNextAction && (next.nextActionIsAuto || !next.nextAction.trim())) {
    const suggestion = suggestNextAction(next, tracker, clock.today);
    if (suggestion !== next.nextAction || !next.nextActionIsAuto) {
      next = { ...next, nextAction: suggestion, nextActionIsAuto: true };
    }
  }

  return next;
}

export function changeStatus(app: Application, tracker: Tracker, statusId: string, clock: Clock): Application {
  if (statusId === app.statusId) return app;
  const from = getStatus(tracker, app.statusId);
  const to = getStatus(tracker, statusId);
  let next: Application = {
    ...app,
    statusId: to.id,
    history: log(app, 'status', `Statut : ${from.label} → ${to.label}`, clock),
    updatedAt: clock.now,
  };
  if (from.category !== to.category) next = expireManualAction(next, clock);
  if (to.category === 'waiting' && !next.sentAt && tracker.settings.autoFillSentDate) {
    next = { ...next, sentAt: clock.today, history: log(next, 'sent', 'Date d’envoi renseignée automatiquement', clock) };
  }
  return refreshAutoFields(next, tracker, clock);
}

/** Marque la candidature comme envoyée à `date` et la place "en attente". */
export function markSent(app: Application, tracker: Tracker, date: ISODate, clock: Clock): Application {
  let next: Application = {
    ...app,
    sentAt: date,
    history: log(app, 'sent', `Candidature envoyée le ${formatDate(date)}`, clock),
    updatedAt: clock.now,
  };
  const waiting = firstStatusOf(tracker, 'waiting');
  if (waiting && getStatus(tracker, next.statusId).category === 'todo') {
    next = { ...next, statusId: waiting.id, history: log(next, 'status', `Statut → ${waiting.label}`, clock) };
    next = expireManualAction(next, clock);
  }
  return refreshAutoFields(next, tracker, clock);
}

export function recordFollowUp(app: Application, tracker: Tracker, date: ISODate, clock: Clock): Application {
  const followUps = [...app.followUps, date].sort();
  let next: Application = {
    ...app,
    followUps,
    history: log(app, 'followup', `Relance n°${followUps.length} le ${formatDate(date)}`, clock),
    updatedAt: clock.now,
  };
  const target = followUpStatus(tracker);
  const cat = getStatus(tracker, next.statusId).category;
  if (target && target.id !== next.statusId && (cat === 'waiting' || cat === 'todo')) {
    next = { ...next, statusId: target.id, history: log(next, 'status', `Statut → ${target.label}`, clock) };
    if (cat === 'todo') next = expireManualAction(next, clock);
  }
  if (!next.sentAt) next = { ...next, sentAt: date };
  return refreshAutoFields(next, tracker, clock);
}

export type ApplicationPatch = Partial<
  Omit<Application, 'id' | 'trackerId' | 'history' | 'createdAt' | 'updatedAt' | 'nextActionIsAuto'>
>;

/** Applique une modification issue du formulaire en déclenchant les règles. */
export function applyPatch(app: Application, tracker: Tracker, patch: ApplicationPatch, clock: Clock): Application {
  const { statusId, nextAction, ...rest } = patch;
  let next: Application = { ...app, ...rest, updatedAt: clock.now };

  const changed = (Object.keys(patch) as (keyof ApplicationPatch)[]).filter(
    (k) => k !== 'statusId' && JSON.stringify(patch[k]) !== JSON.stringify(app[k]),
  );
  if (changed.length) next = { ...next, history: log(next, 'edit', `Modifié : ${changed.map(fieldLabel).join(', ')}`, clock) };

  if (statusId !== undefined && statusId !== app.statusId) {
    next = changeStatus(next, tracker, statusId, clock);
  } else if (patch.sentAt && !app.sentAt && getStatus(tracker, next.statusId).category === 'todo') {
    const waiting = firstStatusOf(tracker, 'waiting');
    if (waiting) next = changeStatus(next, tracker, waiting.id, clock);
  }

  // Appliquée après le changement de statut : une action saisie dans la même
  // modification est la plus récente et prime. Vide => retour à la suggestion.
  if (nextAction !== undefined && nextAction !== app.nextAction) {
    next = { ...next, nextAction, nextActionIsAuto: nextAction.trim() === '' };
  }
  return refreshAutoFields(next, tracker, clock);
}

const FIELD_LABELS: Record<string, string> = {
  company: 'entreprise',
  city: 'ville',
  type: 'type',
  position: 'poste',
  contactName: 'contact',
  contactInfo: 'coordonnées',
  sentAt: "date d'envoi",
  followUps: 'relances',
  nextAction: 'prochaine action',
  dueDate: 'échéance',
  link: 'lien',
  notes: 'notes',
  custom: 'champs perso',
  starred: 'favori',
};
const fieldLabel = (k: string) => FIELD_LABELS[k] ?? k;

// ---------------------------------------------------------------------------
// Tâches : la liste "À faire" calculée automatiquement
// ---------------------------------------------------------------------------

export type TaskKind = 'followup' | 'stale' | 'deadline';

export interface Task {
  id: string;
  kind: TaskKind;
  applicationId: string;
  trackerId: string;
  date: ISODate;
  /** < 0 : en retard ; 0 : aujourd'hui ; > 0 : à venir. */
  inDays: number;
  label: string;
}

export function computeTasks(
  trackers: Tracker[],
  applications: Application[],
  today: ISODate,
  horizonDays = 7,
): Task[] {
  const byId = new Map(trackers.map((t) => [t.id, t]));
  const tasks: Task[] = [];

  for (const app of applications) {
    const tracker = byId.get(app.trackerId);
    if (!tracker || tracker.archived) continue;
    const category = getStatus(tracker, app.statusId).category;
    const closed = category === 'closed' || category === 'rejected';

    if (isStale(app, tracker, today)) {
      tasks.push({
        id: `${app.id}:stale`,
        kind: 'stale',
        applicationId: app.id,
        trackerId: tracker.id,
        date: today,
        inDays: 0,
        label: `Aucune réponse de ${app.company} après ${app.followUps.length} relance(s)`,
      });
    }

    const fu = followUpState(app, tracker, today);
    if (fu.kind !== 'none') {
      const inDays = diffDays(today, fu.date);
      if (inDays <= horizonDays) {
        tasks.push({
          id: `${app.id}:followup`,
          kind: 'followup',
          applicationId: app.id,
          trackerId: tracker.id,
          date: fu.date,
          inDays,
          label: `Relancer ${app.company}${app.contactName ? ` (${app.contactName})` : ''}`,
        });
      }
    }

    if (app.dueDate && !closed) {
      const inDays = diffDays(today, app.dueDate);
      if (inDays <= horizonDays) {
        tasks.push({
          id: `${app.id}:deadline`,
          kind: 'deadline',
          applicationId: app.id,
          trackerId: tracker.id,
          date: app.dueDate,
          inDays,
          label: `${app.company} : ${app.nextAction || 'échéance'}`,
        });
      }
    }
  }

  return tasks.sort((a, b) => a.inDays - b.inDays || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

export interface TrackerStats {
  total: number;
  byCategory: Record<StatusCategory, number>;
  byStatus: Record<string, number>;
  sent: number;
  responses: number;
  /** Taux de réponse en % parmi les candidatures envoyées (null si aucune). */
  responseRate: number | null;
  followUpsDue: number;
}

export function computeStats(tracker: Tracker, applications: Application[], today: ISODate): TrackerStats {
  const byCategory: Record<StatusCategory, number> = { todo: 0, waiting: 0, active: 0, positive: 0, rejected: 0, closed: 0 };
  const byStatus: Record<string, number> = {};
  let sent = 0;
  let responses = 0;
  let followUpsDue = 0;

  for (const app of applications) {
    if (app.trackerId !== tracker.id) continue;
    const status = getStatus(tracker, app.statusId);
    byCategory[status.category]++;
    byStatus[status.id] = (byStatus[status.id] ?? 0) + 1;
    if (app.sentAt || status.category !== 'todo') {
      sent++;
      if (status.category === 'active' || status.category === 'positive' || status.category === 'rejected') responses++;
    }
    if (followUpState(app, tracker, today).kind === 'due') followUpsDue++;
  }

  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  return {
    total,
    byCategory,
    byStatus,
    sent,
    responses,
    responseRate: sent ? Math.round((responses / sent) * 100) : null,
    followUpsDue,
  };
}

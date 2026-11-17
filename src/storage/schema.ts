/**
 * Validation + migration des données persistées.
 * Toute donnée lue (localStorage, fichier importé) passe par `normalizeAppData`
 * pour garantir un état cohérent même si le fichier est ancien ou incomplet.
 */
import type { AppData, Application, AutomationSettings, StatusCategory, Tracker, Tone } from '@/domain/types';
import { createTracker } from '@/domain/templates';
import { isValidISODate } from '@/lib/dates';
import { uid } from '@/lib/id';

export const CURRENT_SCHEMA_VERSION = 1;

const CATEGORIES: StatusCategory[] = ['todo', 'waiting', 'active', 'positive', 'rejected', 'closed'];
const TONES: Tone[] = ['neutral', 'info', 'warning', 'success', 'danger', 'accent'];

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const date = (v: unknown) => (isValidISODate(v) ? v : null);

export class InvalidDataError extends Error {}

function normalizeTracker(raw: Raw): Tracker {
  const kind = (['stage', 'alternance', 'emploi', 'autre'] as const).find((k) => k === raw.kind) ?? 'autre';
  const base = createTracker(kind);
  const statuses = Array.isArray(raw.statuses)
    ? raw.statuses.filter(isObj).map((s) => ({
        id: str(s.id) || uid('st'),
        label: str(s.label, 'Statut'),
        category: CATEGORIES.includes(s.category as StatusCategory) ? (s.category as StatusCategory) : 'todo',
        tone: TONES.includes(s.tone as Tone) ? (s.tone as Tone) : 'neutral',
      }))
    : [];
  const settings = isObj(raw.settings) ? raw.settings : {};
  const num = (k: keyof AutomationSettings) =>
    typeof settings[k] === 'number' && Number.isFinite(settings[k]) && (settings[k] as number) >= 0
      ? (settings[k] as number)
      : (base.settings[k] as number);
  const bool = (k: keyof AutomationSettings) => (typeof settings[k] === 'boolean' ? (settings[k] as boolean) : (base.settings[k] as boolean));

  return {
    ...base,
    id: str(raw.id) || base.id,
    name: str(raw.name, base.name),
    description: str(raw.description, ''),
    color: /^#[0-9a-f]{6}$/i.test(str(raw.color)) ? str(raw.color) : base.color,
    statuses: statuses.length ? statuses : base.statuses,
    applicationTypes: Array.isArray(raw.applicationTypes) ? raw.applicationTypes.filter((t): t is string => typeof t === 'string') : base.applicationTypes,
    customFields: Array.isArray(raw.customFields)
      ? raw.customFields.filter(isObj).map((f) => ({
          id: str(f.id) || uid('cf'),
          label: str(f.label, 'Champ'),
          type: (['text', 'longtext', 'date', 'number', 'url', 'select'] as const).find((t) => t === f.type) ?? 'text',
          options: Array.isArray(f.options) ? f.options.filter((o): o is string => typeof o === 'string') : undefined,
        }))
      : base.customFields,
    settings: {
      followUpDelayDays: num('followUpDelayDays'),
      maxFollowUps: num('maxFollowUps'),
      staleAfterDays: num('staleAfterDays'),
      autoCloseStale: bool('autoCloseStale'),
      autoFillSentDate: bool('autoFillSentDate'),
      autoNextAction: bool('autoNextAction'),
    },
    archived: raw.archived === true,
    createdAt: str(raw.createdAt, base.createdAt),
    updatedAt: str(raw.updatedAt, base.updatedAt),
  };
}

function normalizeApplication(raw: Raw, trackers: Map<string, Tracker>): Application | null {
  const tracker = trackers.get(str(raw.trackerId));
  if (!tracker) return null;
  const now = new Date().toISOString();
  const statusId = tracker.statuses.some((s) => s.id === raw.statusId) ? str(raw.statusId) : tracker.statuses[0].id;
  const custom: Record<string, string> = {};
  if (isObj(raw.custom)) for (const [k, v] of Object.entries(raw.custom)) if (typeof v === 'string') custom[k] = v;
  return {
    id: str(raw.id) || uid('app'),
    trackerId: tracker.id,
    company: str(raw.company),
    city: str(raw.city),
    type: str(raw.type),
    position: str(raw.position),
    contactName: str(raw.contactName),
    contactInfo: str(raw.contactInfo),
    sentAt: date(raw.sentAt),
    followUps: Array.isArray(raw.followUps) ? raw.followUps.filter(isValidISODate).sort() : [],
    statusId,
    nextAction: str(raw.nextAction),
    nextActionIsAuto: raw.nextActionIsAuto === true,
    dueDate: date(raw.dueDate),
    link: str(raw.link),
    notes: str(raw.notes),
    custom,
    starred: raw.starred === true,
    history: Array.isArray(raw.history)
      ? raw.history.filter(isObj).map((h) => ({
          id: str(h.id) || uid('h'),
          at: str(h.at, now),
          kind: (['created', 'status', 'sent', 'followup', 'edit', 'auto'] as const).find((k) => k === h.kind) ?? 'edit',
          message: str(h.message),
        }))
      : [],
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}

/** Point de migration : chaque version future ajoutera une étape ici. */
function migrate(raw: Raw): Raw {
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new InvalidDataError('Ces données proviennent d’une version plus récente du site.');
  }
  // v1 -> v2 : (exemple) if (version < 2) raw = { ...raw, ... }
  return raw;
}

export function normalizeAppData(input: unknown): AppData {
  if (!isObj(input)) throw new InvalidDataError('Format de données invalide.');
  const raw = migrate(input);
  if (!Array.isArray(raw.trackers)) throw new InvalidDataError('Aucun suivi trouvé dans les données.');
  const trackers = raw.trackers.filter(isObj).map(normalizeTracker);
  const byId = new Map(trackers.map((t) => [t.id, t]));
  const applications = (Array.isArray(raw.applications) ? raw.applications : [])
    .filter(isObj)
    .map((a) => normalizeApplication(a, byId))
    .filter((a): a is Application => a !== null);
  return { schemaVersion: CURRENT_SCHEMA_VERSION, trackers, applications };
}

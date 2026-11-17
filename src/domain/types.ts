/**
 * Modèle de données métier.
 *
 * Un "suivi" (Tracker) regroupe des candidatures (Application) pour une même
 * recherche : stage, alternance, emploi... Chaque suivi a sa propre
 * configuration : statuts, types de candidature, champs personnalisés et règles
 * d'automatisation (délai de relance, etc.).
 */

/** Date calendaire au format ISO `YYYY-MM-DD` (sans heure ni fuseau). */
export type ISODate = string;
/** Horodatage ISO complet (`Date.prototype.toISOString`). */
export type ISODateTime = string;

export type TrackerKind = 'stage' | 'alternance' | 'emploi' | 'autre';

/**
 * Catégorie d'un statut : c'est elle (et non le libellé) qui pilote les
 * automatisations. Un utilisateur peut donc renommer / ajouter des statuts
 * librement sans casser la logique.
 *
 * - `todo`     : rien n'a encore été envoyé
 * - `waiting`  : candidature envoyée, en attente de réponse (=> relances)
 * - `active`   : échange en cours (entretien, test...)
 * - `positive` : offre reçue / acceptée
 * - `rejected` : refus de l'entreprise (compte comme une réponse)
 * - `closed`   : sans réponse, abandon
 */
export type StatusCategory = 'todo' | 'waiting' | 'active' | 'positive' | 'rejected' | 'closed';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent';

export interface StatusDef {
  id: string;
  label: string;
  category: StatusCategory;
  tone: Tone;
}

export type CustomFieldType = 'text' | 'longtext' | 'date' | 'number' | 'url' | 'select';

export interface CustomFieldDef {
  id: string;
  label: string;
  type: CustomFieldType;
  /** Valeurs possibles pour le type `select`. */
  options?: string[];
}

export interface AutomationSettings {
  /** Délai (jours) entre l'envoi / la dernière relance et la relance suivante. */
  followUpDelayDays: number;
  /** Nombre maximum de relances avant de considérer la piste comme froide. */
  maxFollowUps: number;
  /** Jours sans réponse après la dernière relance avant de proposer "Sans réponse". */
  staleAfterDays: number;
  /** Si vrai, les pistes froides passent automatiquement au statut "sans réponse". */
  autoCloseStale: boolean;
  /** Si vrai, la date d'envoi est renseignée automatiquement au passage en attente. */
  autoFillSentDate: boolean;
  /** Si vrai, la "prochaine action" est proposée automatiquement selon le statut. */
  autoNextAction: boolean;
}

export interface Tracker {
  id: string;
  name: string;
  kind: TrackerKind;
  description: string;
  /** Couleur d'accent (hex) pour repérer le suivi d'un coup d'œil. */
  color: string;
  statuses: StatusDef[];
  /** Types de candidature proposés (Offre, Spontanée, Réseau...). */
  applicationTypes: string[];
  customFields: CustomFieldDef[];
  settings: AutomationSettings;
  archived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type HistoryKind = 'created' | 'status' | 'sent' | 'followup' | 'edit' | 'auto';

export interface HistoryEntry {
  id: string;
  at: ISODateTime;
  kind: HistoryKind;
  message: string;
}

export interface Application {
  id: string;
  trackerId: string;
  company: string;
  city: string;
  type: string;
  /** Poste visé ou angle d'approche pour une candidature spontanée. */
  position: string;
  contactName: string;
  /** Email, URL LinkedIn ou téléphone du contact. */
  contactInfo: string;
  sentAt: ISODate | null;
  /** Dates des relances effectuées, dans l'ordre chronologique. */
  followUps: ISODate[];
  statusId: string;
  nextAction: string;
  /** Vrai tant que `nextAction` a été générée automatiquement (non retouchée). */
  nextActionIsAuto: boolean;
  /** Échéance optionnelle de la prochaine action. */
  dueDate: ISODate | null;
  link: string;
  notes: string;
  /** Valeurs des champs personnalisés du suivi, indexées par id de champ. */
  custom: Record<string, string>;
  starred: boolean;
  history: HistoryEntry[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Racine des données persistées. */
export interface AppData {
  schemaVersion: number;
  trackers: Tracker[];
  applications: Application[];
}

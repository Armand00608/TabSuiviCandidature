import type { AutomationSettings, CustomFieldDef, StatusDef, Tracker, TrackerKind } from './types';
import { uid } from '@/lib/id';

/**
 * Modèles de suivi : chaque type de recherche démarre avec des statuts et des
 * champs adaptés. Tout reste modifiable ensuite dans les paramètres du suivi.
 */

const BASE_STATUSES: StatusDef[] = [
  { id: 'a_contacter', label: 'À contacter', category: 'todo', tone: 'neutral' },
  { id: 'envoyee', label: 'Envoyée', category: 'waiting', tone: 'info' },
  { id: 'relancee', label: 'Relancée', category: 'waiting', tone: 'warning' },
  { id: 'entretien', label: 'Entretien', category: 'active', tone: 'accent' },
  { id: 'offre', label: 'Offre reçue', category: 'positive', tone: 'success' },
  { id: 'acceptee', label: 'Acceptée', category: 'positive', tone: 'success' },
  { id: 'refusee', label: 'Refusée', category: 'rejected', tone: 'danger' },
  { id: 'sans_reponse', label: 'Sans réponse', category: 'closed', tone: 'neutral' },
  { id: 'abandonnee', label: 'Abandonnée', category: 'closed', tone: 'neutral' },
];

const DEFAULT_SETTINGS: AutomationSettings = {
  followUpDelayDays: 7,
  maxFollowUps: 2,
  staleAfterDays: 14,
  autoCloseStale: false,
  autoFillSentDate: true,
  autoNextAction: true,
};

interface Template {
  label: string;
  description: string;
  color: string;
  statuses: StatusDef[];
  applicationTypes: string[];
  customFields: CustomFieldDef[];
  settings: Partial<AutomationSettings>;
}

export const TRACKER_TEMPLATES: Record<TrackerKind, Template> = {
  stage: {
    label: 'Stage',
    description: 'Offres et candidatures spontanées pour un stage.',
    color: '#4f46e5',
    statuses: BASE_STATUSES,
    applicationTypes: ['Offre', 'Spontanée', 'Réseau', 'Forum / salon'],
    customFields: [
      { id: 'duree', label: 'Durée', type: 'text' },
      { id: 'debut', label: 'Début souhaité', type: 'date' },
      { id: 'gratification', label: 'Gratification', type: 'text' },
    ],
    settings: {},
  },
  alternance: {
    label: 'Alternance',
    description: "Contrats d'apprentissage / de professionnalisation.",
    color: '#0d9488',
    statuses: [
      ...BASE_STATUSES.slice(0, 4),
      { id: 'test', label: 'Test / étude de cas', category: 'active', tone: 'accent' },
      ...BASE_STATUSES.slice(4, 5),
      { id: 'contrat', label: 'Contrat signé', category: 'positive', tone: 'success' },
      ...BASE_STATUSES.slice(6),
    ],
    applicationTypes: ['Offre', 'Spontanée', 'Réseau', "Via l'école"],
    customFields: [
      { id: 'rythme', label: 'Rythme', type: 'select', options: ['1 sem / 1 sem', '2 sem / 2 sem', '3 j / 2 j', '1 mois / 1 mois', 'Autre'] },
      { id: 'contrat', label: 'Type de contrat', type: 'select', options: ['Apprentissage', 'Professionnalisation'] },
      { id: 'ecole', label: 'École / formation', type: 'text' },
      { id: 'debut', label: 'Début du contrat', type: 'date' },
      { id: 'salaire', label: 'Rémunération', type: 'text' },
    ],
    settings: {},
  },
  emploi: {
    label: 'Emploi',
    description: 'CDI, CDD, freelance...',
    color: '#d97706',
    statuses: [
      ...BASE_STATUSES.slice(0, 3),
      { id: 'rh', label: 'Entretien RH', category: 'active', tone: 'accent' },
      { id: 'technique', label: 'Entretien technique', category: 'active', tone: 'accent' },
      ...BASE_STATUSES.slice(4),
    ],
    applicationTypes: ['Offre', 'Spontanée', 'Réseau', 'Chasseur / cabinet'],
    customFields: [
      { id: 'contrat', label: 'Contrat', type: 'select', options: ['CDI', 'CDD', 'Freelance', 'Intérim'] },
      { id: 'salaire', label: 'Salaire annoncé', type: 'text' },
      { id: 'teletravail', label: 'Télétravail', type: 'select', options: ['Non', 'Partiel', 'Total'] },
    ],
    settings: { followUpDelayDays: 10 },
  },
  autre: {
    label: 'Vierge',
    description: 'Un suivi minimal à personnaliser entièrement.',
    color: '#64748b',
    statuses: BASE_STATUSES,
    applicationTypes: ['Offre', 'Spontanée'],
    customFields: [],
    settings: {},
  },
};

export function createTracker(
  kind: TrackerKind,
  overrides: Partial<Pick<Tracker, 'name' | 'description' | 'color'>> = {},
  now = new Date().toISOString(),
): Tracker {
  const t = TRACKER_TEMPLATES[kind];
  return {
    id: uid('trk'),
    name: overrides.name?.trim() || t.label,
    kind,
    description: overrides.description ?? t.description,
    color: overrides.color ?? t.color,
    // Copies profondes : un suivi ne doit jamais partager d'objet avec le modèle.
    statuses: t.statuses.map((s) => ({ ...s })),
    applicationTypes: [...t.applicationTypes],
    customFields: t.customFields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    settings: { ...DEFAULT_SETTINGS, ...t.settings },
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

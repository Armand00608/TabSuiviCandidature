/**
 * Conversion entre candidatures et tableau (import collé depuis un tableur,
 * export CSV). Les en-têtes sont reconnus de façon souple : "Email / LinkedIn
 * du contact", "email", "linkedin"... pointent tous vers le même champ.
 */
import type { Application, Tracker } from './types';
import type { NewApplicationInput } from './application';
import type { ApplicationPatch } from './automation';
import { getStatus } from './status';
import { formatDate, parseLooseDate } from '@/lib/dates';
import { slugify } from '@/lib/id';

type CoreField =
  | 'company' | 'city' | 'type' | 'position' | 'contactName' | 'contactInfo' | 'sentAt'
  | 'followUp' | 'status' | 'nextAction' | 'dueDate' | 'link' | 'notes';

export type ColumnTarget = { kind: 'core'; field: CoreField } | { kind: 'custom'; id: string } | { kind: 'ignore' };

const CORE_COLUMNS: { field: CoreField; label: string; aliases: string[] }[] = [
  { field: 'company', label: 'Entreprise', aliases: ['entreprise', 'societe', 'company', 'structure', 'organisme'] },
  { field: 'city', label: 'Ville', aliases: ['ville', 'lieu', 'localisation', 'city'] },
  { field: 'type', label: 'Type', aliases: ['type', 'type_de_candidature'] },
  { field: 'position', label: "Poste / angle d'approche", aliases: ['poste', 'intitule', 'angle', 'offre_poste', 'position'] },
  { field: 'contactInfo', label: 'Email / LinkedIn du contact', aliases: ['email', 'linkedin', 'mail', 'coordonnees', 'telephone'] },
  { field: 'contactName', label: 'Contact', aliases: ['contact', 'interlocuteur', 'recruteur'] },
  { field: 'sentAt', label: "Date d'envoi", aliases: ['date_d_envoi', 'envoi', 'date_envoi', 'date_de_candidature', 'envoye_le'] },
  { field: 'followUp', label: 'Relance', aliases: ['relance', 'date_de_relance'] },
  { field: 'status', label: 'Statut', aliases: ['statut', 'etat', 'status'] },
  { field: 'nextAction', label: 'Prochaine action', aliases: ['prochaine_action', 'action', 'a_faire', 'todo'] },
  { field: 'dueDate', label: 'Échéance', aliases: ['echeance', 'deadline', 'date_limite'] },
  { field: 'link', label: 'Lien', aliases: ['lien', 'url', 'annonce', 'link'] },
  { field: 'notes', label: 'Notes', aliases: ['notes', 'note', 'commentaire', 'remarques'] },
];

export function columnOptions(tracker: Tracker): { value: string; label: string; target: ColumnTarget }[] {
  return [
    { value: 'ignore', label: '— Ignorer —', target: { kind: 'ignore' } },
    ...CORE_COLUMNS.map((c) => ({ value: `core:${c.field}`, label: c.label, target: { kind: 'core', field: c.field } as ColumnTarget })),
    ...tracker.customFields.map((f) => ({ value: `custom:${f.id}`, label: `${f.label} (perso)`, target: { kind: 'custom', id: f.id } as ColumnTarget })),
  ];
}

export function targetToValue(t: ColumnTarget): string {
  return t.kind === 'ignore' ? 'ignore' : t.kind === 'core' ? `core:${t.field}` : `custom:${t.id}`;
}

export function valueToTarget(v: string): ColumnTarget {
  const [kind, id] = v.split(':');
  if (kind === 'core') return { kind: 'core', field: id as CoreField };
  if (kind === 'custom') return { kind: 'custom', id };
  return { kind: 'ignore' };
}

/** Devine la cible de chaque colonne à partir de son en-tête. */
export function guessColumns(headers: string[], tracker: Tracker): ColumnTarget[] {
  const used = new Set<string>();
  return headers.map((header) => {
    const h = slugify(header);
    const custom = tracker.customFields.find((f) => slugify(f.label) === h || f.id === h);
    let target: ColumnTarget = { kind: 'ignore' };
    if (custom) target = { kind: 'custom', id: custom.id };
    else {
      // Correspondance exacte d'abord, puis par inclusion (ordre de CORE_COLUMNS significatif).
      const exact = CORE_COLUMNS.find((c) => c.aliases.includes(h));
      const partial = exact ?? CORE_COLUMNS.find((c) => c.aliases.some((a) => h.includes(a)));
      if (partial) target = { kind: 'core', field: partial.field };
    }
    const key = targetToValue(target);
    if (target.kind !== 'ignore' && used.has(key)) return { kind: 'ignore' };
    used.add(key);
    return target;
  });
}

function matchStatus(tracker: Tracker, label: string): string | undefined {
  const s = slugify(label);
  if (!label.trim()) return undefined;
  return (
    tracker.statuses.find((st) => st.id === s || slugify(st.label) === s)?.id ??
    tracker.statuses.find((st) => slugify(st.label).startsWith(s) || s.startsWith(slugify(st.label)))?.id
  );
}

export interface ParsedRow {
  input: NewApplicationInput;
  warnings: string[];
}

/**
 * @param today utilisé pour ignorer les dates de relance futures : dans un
 * tableur, la colonne "Relance (J+7)" contient souvent une date *prévue*, que
 * le site recalcule de lui-même.
 */
export function rowsToApplications(rows: string[][], columns: ColumnTarget[], tracker: Tracker, today: string): ParsedRow[] {
  return rows
    .map((cells) => {
      const input: NewApplicationInput = { custom: {} };
      const warnings: string[] = [];
      columns.forEach((col, i) => {
        const value = (cells[i] ?? '').trim();
        if (!value || col.kind === 'ignore') return;
        if (col.kind === 'custom') {
          input.custom![col.id] = value;
          return;
        }
        switch (col.field) {
          case 'sentAt':
          case 'dueDate':
          case 'followUp': {
            const d = parseLooseDate(value);
            if (!d) warnings.push(`Date illisible : « ${value} »`);
            else if (col.field === 'followUp') {
              if (d <= today) input.followUps = [d];
            }
            else input[col.field] = d;
            break;
          }
          case 'status': {
            const id = matchStatus(tracker, value);
            if (id) input.statusId = id;
            else warnings.push(`Statut inconnu : « ${value} »`);
            break;
          }
          default:
            input[col.field] = value;
        }
      });
      return { input, warnings };
    })
    .filter((r) => r.input.company);
}

export function applicationsToRows(tracker: Tracker, apps: Application[]): string[][] {
  const header = [
    'Entreprise', 'Ville', 'Type', "Poste / angle d'approche", 'Contact', 'Email / LinkedIn du contact',
    "Date d'envoi", 'Relances', 'Statut', 'Prochaine action', 'Échéance', 'Lien', 'Notes',
    ...tracker.customFields.map((f) => f.label),
  ];
  const rows = apps.map((a) => [
    a.company, a.city, a.type, a.position, a.contactName, a.contactInfo,
    formatDate(a.sentAt), a.followUps.map(formatDate).join(', '), getStatus(tracker, a.statusId).label,
    a.nextAction, formatDate(a.dueDate), a.link, a.notes,
    ...tracker.customFields.map((f) => a.custom[f.id] ?? ''),
  ]);
  return [header, ...rows];
}

const FILLABLE_FIELDS = ['city', 'position', 'contactName', 'contactInfo', 'link', 'notes', 'dueDate'] as const;

/**
 * Modification qui complète une candidature existante avec les valeurs d'une
 * ligne importée, sans jamais écraser ce qui est déjà renseigné. Sert à
 * ajouter, par exemple, les contacts trouvés pour des entreprises déjà suivies.
 * Renvoie `null` s'il n'y a rien à compléter.
 */
export function fillEmptyFields(app: Application, input: NewApplicationInput): ApplicationPatch | null {
  const patch: ApplicationPatch = {};
  for (const field of FILLABLE_FIELDS) {
    const value = input[field];
    if (value && !app[field]?.trim()) patch[field] = value;
  }
  const custom = Object.fromEntries(
    Object.entries(input.custom ?? {}).filter(([id, v]) => v && !app.custom[id]?.trim()),
  );
  if (Object.keys(custom).length) patch.custom = { ...app.custom, ...custom };
  return Object.keys(patch).length ? patch : null;
}

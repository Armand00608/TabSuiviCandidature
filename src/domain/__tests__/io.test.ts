import { describe, expect, it } from 'vitest';
import { parseDelimited, toDelimited } from '@/lib/csv';
import { parseLooseDate } from '@/lib/dates';
import { createTracker } from '../templates';
import { fillEmptyFields, guessColumns, rowsToApplications } from '../tableIO';
import { createApplication } from '../application';
import { normalizeAppData } from '@/storage/schema';
import { buildSeedData } from '@/data/seed';

const tracker = createTracker('stage');

describe('csv', () => {
  it('gère guillemets, séparateurs et retours à la ligne', () => {
    const rows = [['a;b', 'x "y"', 'l1\nl2'], ['', 'z', '']];
    expect(parseDelimited(toDelimited(rows, ';'), ';')).toEqual(rows);
  });

  it('détecte la tabulation d’un copier-coller de tableur', () => {
    expect(parseDelimited('A\tB\n1\t2')).toEqual([['A', 'B'], ['1', '2']]);
  });
});

describe('dates souples', () => {
  it.each([
    ['15/02/2026', '2026-02-15'],
    ['5/2/26', '2026-02-05'],
    ['2026-02-15', '2026-02-15'],
    ['31/02/2026', null],
    ['bientôt', null],
  ])('%s -> %s', (input, expected) => expect(parseLooseDate(input)).toBe(expected));
});

describe('import de tableau', () => {
  const headers = ['Entreprise', 'Ville', 'Type', "Poste / angle d'approche", 'Contact', 'Email / LinkedIn du contact', "Date d'envoi", 'Relance (J+7)', 'Statut', 'Prochaine action', 'Lien', 'Notes'];

  it('reconnaît les en-têtes du tableau d’origine', () => {
    const cols = guessColumns(headers, tracker);
    expect(cols.map((c) => (c.kind === 'core' ? c.field : c.kind))).toEqual([
      'company', 'city', 'type', 'position', 'contactName', 'contactInfo', 'sentAt', 'followUp', 'status', 'nextAction', 'link', 'notes',
    ]);
  });

  it('convertit les lignes et signale les problèmes', () => {
    const cols = guessColumns(headers, tracker);
    const rows = [
      ['Enedis', 'Chambéry', 'Offre', 'Dev', '', '', '10/01/2026', '17/01/2026', 'Envoyée', '', '', ''],
      ['', 'ligne vide sans entreprise'],
      ['X', '', '', '', '', '', 'demain', '', 'Bizarre', '', '', ''],
    ];
    const parsed = rowsToApplications(rows, cols, tracker, '2026-01-12');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].input).toMatchObject({ company: 'Enedis', sentAt: '2026-01-10', statusId: 'envoyee' });
    expect(parsed[0].input.followUps).toBeUndefined(); // relance future = date prévue, ignorée
    expect(parsed[1].warnings).toHaveLength(2);
  });
});

describe('schéma', () => {
  it('les données de démarrage sont valides et stables', () => {
    const seed = buildSeedData();
    expect(seed.applications).toHaveLength(23);
    expect(normalizeAppData(JSON.parse(JSON.stringify(seed)))).toEqual(seed);
  });

  it('écarte les candidatures orphelines et répare les statuts inconnus', () => {
    const seed = buildSeedData();
    const raw = JSON.parse(JSON.stringify(seed));
    raw.applications[0].trackerId = 'inexistant';
    raw.applications[1].statusId = 'nope';
    const data = normalizeAppData(raw);
    expect(data.applications).toHaveLength(22);
    expect(data.applications[0].statusId).toBe('a_contacter');
  });

  it('refuse un contenu invalide', () => {
    expect(() => normalizeAppData('hello')).toThrow();
    expect(() => normalizeAppData({})).toThrow();
  });
});

describe('compléter une candidature existante', () => {
  const clock = { today: '2026-11-17', now: '2026-11-17T10:00:00.000Z' };
  const app = createApplication(tracker, { company: 'Zama', city: 'Paris', notes: 'Exigeant' }, clock);

  it('remplit seulement les champs vides', () => {
    const patch = fillEmptyFields(app, { company: 'Zama', city: 'Lyon', contactName: 'Pascal Paillier', notes: 'Autre' });
    expect(patch).toEqual({ contactName: 'Pascal Paillier' });
  });

  it('ne renvoie rien quand tout est déjà renseigné', () => {
    expect(fillEmptyFields(app, { company: 'Zama', city: 'Lyon' })).toBeNull();
  });
});

describe('contacts des données de départ', () => {
  it('chaque piste du suivi Stage a un contact', () => {
    const { applications } = buildSeedData({ today: '2026-11-17', now: '2026-11-17T10:00:00.000Z' });
    expect(applications.filter((a) => !a.contactName || !a.contactInfo).map((a) => a.company)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { createTracker } from '../templates';
import { createApplication } from '../application';
import {
  applyPatch,
  changeStatus,
  computeStats,
  computeTasks,
  followUpState,
  isStale,
  markSent,
  nextFollowUpDate,
  recordFollowUp,
  refreshAutoFields,
} from '../automation';

const clock = (today: string) => ({ today, now: `${today}T10:00:00.000Z` });
const tracker = createTracker('stage', { name: 'Stage' }, '2026-01-01T00:00:00.000Z');
const newApp = (extra = {}) => createApplication(tracker, { company: 'Acme', ...extra }, clock('2026-01-01'));

describe('création', () => {
  it('démarre au premier statut avec une action suggérée', () => {
    const app = newApp();
    expect(app.statusId).toBe('a_contacter');
    expect(app.nextAction).toBe('Envoyer la candidature');
    expect(app.nextActionIsAuto).toBe(true);
  });

  it('propose de trouver un contact pour une spontanée sans contact', () => {
    expect(newApp({ type: 'Spontanée' }).nextAction).toMatch(/Trouver un contact/);
  });

  it('conserve une action saisie manuellement', () => {
    const app = newApp({ nextAction: 'Appeler la RH' });
    expect(app.nextAction).toBe('Appeler la RH');
    expect(app.nextActionIsAuto).toBe(false);
  });
});

describe('envoi et relances', () => {
  it('markSent passe en attente et planifie la relance à J+7', () => {
    const app = markSent(newApp(), tracker, '2026-01-10', clock('2026-01-10'));
    expect(app.statusId).toBe('envoyee');
    expect(nextFollowUpDate(app, tracker)).toBe('2026-01-17');
    expect(app.nextAction).toBe('Relancer le 17/01/26');
  });

  it('remplit la date d’envoi en changeant le statut', () => {
    const app = changeStatus(newApp(), tracker, 'envoyee', clock('2026-02-01'));
    expect(app.sentAt).toBe('2026-02-01');
  });

  it('détecte une relance due puis en retard', () => {
    const app = markSent(newApp(), tracker, '2026-01-10', clock('2026-01-10'));
    expect(followUpState(app, tracker, '2026-01-12')).toEqual({ kind: 'scheduled', date: '2026-01-17', inDays: 5 });
    expect(followUpState(app, tracker, '2026-01-17')).toEqual({ kind: 'due', date: '2026-01-17', lateBy: 0 });
    expect(followUpState(app, tracker, '2026-01-20')).toEqual({ kind: 'due', date: '2026-01-17', lateBy: 3 });
  });

  it('une relance repousse la suivante et passe au statut Relancée', () => {
    let app = markSent(newApp(), tracker, '2026-01-10', clock('2026-01-10'));
    app = recordFollowUp(app, tracker, '2026-01-18', clock('2026-01-18'));
    expect(app.statusId).toBe('relancee');
    expect(nextFollowUpDate(app, tracker)).toBe('2026-01-25');
  });

  it('plus de relance après le maximum, puis piste froide', () => {
    let app = markSent(newApp(), tracker, '2026-01-10', clock('2026-01-10'));
    app = recordFollowUp(app, tracker, '2026-01-17', clock('2026-01-17'));
    app = recordFollowUp(app, tracker, '2026-01-24', clock('2026-01-24'));
    expect(nextFollowUpDate(app, tracker)).toBeNull();
    expect(isStale(app, tracker, '2026-02-06')).toBe(false);
    expect(isStale(app, tracker, '2026-02-07')).toBe(true);
  });

  it('clôture automatique si activée', () => {
    const auto = { ...tracker, settings: { ...tracker.settings, autoCloseStale: true, maxFollowUps: 0 } };
    const app = markSent(newApp(), auto, '2026-01-01', clock('2026-01-01'));
    const refreshed = refreshAutoFields(app, auto, clock('2026-01-20'));
    expect(refreshed.statusId).toBe('sans_reponse');
    expect(refreshed.history.at(-1)?.kind).toBe('auto');
  });

  it('refreshAutoFields renvoie la même référence si rien ne change', () => {
    const app = newApp();
    expect(refreshAutoFields(app, tracker, clock('2026-01-02'))).toBe(app);
  });
});

describe('action manuelle', () => {
  it('est remplacée à l’envoi et archivée dans l’historique', () => {
    const app = markSent(newApp({ nextAction: 'Demander si début 15/02 possible' }), tracker, '2026-01-10', clock('2026-01-10'));
    expect(app.nextAction).toBe('Relancer le 17/01/26');
    expect(app.history.some((h) => h.message.includes('Demander si début 15/02 possible'))).toBe(true);
  });
});

describe('applyPatch', () => {
  it('saisir une date d’envoi fait passer la candidature en attente', () => {
    const app = applyPatch(newApp(), tracker, { sentAt: '2026-03-01' }, clock('2026-03-02'));
    expect(app.statusId).toBe('envoyee');
    expect(app.nextAction).toBe('Relancer le 08/03/26');
  });

  it('modifier la prochaine action désactive la suggestion automatique', () => {
    const app = applyPatch(newApp(), tracker, { nextAction: 'Perso' }, clock('2026-01-02'));
    expect(app.nextActionIsAuto).toBe(false);
    // même étape : l'action manuelle est conservée
    expect(changeStatus(app, tracker, 'a_contacter', clock('2026-01-03')).nextAction).toBe('Perso');
    // nouvelle étape : l'action manuelle est obsolète
    const after = changeStatus(app, tracker, 'entretien', clock('2026-01-03'));
    expect(after.nextAction).toBe("Préparer l'entretien / la prochaine étape");
  });

  it('une action saisie en même temps que le changement de statut est gardée', () => {
    const app = applyPatch(newApp(), tracker, { statusId: 'entretien', nextAction: 'Réviser SQL' }, clock('2026-01-02'));
    expect(app.statusId).toBe('entretien');
    expect(app.nextAction).toBe('Réviser SQL');
    expect(app.nextActionIsAuto).toBe(false);
  });

  it('les relances successives au sein de « en attente » gardent une action manuelle', () => {
    let app = markSent(newApp(), tracker, '2026-01-10', clock('2026-01-10'));
    app = applyPatch(app, tracker, { nextAction: 'Appeler Paul' }, clock('2026-01-11'));
    app = recordFollowUp(app, tracker, '2026-01-17', clock('2026-01-17'));
    expect(app.nextAction).toBe('Appeler Paul');
  });

  it('vider la prochaine action réactive la suggestion', () => {
    const app = applyPatch(newApp({ nextAction: 'Perso' }), tracker, { nextAction: '' }, clock('2026-01-02'));
    expect(app.nextActionIsAuto).toBe(true);
    expect(app.nextAction).toBe('Envoyer la candidature');
  });
});

describe('tâches et statistiques', () => {
  it('liste les relances dues et à venir, triées', () => {
    const a = markSent(newApp({ company: 'A' }), tracker, '2026-01-01', clock('2026-01-01'));
    const b = markSent(newApp({ company: 'B' }), tracker, '2026-01-08', clock('2026-01-08'));
    const c = markSent(newApp({ company: 'C' }), tracker, '2026-03-01', clock('2026-03-01'));
    const tasks = computeTasks([tracker], [c, b, a], '2026-01-10');
    expect(tasks.map((t) => t.label)).toEqual(['Relancer A', 'Relancer B']);
    expect(tasks[0].inDays).toBe(-2);
  });

  it('calcule le taux de réponse', () => {
    const apps = [
      newApp(),
      markSent(newApp(), tracker, '2026-01-01', clock('2026-01-01')),
      changeStatus(newApp(), tracker, 'entretien', clock('2026-01-01')),
      changeStatus(newApp(), tracker, 'refusee', clock('2026-01-01')),
    ];
    const stats = computeStats(tracker, apps, '2026-01-02');
    expect(stats.total).toBe(4);
    expect(stats.sent).toBe(3);
    expect(stats.responses).toBe(2);
    expect(stats.responseRate).toBe(67);
  });
});

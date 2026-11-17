/**
 * Données de démarrage : le tableau de suivi de stage existant, importé au
 * premier lancement pour ne rien ressaisir.
 */
import type { AppData } from '@/domain/types';
import type { NewApplicationInput } from '@/domain/application';
import type { Clock } from '@/domain/automation';
import { today } from '@/lib/dates';
import { createApplication } from '@/domain/application';
import { createTracker } from '@/domain/templates';
import { CURRENT_SCHEMA_VERSION } from '@/storage/schema';
import { STAGE_CONTACTS } from './contacts';

const STAGE_ROWS: NewApplicationInput[] = [
  { company: 'Enedis', city: 'Chambéry', type: 'Offre', position: 'Développeur informatique et valorisation des données', nextAction: 'Postuler en précisant début 15/02 au lieu du 01/02', link: 'https://www.enedis.fr/emploi/182110/stage-developpeur-informatique-et-valorisation-des-donnees-fh', notes: 'Bac+2/3, Power BI, SQL, Power Automate' },
  { company: 'BPCE Infogérance & Technologies', city: 'Charenton-le-Pont', type: 'Offre', position: 'Développeur Backend Python, 3 à 6 mois', nextAction: "Message LinkedIn à Thibaud Passet d'abord", link: 'https://freehire.me/jobs/stage-3-a-6-mois-developpeur-backend-python-f-h-bpce-infogerance-technologies-r425ovir', notes: 'Offre vise Bac+5 en 4e année' },
  { company: 'ASN', city: 'Les Ulis', type: 'Offre', position: 'Stage Base de données Python/Java', nextAction: 'Vérifier contrôle de sécurité pour non-Français', link: 'https://www.linkedin.com/jobs/view/4484094359', notes: 'Nucléaire : à vérifier' },
  { company: 'CEA', city: 'Le Bourget-du-Lac', type: 'Offre', position: 'Traitement des données, BUT/BTS, Python', nextAction: 'Demander durée 14-16 sem. et zone protégée', link: 'https://farmaroc.net/2026-42070-stage-but-traitements-des-donnees-h-f', notes: '2 à 3 mois annoncé. Nucléaire : à vérifier' },
  { company: 'Hager', city: 'Obernai', type: 'Offre', position: 'Informatique & Data Excellence, 4 à 6 mois', nextAction: 'Demander si début 15/02 possible', link: 'https://www.stage.fr/job/11642034/', notes: 'Début annoncé janvier 2027' },
  { company: 'Capgemini', city: 'Grenoble', type: 'Offre', position: 'Data Engineer', nextAction: 'Postuler, pari Bac+5', link: 'https://www.stage.fr/job/20086388/', notes: 'Python, PostgreSQL, cloud' },
  { company: 'Astek', city: 'La Défense', type: 'Offre', position: 'Ingénieur innovation informatique et sciences des données', nextAction: 'Postuler en précisant BUT3 et 16 sem.', link: 'https://www.jobteaser.com/en/job-offers/8f87bf33-ab7c-4b10-af03-050e0692966b-astek-stage-stage-fin-d-etudes-ingenieur-innovation-en-informatique-sciences-des-donnees-paris-france-h-f', notes: '4 à 6 mois, début janv.-avril 2027' },
  { company: 'CA-TS Crédit Agricole', city: 'Paris', type: 'Offre', position: 'Data Engineer', nextAction: 'Demander si 16 sem. acceptable', link: 'https://www.linkedin.com/jobs/view/4480086039', notes: '6 mois annoncé, Python/PostgreSQL/Docker' },
  { company: 'Soget', city: 'Le Havre', type: 'Spontanée', position: 'Données portuaires critiques', nextAction: 'Écrire à Julien Prével et demander le manager data/IT', notes: "Partenaire de l'École 42 Le Havre" },
  { company: 'Groupe Sogestran', city: 'Le Havre', type: 'Spontanée', position: 'Équipe BI/Data existante', nextAction: "Proposer un stage BI/Data à Vincent Millet", notes: 'Recrute un alternant BI/Data' },
  { company: 'Data Concept', city: 'Le Havre', type: 'Spontanée', position: 'Logiciels transport et logistique', nextAction: 'Écrire à Serge Rouxel' },
  { company: 'Artelia Digital Solutions', city: 'Le Havre', type: 'Spontanée', position: 'Ingénierie numérique', nextAction: 'Écrire à Cyrille Brichant' },
  { company: 'Koesio', city: 'Le Havre', type: 'Spontanée', position: 'ESN PME et collectivités', nextAction: 'Identifier le responsable de l’agence du Havre' },
  { company: 'Scaleway (ex-Saagie)', city: 'Rouen', type: 'Spontanée', position: 'Orchestration de traitements de données', nextAction: 'Écrire à Arnaud Muller' },
  { company: 'YesWeHack', city: 'Rouen / Paris', type: 'Spontanée', position: 'Sécurité, équipe dev PHP/Symfony', nextAction: 'Vérifier jobs.yeswehack.com puis écrire à Romain Lecoeuvre', link: 'https://jobs.yeswehack.com' },
  { company: 'Sinay', city: 'Caen', type: 'Spontanée', position: 'Données maritimes, 350 To', nextAction: 'Écrire à David Lelouvier', notes: 'Partenaire Smart Port City Le Havre' },
  { company: 'Attineos', city: 'Rouen / Caen / Paris', type: 'Spontanée', position: 'ESN', nextAction: 'Écrire à Stéphane Merai, demander l’agence de Rouen', link: 'https://www.attineos.com/' },
  { company: 'Wiremind', city: 'Paris', type: 'Spontanée', position: 'Startup data', nextAction: 'Écrire à Constant Roques' },
  { company: 'Didomi', city: 'Paris', type: 'Spontanée', position: 'Données personnelles, consentement', nextAction: 'Écrire au CTO (Tiberiu)' },
  { company: 'Zama', city: 'Paris', type: 'Spontanée', position: 'Chiffrement homomorphe', nextAction: "Préparer l'argument RSA", notes: 'Exigeant techniquement' },
  { company: 'Astran', city: 'Paris', type: 'Spontanée', position: 'Protection des données cloud', nextAction: 'Écrire à Gilles Seghaier', notes: 'Exigeant techniquement' },
  { company: 'Evertrust', city: 'Paris', type: 'Spontanée', position: 'Certificats numériques / PKI', nextAction: 'Écrire à Alexandre Aufrère' },
  { company: 'Patrowl', city: 'Paris', type: 'Spontanée', position: 'Surveillance sécurité continue', nextAction: 'Écrire à Vladimir Kolla' },
];

export function buildSeedData(clock: Clock = { today: today(), now: new Date().toISOString() }): AppData {
  const tracker = createTracker('stage', { name: 'Stage 2027', description: 'Stage de fin de BUT, début mi-février, 14 à 16 semaines.' }, clock.now);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    trackers: [tracker],
    applications: STAGE_ROWS.map((row) => createApplication(tracker, { ...row, ...STAGE_CONTACTS[row.company ?? ''] }, clock)),
  };
}

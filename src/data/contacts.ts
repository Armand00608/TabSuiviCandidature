/**
 * Interlocuteurs identifiés pour chaque piste du suivi « Stage 2027 »
 * (recherche web publique, novembre 2026). Les rôles viennent d'articles,
 * de pages équipe ou d'annuaires d'entreprises : à vérifier sur LinkedIn
 * avant d'écrire, car les postes changent vite.
 *
 * `contactInfo` pointe vers une recherche LinkedIn qui retrouve la personne
 * (ou, à défaut de nom, les bons profils dans l'entreprise).
 */

export interface ContactLead {
  contactName: string;
  contactInfo: string;
}

export const linkedinSearch = (keywords: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

export const STAGE_CONTACTS: Record<string, ContactLead> = {
  // Offres de grands groupes : le bon interlocuteur est le recruteur ou le manager de l'offre.
  Enedis: {
    contactName: 'Recruteur·se de l’offre (à identifier)',
    contactInfo: linkedinSearch('Enedis chargé de recrutement Alpes'),
  },
  'BPCE Infogérance & Technologies': {
    contactName: 'Thibaud Passet',
    contactInfo: linkedinSearch('Thibaud Passet BPCE'),
  },
  ASN: {
    contactName: 'Responsable du stage (à identifier)',
    contactInfo: linkedinSearch('ASNR Les Ulis systèmes d’information'),
  },
  CEA: {
    contactName: 'Responsable du stage (à identifier)',
    contactInfo: linkedinSearch('CEA Le Bourget-du-Lac données'),
  },
  Hager: {
    contactName: 'Manager Data Excellence (à identifier)',
    contactInfo: linkedinSearch('Hager Group Data Excellence Obernai'),
  },
  Capgemini: {
    contactName: 'Manager Data Engineering Grenoble (à identifier)',
    contactInfo: linkedinSearch('Capgemini Grenoble data engineering manager'),
  },
  Astek: {
    contactName: 'Chargé·e de recrutement stages (à identifier)',
    contactInfo: linkedinSearch('Astek talent acquisition stage'),
  },
  'CA-TS Crédit Agricole': {
    contactName: 'Manager Data Engineering (à identifier)',
    contactInfo: linkedinSearch('CA-TS Crédit Agricole data engineering manager'),
  },

  // Candidatures spontanées : nom identifié par recherche publique.
  Soget: {
    contactName: 'Julien Prével – Directeur général (ex-responsable SI)',
    contactInfo: linkedinSearch('Julien Prével Soget'),
  },
  'Groupe Sogestran': {
    contactName: 'Vincent Millet – DSI et organisation',
    contactInfo: linkedinSearch('Vincent Millet Sogestran'),
  },
  'Data Concept': {
    contactName: 'Serge Rouxel – Dirigeant (repreneur en 2019)',
    contactInfo: linkedinSearch('Serge Rouxel Data Concept'),
  },
  'Artelia Digital Solutions': {
    contactName: 'Cyrille Brichant – Directeur Technology & Performance et Artelia Digital Solutions',
    contactInfo: linkedinSearch('Cyrille Brichant Artelia'),
  },
  Koesio: {
    contactName: 'Thierry Parent – DG Koesio Ouest (agence du Havre à préciser)',
    contactInfo: linkedinSearch('Koesio Le Havre'),
  },
  'Scaleway (ex-Saagie)': {
    contactName: 'Arnaud Muller – Fondateur de Saagie',
    contactInfo: linkedinSearch('Arnaud Muller Saagie'),
  },
  YesWeHack: {
    contactName: 'Romain Lecoeuvre – CTO, cofondateur',
    contactInfo: linkedinSearch('Romain Lecoeuvre YesWeHack'),
  },
  Sinay: {
    contactName: 'David Lelouvier – Managing Director & CPO (data, IA)',
    contactInfo: linkedinSearch('David Lelouvier Sinay'),
  },
  Attineos: {
    contactName: 'Stéphane Merai – Directeur général',
    contactInfo: linkedinSearch('Stéphane Merai Attineos'),
  },
  Wiremind: {
    contactName: 'Constant Roques – Head of Data (ou Charles Pierre, CTO)',
    contactInfo: linkedinSearch('Constant Roques Wiremind'),
  },
  Didomi: {
    contactName: 'Tiberiu – CTO (nom à compléter)',
    contactInfo: linkedinSearch('Didomi CTO Tiberiu'),
  },
  Zama: {
    contactName: 'Pascal Paillier – CTO, cofondateur',
    contactInfo: linkedinSearch('Pascal Paillier Zama'),
  },
  Astran: {
    contactName: 'Gilles Seghaier – CTO, cofondateur',
    contactInfo: linkedinSearch('Gilles Seghaier Astran'),
  },
  Evertrust: {
    contactName: 'Alexandre Aufrère – Founder & CTO',
    contactInfo: linkedinSearch('Alexandre Aufrère Evertrust'),
  },
  Patrowl: {
    contactName: 'Vladimir Kolla – CTO, cofondateur',
    contactInfo: linkedinSearch('Vladimir Kolla Patrowl'),
  },
};

# TabSuiviCandidature

Site pour suivre ses candidatures (stage, alternance, emploi…), avec **plusieurs suivis indépendants** et des **relances automatiques**.

Au premier lancement, le suivi « Stage 2027 » est pré-rempli avec les 23 pistes du tableau d'origine.

## Fonctionnalités

- **Plusieurs suivis** (Stage, Alternance, Emploi, Vierge) : chacun a ses propres statuts, types de candidature, champs personnalisés (rythme d'alternance, gratification…) et réglages.
- **Automatisations**
  - passage d'une candidature en « envoyée » → date d'envoi renseignée, **relance planifiée à J+7** (délai réglable) ;
  - « J'ai relancé » → relance suivante replanifiée, statut « Relancée » ;
  - après le nombre max de relances et X jours sans réponse → piste signalée « froide » (ou close automatiquement si activé) ;
  - **prochaine action proposée automatiquement** (✨) selon l'étape ; une action écrite à la main est conservée tant que l'étape ne change pas ;
  - liste **« À faire »** (relances dues / en retard, échéances) sur le tableau de bord, tous suivis confondus ;
  - historique de chaque candidature tenu automatiquement.
- Vue **tableau** (tri, recherche, filtres) et vue **Kanban** (glisser-déposer pour changer de statut).
- **Import** par copier-coller depuis Excel / Google Sheets ou fichier CSV (colonnes reconnues automatiquement), **export CSV** compatible Excel.
  Pour une entreprise déjà suivie, l'import peut **compléter ses champs vides** (contact, lien…) sans rien écraser.
- **Contacts** : `data/contacts-stage-2027.csv` liste un interlocuteur pour chacune des 23 pistes du suivi « Stage 2027 », avec un lien de recherche LinkedIn et, pour 13 d'entre elles, un **email pro probable** (déduit du format d'adresse le plus courant de l'entreprise, non vérifié). Ils sont ajoutés automatiquement aux données déjà enregistrées dans le navigateur (migration v2 : seuls les champs vides sont remplis, et une prochaine action n'est remplacée que si elle n'a pas été modifiée).
- **Sauvegarde / restauration** JSON. Les données sont stockées dans le navigateur (aucun compte, aucun serveur) et synchronisées entre onglets.
- Thème clair / sombre automatique, responsive mobile.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires du moteur
npm run build      # build de production dans dist/
```

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` teste, construit et déploie automatiquement à chaque push sur `main`.
À activer une fois : *Settings → Pages → Build and deployment → Source : GitHub Actions*.

## Architecture

```
src/
├── domain/              Logique métier pure (aucune dépendance React), testée
│   ├── types.ts         Modèle : Tracker (suivi), Application (candidature), StatusDef…
│   ├── templates.ts     Modèles de suivi (stage, alternance, emploi, vierge)
│   ├── status.ts        Catégories de statut et helpers
│   ├── automation.ts    Moteur : relances, pistes froides, actions suggérées, transitions, tâches, stats
│   ├── application.ts   Fabrique de candidature
│   ├── query.ts         Filtres et tris
│   └── tableIO.ts       Import / export tableur (reconnaissance des colonnes)
├── storage/             Persistance
│   ├── repository.ts    Interface Repository (remplaçable par une API / Supabase…)
│   ├── localStorageRepository.ts
│   └── schema.ts        Validation + migrations des données (versionnées)
├── state/               Reducer pur + StoreProvider (contexte React, persistance, rafraîchissement quotidien)
├── features/            Écrans : dashboard, trackers, applications, import, settings, layout
├── components/          Composants UI génériques (Overlay, Field, Status, Toast)
├── lib/                 Utilitaires (dates, CSV, ids…)
└── data/seed.ts         Données de départ
```

Principes :

- **Les statuts ont une catégorie** (`todo`, `waiting`, `active`, `positive`, `rejected`, `closed`) : c'est elle qui pilote les automatisations, donc on peut renommer / ajouter des statuts sans rien casser.
- **Le domaine est pur** : toutes les règles sont des fonctions `(candidature, suivi, horloge) → nouvelle candidature`, faciles à tester.
- **La persistance est derrière une interface** : passer à un backend (synchronisation multi-appareils) ne demande qu'une nouvelle implémentation de `Repository`.

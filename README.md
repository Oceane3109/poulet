# AKOHO — Gestion de ferme avicole

Résumé
---
AKOHO est une application web légère pour la gestion d'une ferme avicole : lots, couvaison, éclosion, production d'œufs, pertes, ventes et analyse de rentabilité. Backend Node.js/Express avec base SQL Server (conteneur Docker). Frontend en JavaScript vanilla et CSS.

Fonctionnalités principales
---
- Gestion des lots (création, cession)
- Couvaisons et éclosions (auto-création de pertes si nécessaire)
- Production d'œufs (saisie, KPI, stock)
- Pertes (entité Poulet/Oeuf, causes)
- Ventes (œufs/poulets/cession de lot) avec estimations poids/prix
- Calendrier avec plage de dates et filtres par type d'événement
- Dashboard et vue rentabilité par lot

Prérequis
---
- Node.js 16+ (ou version LTS) et npm
- Docker (pour exécuter SQL Server)

Installation & démarrage
---
1. Cloner le dépôt dans votre workspace.
2. Copier `.env.example` → `.env` et configurer les variables (ex : SA password).
3. Démarrer SQL Server (Docker) :

```bash
# exemple (adapté selon vos scripts)
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Oceane123A" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

4. Installer les dépendances et lancer le serveur :

```bash
npm install
npm run dev
```

5. Initialiser la base (si besoin) : exécuter `db/init.js` ou importer `db/schema.sql` + `db/data.sql` selon les outils locaux.

Configuration
---
Fichiers importants :
- `server.js` — point d'entrée backend
- `routes/api.js` — endpoints REST
- `db/connection.js` — configuration mssql
- `db/schema.sql`, `db/data.sql` — schéma & données d'exemple
- `public/` — frontend statique (pages, js, css)

Pages principales (frontend)
---
- `/pages/dashboard.html`
- `/pages/calendrier.html` — calendrier avec sélection de plage et toggles
- `/pages/oeufs.html` — production d'œufs
- `/pages/pertes.html` — pertes / mortalité
- `/pages/couvaison.html` — gestion couvaison / éclosion
- `/pages/ventes.html` — ventes (œufs / poulets / cession)
- `/pages/rentabilite.html` — analyse financière

Points techniques / notes de dev
---
- Utilise `mssql` (pool) côté serveur. Les inserts sensibles aux triggers sont gérés via `SCOPE_IDENTITY()`.
- Frontend: Vanilla JS, helper `isoLocal()` pour éviter le décalage UTC.
- Événements DOM asynchrones : `partialsReady` est dispatché après rendu des partials.
- Calendrier supporte plages, filtrage par type, et affichage détaillé.

Améliorations possibles
---
- Ajouter tests unitaires/backend e2e
- Introduire un petit CSS-builder (PostCSS) ou bundler pour faciliter la maintenance
- Ajouter validations côté frontend et tests d'intégration DB
- Structurer le code JS frontend en modules ES6 pour faciliter la réutilisation

Contribuer
---
- Ouvrir une issue pour discuter la feature/bug
- Faire une branche nommée `feat/...` ou `fix/...` puis PR

Licence
---
Projet privé / interne (ajouter licence si souhaité)

Contact
---
Pour questions, référez-vous aux commentaires et aux fonctions dans `routes/api.js` et aux fichiers JS sous `public/js/pages/`.

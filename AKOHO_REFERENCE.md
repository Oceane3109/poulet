# AKOHO — Référentiel technique complet

> Application web de gestion industrialisée d'élevage de poulets pondeuses par lots.  
> Document consolidé — Mars 2026

---

## Table des matières

1. [Présentation et périmètre fonctionnel](#1-présentation-et-périmètre-fonctionnel)
2. [Architecture technique](#2-architecture-technique)
3. [Base de données SQL Server](#3-base-de-données-sql-server)
4. [API REST — contrats d'interface](#4-api-rest--contrats-dinterface)
5. [Frontend — pages et fonctionnalités](#5-frontend--pages-et-fonctionnalités)
6. [Logique métier clé](#6-logique-métier-clé)
7. [Conventions de développement](#7-conventions-de-développement)
8. [Données de test](#8-données-de-test)
9. [État d'avancement consolidé](#9-état-davancement-consolidé)
10. [Fonctionnalités restantes à implémenter](#10-fonctionnalités-restantes-à-implémenter)
11. [Décisions de conception et justifications](#11-décisions-de-conception-et-justifications)

---

## 1. Présentation et périmètre fonctionnel

**AKOHO** est une application web de gestion d'élevage de poules pondeuses organisées en lots. Elle couvre l'intégralité du cycle de vie d'un lot, depuis l'acquisition (achat ou éclosion interne) jusqu'à la réforme ou la cession.

### 1.1 Principes fondateurs

**Tout est horodaté.** Chaque événement (ponte, vente, perte, couvaison) est associé à une date. Cela permet de reconstituer l'état exact de l'élevage à n'importe quelle date passée sans modifier les données historiques.

**La date est un paramètre.** Toutes les fonctions de calcul (stock, nombre de poules, rentabilité) acceptent une date en entrée. Le tableau de bord, les KPIs et les graphiques sont donc tous paramétrables dans le temps.

**Un lot, une identité.** Un lot est un groupe homogène de poulets — même race, même date d'arrivée — géré comme une entité cohérente sur toute sa durée de vie.

### 1.2 Domaines fonctionnels couverts

| Domaine | Description |
|---------|-------------|
| **Référentiels** | Races (prix œuf, prix/kg), aliments (prix/gramme) |
| **Lots** | Création (achat ou issue de couvaison), suivi, historique complet |
| **Fiches de croissance** | Plan alimentaire hebdomadaire par lot ou par race |
| **Production** | Saisie quotidienne de la ponte par lot |
| **Couvaison** | Incubation d'œufs, cycle 45 jours, création du lot fils à l'éclosion |
| **Pertes / Mortalité** | Enregistrement avec cause, calcul de l'effectif vivant |
| **Ventes** | Ventes d'œufs, de poulets au poids, cession intégrale d'un lot |
| **Rentabilité** | Bénéfice net calculé à une date quelconque par lot |
| **Calendrier** | Vue chronologique de tous les événements |

### 1.3 Ce qui est délibérément hors périmètre (v1)

- Gestion multi-utilisateurs / authentification
- Consommation alimentaire réelle (le coût est estimé depuis la fiche, pas mesuré)
- Suivi du poids réel des poulets (le suivi de poids de la fiche est un plan, pas une mesure)
- Traçabilité sanitaire détaillée (vaccins, traitements)

---

## 2. Architecture technique

### 2.1 Structure des fichiers

```
AKOHO/
├── app/
│   ├── server.js                   # Serveur Express — point d'entrée
│   │                               #   PORT défini dans .env (défaut : 80)
│   │                               #   Sert les fichiers statiques de public/
│   │                               #   Monte les routes API
│   ├── config/
│   │   └── database.js             # Pool de connexions SQL Server
│   │                               #   export getPool() → réutilisé dans toutes les routes
│   ├── routes/
│   │   └── api.js                  # Toutes les routes REST préfixées /api
│   └── public/                     # Servi statiquement par Express
│       ├── assets/                 # Build CSS/JS (vendor-bootstrap, vendor-charts, main...)
│       │                           #   Les fichiers ont des hash dans leur nom (ex: vendor-bootstrap-C9iorZI5.js)
│       ├── pages/                  # Pages HTML (une par module fonctionnel)
│       │   ├── dashboard.html
│       │   ├── lots.html
│       │   ├── fiches.html
│       │   ├── oeufs.html
│       │   ├── pertes.html
│       │   ├── couvaison.html
│       │   ├── ventes.html
│       │   ├── rentabilite.html
│       │   ├── races.html
│       │   ├── nourriture.html
│       │   ├── calendrier.html
│       │   ├── api.html
│       │   └── settings.html
│       ├── partials/               # Fragments HTML injectés dynamiquement
│       │   ├── header.html         # Barre supérieure : thème, date picker global
│       │   ├── aside.html          # Sidebar (contenu statique — liens générés par JS)
│       │   └── footer.html
│       └── js/
│           ├── api.js              # Client API centralisé — toutes les fonctions fetch()
│           ├── layout.js           # Injection partials + événements globaux
│           ├── sidebar.js          # Génération dynamique de la navigation
│           └── pages/              # Un fichier JS par page HTML
│               ├── dashboard.js
│               ├── lots.js
│               ├── fiches.js
│               ├── oeufs.js
│               ├── pertes.js
│               ├── couvaison.js
│               ├── ventes.js
│               ├── rentabilite.js
│               ├── races.js
│               ├── nourriture.js
│               ├── calendrier.js
│               └── api.js
├── Conception/
│   ├── base.sql                    # Schéma complet (tables, triggers, fonctions, vues)
│   └── data.sql                    # Données de test — réinitialisables à la demande
└── Doc/
    └── PROJECT.md                  # Ce document
```

### 2.2 Stack

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Runtime serveur | Node.js + Express | HTTP, routes REST, service des fichiers statiques |
| Base de données | Microsoft SQL Server | Persistance, logique métier (fonctions, triggers) |
| Connecteur SQL | `mssql` | Pool de connexions, requêtes paramétrées |
| Frontend | HTML5 + Vanilla JavaScript | Interface utilisateur, aucune dépendance framework |
| CSS / composants | Bootstrap 5.3.2 | Mise en page, composants (modals, tableaux, badges...) |
| Graphiques | Chart.js 4.4.4 | Lignes, doughnuts, barres |
| Icônes | Bootstrap Icons 1.11.3 | `<i class="bi bi-...">` |
| Police | Inter (Google Fonts) | |
| Variables d'env | dotenv | DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD, DB_ENCRYPT, PORT |

### 2.3 Configuration (.env)

```
DB_SERVER=localhost
DB_DATABASE=akoho
DB_USER=sa
DB_PASSWORD=<mot_de_passe>
DB_ENCRYPT=false
PORT=80
NODE_ENV=development
```

### 2.4 Format des réponses API

Toutes les réponses suivent un contrat unique :

```json
{ "data": <valeur ou tableau>, "error": null }
{ "data": null, "error": "message d'erreur lisible" }
```

**Règle absolue :** aucune page HTML ne fait de `fetch()` direct. Toute communication réseau passe exclusivement par les méthodes de l'objet `API` dans `api.js`.

### 2.5 Cycle de vie d'une page

Chaque page HTML suit le même cycle :

1. Le navigateur charge les assets (CSS + JS vendor en `type="module"`)
2. `layout.js` lance en parallèle trois `fetch()` pour injecter header, aside et footer dans leurs conteneurs (`#partial-header`, `#partial-aside`, `#partial-footer`)
3. Une fois les trois injections terminées, `layout.js` émet l'événement `partialsReady` sur `document`
4. Le script de la page (`pages/xxx.js`) écoute `partialsReady` et déclenche ses appels API initiaux
5. Le date picker global dans le header émet `dateChanged` à chaque changement de date
6. Les pages sensibles à la date (dashboard, oeufs, rentabilité, pertes...) écoutent `dateChanged` et rechargent automatiquement leurs données

### 2.6 Helpers globaux (exposés par layout.js)

| Fonction | Description |
|----------|-------------|
| `getSelectedDate()` | Retourne la date sélectionnée globalement (string `YYYY-MM-DD`) |
| `showToast(message, type)` | Affiche une notification Bootstrap toast (types : success, danger, warning, info) |
| `SidebarBadge.set('badge-id', count)` | Met à jour le badge numérique d'un lien de la sidebar |

### 2.7 Ordre de chargement des scripts dans chaque page

```html
<!-- Assets build (en type="module") -->
<script type="module" src="/assets/vendor-bootstrap-C9iorZI5.js"></script>
<script type="module" src="/assets/vendor-charts-DGwYAWel.js"></script>
<script type="module" src="/assets/vendor-ui-CflGdlft.js"></script>
<script type="module" src="/assets/main-DwHigVru.js"></script>
<link rel="stylesheet" href="/assets/main-QD_VOj1Y.css">

<!-- Avant </body> -->
<script src="/js/api.js"></script>
<script src="/js/sidebar.js"></script>
<script src="/js/layout.js"></script>
<script src="/js/pages/[page].js"></script>
```

---

## 3. Base de données SQL Server

La base s'appelle `akoho`. La syntaxe cible est T-SQL (SQL Server).

> **Contraintes syntaxiques SQL Server :**
> - Clés auto-incrémentées : `IDENTITY(1,1)` (pas `AUTO_INCREMENT`)
> - Date du jour sans heure : `CAST(GETDATE() AS DATE)`
> - Séparateur de batch obligatoire : `GO` entre chaque `CREATE FUNCTION`, `CREATE VIEW`, `CREATE TRIGGER`
> - Interdiction d'`ORDER BY` dans une `CREATE VIEW`
> - Les fonctions scalaires doivent être appelées avec le préfixe `dbo.` : `dbo.fn_nombre_actuel(...)`

### 3.1 Tables de référence

#### `race`

```sql
CREATE TABLE race (
    id_race     INT PRIMARY KEY IDENTITY(1,1),
    nom_race    VARCHAR(255) NOT NULL,
    prix_oeuf   FLOAT NOT NULL,   -- prix de vente d'un œuf (Ar)
    prix_kg     FLOAT NOT NULL,   -- prix de vente poulet/kg (Ar)
    description VARCHAR(500) NULL
);
```

#### `nourriture`

```sql
CREATE TABLE nourriture (
    id_nourriture  INT PRIMARY KEY IDENTITY(1,1),
    nom_nourriture VARCHAR(255) NOT NULL,
    prix_gramme    FLOAT NOT NULL,    -- Ar/gramme
    type_aliment   VARCHAR(50) NULL   -- Granulés, Mash, Démarrage, Croissance
);
```

#### `fiche_model`

Modèle de plan de croissance (template). Séparé des lignes pour permettre la réutilisation entre plusieurs lots.

```sql
CREATE TABLE fiche_model (
    id_fiche  INT PRIMARY KEY IDENTITY(1,1),
    id_race   INT NOT NULL REFERENCES race(id_race),
    type      VARCHAR(20) NOT NULL DEFAULT 'concessionnaire',
    -- 'concessionnaire' = fournie par le fournisseur des poussins
    -- 'defaut'          = fiche standard par race si pas de concessionnaire
    label     VARCHAR(255) NULL
);
```

#### `fiche_row`

Une ligne = une semaine du plan alimentaire.

```sql
CREATE TABLE fiche_row (
    id_row        INT PRIMARY KEY IDENTITY(1,1),
    id_fiche      INT NOT NULL REFERENCES fiche_model(id_fiche),
    semaine       INT NOT NULL,    -- numéro dans la fiche : 1, 2, 3...
    age           INT NOT NULL,    -- âge absolu du lot à cette semaine
    variation     FLOAT NOT NULL,  -- évolution de poids estimée (g/semaine)
    id_nourriture INT NOT NULL REFERENCES nourriture(id_nourriture),
    poids         FLOAT NOT NULL   -- quantité nourriture/poulet/semaine (g)
);
```

> **Règle métier :** les semaines sont saisies en ordre croissant strict. Il est impossible de sauter une semaine. Seule la dernière ligne peut être supprimée afin de garantir la continuité de la fiche.

### 3.2 Table centrale : `lot`

```sql
CREATE TABLE lot (
    id_lot       INT PRIMARY KEY IDENTITY(1,1),
    nom_lot      VARCHAR(255) NOT NULL,
    id_race      INT NOT NULL REFERENCES race(id_race),
    age_arrivee  INT NOT NULL,          -- âge en semaines à l'arrivée
    nombre       INT NOT NULL,          -- nombre de poules à l'arrivée
    date_arrivee DATE NOT NULL,
    prix_achat   FLOAT NOT NULL DEFAULT 0,
    origine      VARCHAR(50) NOT NULL,  -- 'achat' | 'couvaison'
    id_lot_mere  INT REFERENCES lot(id_lot) NULL,
    id_fiche     INT REFERENCES fiche_model(id_fiche) NULL
);
```

**Règles métier :**
- Si `origine = 'couvaison'` → `prix_achat = 0` et `id_lot_mere` est obligatoire
- Si `id_fiche` est renseigné → le trigger `trg_lot_sync_race_from_fiche` synchronise `id_race` automatiquement
- Un lot issu de couvaison hérite de `id_fiche` du lot mère

### 3.3 Tables d'événements

#### `production_oeuf`
```sql
CREATE TABLE production_oeuf (
    id_production   INT PRIMARY KEY IDENTITY(1,1),
    id_lot          INT NOT NULL REFERENCES lot(id_lot),
    date_production DATE NOT NULL,
    nb_oeufs        INT NOT NULL
);
```

#### `vente_oeuf`
```sql
CREATE TABLE vente_oeuf (
    id_vente      INT PRIMARY KEY IDENTITY(1,1),
    id_lot        INT NOT NULL REFERENCES lot(id_lot),
    date_vente    DATE NOT NULL,
    nb_oeufs      INT NOT NULL,
    prix_unitaire FLOAT NULL,    -- NULL → trigger remplit depuis race.prix_oeuf
    prix_total    AS (nb_oeufs * prix_unitaire) PERSISTED
);
```

#### `oeuf_couvaison`
```sql
CREATE TABLE oeuf_couvaison (
    id_couvaison        INT PRIMARY KEY IDENTITY(1,1),
    id_lot_mere         INT NOT NULL REFERENCES lot(id_lot),
    date_mise_couvaison DATE NOT NULL,
    nb_oeufs_couves     INT NOT NULL,
    date_eclosion       AS (DATEADD(DAY, 45, date_mise_couvaison)) PERSISTED,
    nb_ecloses          INT NULL,   -- NULL = en cours ; rempli à l'éclosion
    id_lot_ne           INT REFERENCES lot(id_lot) NULL  -- lot créé à l'éclosion
);
```

> **Durée d'incubation :** 45 jours, codée en dur dans la colonne calculée SQL et dans la constante `COUVAISON_DAYS = 45` côté frontend.

#### `perte`
```sql
CREATE TABLE perte (
    id_perte   INT PRIMARY KEY IDENTITY(1,1),
    id_lot     INT NOT NULL REFERENCES lot(id_lot),
    date_perte DATE NOT NULL,
    nb_perdus  INT NOT NULL,
    cause      VARCHAR(255) NULL   -- NULL = cause inconnue
);
```

#### `vente_poulet`
```sql
CREATE TABLE vente_poulet (
    id_vente       INT PRIMARY KEY IDENTITY(1,1),
    id_lot         INT NOT NULL REFERENCES lot(id_lot),
    date_vente     DATE NOT NULL,
    nb_poulets     INT NOT NULL,
    poids_total_kg FLOAT NOT NULL,
    prix_kg        FLOAT NULL,    -- NULL → trigger remplit depuis race.prix_kg
    prix_total     AS (poids_total_kg * prix_kg) PERSISTED
);
```

#### `vente_lot`
```sql
CREATE TABLE vente_lot (
    id_vente   INT PRIMARY KEY IDENTITY(1,1),
    id_lot     INT NOT NULL REFERENCES lot(id_lot),
    date_vente DATE NOT NULL,
    prix_vente FLOAT NOT NULL
);
```

### 3.4 Colonnes calculées (PERSISTED)

| Table | Colonne | Expression SQL |
|-------|---------|---------------|
| `oeuf_couvaison` | `date_eclosion` | `DATEADD(DAY, 45, date_mise_couvaison)` |
| `vente_oeuf` | `prix_total` | `nb_oeufs * prix_unitaire` |
| `vente_poulet` | `prix_total` | `poids_total_kg * prix_kg` |

Les colonnes `PERSISTED` sont calculées automatiquement et stockées physiquement — pas besoin de les calculer côté applicatif.

### 3.5 Triggers

#### `trg_lot_sync_race_from_fiche` — sur `lot` (AFTER INSERT, UPDATE)
Si `id_fiche` est renseigné, force `lot.id_race = fiche_model.id_race`. Garantit qu'un lot ne peut pas avoir une race différente de sa fiche de croissance.

#### `trg_vente_oeuf_set_price` — sur `vente_oeuf` (AFTER INSERT)
Si `prix_unitaire IS NULL` à l'insertion, lit `race.prix_oeuf` du lot et remplit le champ. Permet la saisie rapide au prix de référence de la race.

#### `trg_vente_poulet_set_price` — sur `vente_poulet` (AFTER INSERT)
Même principe : si `prix_kg IS NULL`, remplit depuis `race.prix_kg`.

> **Contrainte SQL Server — OUTPUT INSERTED.* :**
> La présence de ces triggers sur `vente_oeuf` et `vente_poulet` interdit l'usage direct de `OUTPUT INSERTED.*` dans les INSERT. Le contournement utilisé en Node.js :
> ```sql
> DECLARE @t TABLE (id_vente INT);
> INSERT INTO vente_oeuf (...) OUTPUT INSERTED.id_vente INTO @t VALUES (...);
> SELECT * FROM @t;
> ```

### 3.6 Fonctions scalaires

Toutes acceptent `@id_lot INT, @date DATE` et retournent une valeur calculée **à la date fournie**.

```sql
-- Semaine courante du lot à une date
fn_semaine_actuelle(@id_lot, @date)  → INT
    = age_arrivee + DATEDIFF(WEEK, date_arrivee, @date)

-- Nombre de poulets vivants à une date
fn_nombre_actuel(@id_lot, @date)  → INT
    = lot.nombre
      − Σ perte.nb_perdus       [date_perte ≤ @date]
      − Σ vente_poulet.nb       [date_vente ≤ @date]

-- Stock d'œufs disponibles à une date
fn_stock_oeufs(@id_lot, @date)  → INT
    = Σ production.nb_oeufs            [date_production ≤ @date]
      − Σ vente_oeuf.nb_oeufs          [date_vente ≤ @date]
      − Σ couvaison.nb_oeufs_couves    [date_mise_couvaison ≤ @date]

-- Coût nourriture cumulé selon la fiche
fn_cout_nourriture(@id_lot, @date)  → FLOAT
    = Σ(fiche_row.poids × nourriture.prix_gramme) × lot.nombre
      [fiche_row.semaine ≤ fn_semaine_actuelle(@id_lot, @date)]
    -- IMPORTANT : lot.nombre est multiplié HORS du SUM, pas dedans

-- Revenus totaux cumulés
fn_revenus_lot(@id_lot, @date)  → FLOAT
    = Σ vente_oeuf.prix_total    [date_vente ≤ @date]
      + Σ vente_poulet.prix_total [date_vente ≤ @date]
      + Σ vente_lot.prix_vente    [date_vente ≤ @date]

-- Bénéfice net
fn_benefice_net(@id_lot, @date)  → FLOAT
    = fn_revenus_lot − lot.prix_achat − fn_cout_nourriture

-- Prix de revient par œuf produit (NULL si 0 œuf)
fn_prix_revient_oeuf(@id_lot, @date)  → FLOAT NULL
    = (lot.prix_achat + fn_cout_nourriture) / Σ production.nb_oeufs
```

### 3.7 Fonctions table (TVF paramétrées)

Appelées avec `SELECT * FROM dbo.fn_xxx('2026-03-08')` ou `CAST(GETDATE() AS DATE)`.

#### `fn_dashboard(@date DATE)`

| Colonne | Description |
|---------|-------------|
| `id_lot`, `lot` | Identification du lot |
| `nb_mort_poulet` | Pertes **du jour seulement** (pas cumulées) |
| `atody_oeufs` | Production œufs **du jour seulement** |
| `prix_moyen_race` | Prix œuf de la race (`race.prix_oeuf`) |
| `prix_vente_jour` | CA vente œufs **du jour seulement** |
| `nombre_actuel` | Poulets vivants à `@date` (cumulé depuis arrivée) |
| `stock_oeufs` | Œufs en stock à `@date` (cumulé) |
| `semaine_actuelle` | Semaine de vie du lot à `@date` |

#### `fn_rentabilite(@date DATE)`

| Colonne | Description |
|---------|-------------|
| `id_lot`, `nom_lot`, `nom_race` | Identification |
| `cout_acquisition` | `lot.prix_achat` |
| `cout_nourriture_estime` | Via `fn_cout_nourriture` |
| `revenus_oeufs` | Total ventes œufs cumulé |
| `revenus_poulets` | Total ventes poulets + cessions lot cumulé |

### 3.8 Vues (raccourcis "aujourd'hui")

```sql
CREATE VIEW vue_dashboard  AS SELECT * FROM dbo.fn_dashboard(CAST(GETDATE() AS DATE));
CREATE VIEW vue_rentabilite AS SELECT * FROM dbo.fn_rentabilite(CAST(GETDATE() AS DATE));
```

---

## 4. API REST — Contrats d'interface

Toutes les routes sont préfixées `/api`. Le serveur écoute sur le port défini dans `.env`.

### 4.1 Utilitaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/status` | Test de connexion à la base |
| GET | `/api/schema` | Schéma complet (tables, colonnes, types) — pour l'explorateur API |
| GET | `/api/events?from=YYYY-MM-DD&to=YYYY-MM-DD` | Tous les événements sur une plage (calendrier) |

### 4.2 Tableau de bord et rentabilité

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dashboard?date=YYYY-MM-DD` | `SELECT * FROM dbo.fn_dashboard(@date)` |
| GET | `/api/rentabilite?date=YYYY-MM-DD` | `SELECT * FROM dbo.fn_rentabilite(@date)` |

### 4.3 Référentiels

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/races` | Liste avec `nb_lots` calculé |
| POST | `/api/races` | Créer une race |
| PUT | `/api/races/:id` | Modifier une race |
| DELETE | `/api/races/:id` | Supprimer (refus 400 si lots associés) |
| GET | `/api/nourriture` | Liste avec `nb_fiches` calculé |
| POST | `/api/nourriture` | Créer un aliment |
| PUT | `/api/nourriture/:id` | Modifier un aliment |
| DELETE | `/api/nourriture/:id` | Supprimer (refus 400 si utilisé dans une fiche) |

### 4.4 Fiches de croissance

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/fiches` | Liste des modèles (résumé, sans les lignes) |
| GET | `/api/fiches/:id` | Détail avec toutes les lignes triées par semaine |
| POST | `/api/fiches` | Créer un modèle de fiche |
| PUT | `/api/fiches/:id` | Remplacer toutes les lignes d'une fiche (stratégie replace-all) |
| DELETE | `/api/fiches/:id` | Supprimer (refus 400 si lots liés) |

> **Stratégie PUT fiche :** le backend supprime toutes les `fiche_row` existantes puis réinsère les nouvelles. Corps : `{ id_lot, semaines: [{semaine, age, id_nourriture, poids, variation}...] }`. Simplifie la gestion côté client — pas besoin de tracker les ajouts/suppressions individuels.

### 4.5 Lots

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/lots` | Liste avec `nom_race`, `fiche_label` |
| POST | `/api/lots` | Créer un lot (+ ses `fiche_row` si fiche fournie inline dans le body) |
| PUT | `/api/lots/:id` | Modifier un lot |
| GET | `/api/lots/:id/stock_oeufs?date=YYYY-MM-DD` | `dbo.fn_stock_oeufs(id, date)` |

### 4.6 Production et ventes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/oeufs?date=YYYY-MM-DD&lot=X` | Production (filtres optionnels) |
| POST | `/api/oeufs` | Saisir une production journalière |
| DELETE | `/api/oeufs/:id` | Supprimer une production |
| GET | `/api/ventes/oeufs` | Historique ventes œufs |
| POST | `/api/ventes/oeufs` | Vente d'œufs (`prix_unitaire` NULL → trigger) |
| GET | `/api/ventes/poulets` | Historique ventes poulets |
| POST | `/api/ventes/poulets` | Vente de poulets (`prix_kg` NULL → trigger) |
| GET | `/api/ventes/lots` | Historique cessions de lots |
| POST | `/api/ventes/lots` | Cession intégrale d'un lot |

### 4.7 Pertes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/pertes?lot=X&cause=Y` | Pertes (filtres optionnels) |
| POST | `/api/pertes` | Enregistrer des pertes |

### 4.8 Couvaisons ⚠ Endpoint critique

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/couvaisons` | Toutes les couvaisons avec lot mère et lot né |
| POST | `/api/couvaisons` | Démarrer une couvaison (avec validation disponibilité) |
| POST | `/api/couvaisons/:id/eclore` | **Transaction atomique : créer lot fils + finaliser couvaison** |

#### Validation avant couvaison (`POST /api/couvaisons`)

Avant insertion, le serveur calcule :
```
disponible = production_ce_jour − ventes_ce_jour − couvaisons_lancées_ce_jour
```
Si `nb_oeufs_demandés > disponible` → réponse 400 avec message lisible.

#### Transaction éclosion (`POST /api/couvaisons/:id/eclore`)

Corps attendu :
```json
{ "nb_ecloses": 69, "nom_lot": "LOT4" }
```

Traitement en une seule transaction SQL :
1. Lire la couvaison : `id_lot_mere`, `date_eclosion`, `id_fiche` du lot mère
2. `INSERT INTO lot` avec `age_arrivee = 1`, `prix_achat = 0`, `origine = 'couvaison'`, `id_lot_mere`, `id_fiche` hérité
3. `UPDATE oeuf_couvaison SET nb_ecloses = ..., id_lot_ne = <id_du_lot_créé>`
4. Réponse : `{ data: { couvaison, lot } }`

---

## 5. Frontend — Pages et fonctionnalités

### 5.1 Système de navigation (sidebar.js)

La navigation est entièrement générée depuis le tableau `NAV_ITEMS` dans `sidebar.js`. Modifier ce tableau suffit à ajouter, déplacer ou supprimer un lien.

| Section | Page | URL | Badge |
|---------|------|-----|-------|
| — | Dashboard | `/pages/dashboard.html` | — |
| Élevage | Lots | `/pages/lots.html` | — |
| Élevage | Fiches de croissance | `/pages/fiches.html` | — |
| Élevage | Pertes / Mortalité | `/pages/pertes.html` | `badge-pertes` |
| Œufs | Production | `/pages/oeufs.html` | — |
| Œufs | Couvaison | `/pages/couvaison.html` | `badge-couvaison` |
| Finance | Ventes | `/pages/ventes.html` | — |
| Finance | Rentabilité | `/pages/rentabilite.html` | — |
| Référentiels | Races | `/pages/races.html` | — |
| Référentiels | Nourriture | `/pages/nourriture.html` | — |
| Admin | Paramètres | `/pages/settings.html` | — |

### 5.2 `dashboard.html`

Vue d'ensemble de l'élevage à une date sélectionnable.

- 4 KPIs en haut : lots actifs, stock œufs total, total poules vivantes, CA du jour
- Graphique linéaire : production 7J / 30J / 90J
- Doughnut : répartition des poules par lot
- Barres : stock d'œufs par lot
- Activité récente : 10 derniers événements
- Tableau récapitulatif issu de `fn_dashboard(@date)`
- Réactif à `dateChanged`

### 5.3 `lots.html` ⭐ Page principale

Page centrale de l'application. Concentre la liste des lots et la saisie quotidienne de tous les événements.

#### Section liste
- Tableau de tous les lots avec filtres (recherche texte, race, origine)
- Bouton "Nouveau lot" → modal stepper 3 étapes

#### Modal création lot — 3 étapes

**Étape 1 — Informations**
- Champs : nom, race, nombre, âge arrivée, date arrivée, prix achat, origine
- Si origine = "couvaison" → champ "lot mère" apparaît dynamiquement (le `prix_achat` se force à 0)
- Validation inline : champs invalides surlignés en rouge, message d'erreur dans le footer du modal
- Les erreurs disparaissent dès que l'utilisateur corrige le champ

**Étape 2 — Fiche de croissance**

4 sources sélectionnables par boutons radio :

| Source | Fonctionnement |
|--------|---------------|
| Saisie manuelle | Formulaire proposant la prochaine semaine (S1, S2...) avec numéro et âge calculés automatiquement. Semaines consécutives obligatoires. Seule la dernière est supprimable. Touche `Entrée` pour enchaîner sans clic |
| Fiche existante | Dropdown groupé (Concessionnaire / Par défaut). Aperçu avant chargement. La fiche est dupliquée — l'originale n'est jamais modifiée |
| Import CSV | Zone drag-and-drop + bouton "Parcourir". Colonnes : `semaine, nourriture, poids_g, variation_g`. Séparateur `,` ou `;` auto-détecté. Validation ligne par ligne avec numéro de ligne dans les messages d'erreur. Bouton "Télécharger un exemple" |
| Fiche par défaut | Charge immédiatement la fiche par défaut de la race choisie à l'étape 1 |

Si aucune semaine n'est saisie → création autorisée, la fiche sera assignée plus tard.

**Étape 3 — Récapitulatif**
- Informations du lot (colonne gauche) + tableau des semaines (colonne droite)
- Bouton "Créer le lot" → `POST /api/lots`

### 5.4 `fiches.html`

Consultation et édition des fiches de croissance semaine par semaine.

**Sélecteur de lot** en haut de page : dropdown dynamique, badge type de fiche (concessionnaire / héritée / nouvelle), semaine actuelle du lot.

**Tableau des semaines**
- Colonnes : numéro semaine, âge, variation poids, nourriture, quantité, coût estimé par poulet, statut
- Statuts : Passée (vert) / En cours (bleu, surlignée) / À venir (gris)
- Semaines non sauvegardées : fond orange, badge "Non sauvegardé", astérisque dans le numéro
- Colonne actions : bouton poubelle uniquement sur la dernière ligne ; icône cadenas sur les autres

**Formulaire d'ajout inline** (sous le tableau, toujours visible — pas un modal)
- Indique en permanence la prochaine semaine et l'âge calculé du lot
- Fiche vide → propose S1 ; fiche avec N semaines → propose S(N+1) automatiquement
- Aperçu du coût estimé calculé en temps réel pendant la saisie
- `Entrée` pour valider et enchaîner rapidement

**Actions**
- **Tout effacer** → modal de confirmation → repart de S1 (utile si la fiche était mal commencée)
- **Sauvegarder** → visible uniquement si des modifications en attente → `PUT /api/fiches/:id`
- **Exporter CSV** → téléchargement de la fiche complète au format CSV
- `beforeunload` → alerte navigateur si on quitte avec des modifications non persistées

### 5.5 `oeufs.html`

- KPIs : total produit, vendu, en stock, en couvaison (à la date sélectionnée)
- Barre de progression taux de vente
- Tableau de la production avec filtre par lot
- Réactif à `dateChanged`

### 5.6 `pertes.html`

- KPIs : pertes du jour, cumul mois, cumul total, lot le plus touché
- Tableau filtrable par lot et par cause
- Badge sidebar `badge-pertes` mis à jour avec le nombre de pertes du jour
- Réactif à `dateChanged`

### 5.7 `couvaison.html`

- 4 KPIs : en cours, éclosion imminente (< 5 jours), terminées, total œufs couvés
- Tableau des couvaisons actives : barre de progression (sur 45 jours), jours restants, alerte colorée si < 5 jours
- Historique des éclosions avec taux d'éclosion par couvaison
- Modal "Nouvelle couvaison" : sélection lot, date, nombre d'œufs, vérification disponibilité
- Bouton "Éclosion" par ligne active → modal de saisie `nb_ecloses` + nom du lot → `POST /api/couvaisons/:id/eclore`
- Badge sidebar `badge-couvaison` : nombre de couvaisons à moins de 5 jours de l'éclosion

### 5.8 `ventes.html`

- Onglets : œufs / poulets / cession de lot
- Tableau historique par type avec totaux
- Modal de saisie pour chaque type de vente
- Calcul automatique du total dans les modals (`nb × prix`) en temps réel

### 5.9 `rentabilite.html`

- Tableau par lot : acquisition, nourriture estimée, revenus œufs, revenus poulets, bénéfice net, marge %
- KPIs globaux : bénéfice cumulé, meilleur lot, lot déficitaire
- Réactif à `dateChanged`

### 5.10 `races.html`

- Vue en cartes visuelles + tableau détaillé
- CRUD complet (création, modification, suppression)
- Suppression désactivée visuellement si des lots sont associés à la race

### 5.11 `nourriture.html`

- Tableau avec prix au gramme et coût indicatif par poulet/semaine calculé
- CRUD complet
- Calcul automatique du prix au kg dans le modal de création
- Suppression désactivée si l'aliment est référencé dans une fiche

### 5.12 `calendrier.html`

- Vue mensuelle de tous les événements tous lots confondus
- Points colorés par type : production (vert), pertes (rouge), ventes (bleu), couvaison (orange), éclosion (violet)
- Clic sur un jour → liste détaillée des événements du jour
- Source : `GET /api/events?from=...&to=...`

### 5.13 `api.html` — Explorateur API

- Affichage du schéma de la base (`GET /api/schema`) : tables, colonnes, types
- Interface de test interactif des endpoints depuis le navigateur
- Affichage de la réponse JSON formatée et colorisée

---

## 6. Logique métier clé

### 6.1 Calcul de l'effectif vivant

```
nombre_actuel(lot, D) =
    lot.nombre
    − Σ perte.nb_perdus          WHERE date_perte ≤ D
    − Σ vente_poulet.nb_poulets  WHERE date_vente ≤ D
```

### 6.2 Calcul du stock d'œufs

```
stock_oeufs(lot, D) =
    Σ production_oeuf.nb_oeufs        WHERE date_production ≤ D
  − Σ vente_oeuf.nb_oeufs             WHERE date_vente ≤ D
  − Σ oeuf_couvaison.nb_oeufs_couves  WHERE date_mise_couvaison ≤ D
```

Les œufs mis en couvaison **sortent du stock immédiatement** le jour de leur mise en incubateur.

### 6.3 Calcul du coût nourriture

```
cout_nourriture(lot, D) =
    lot.nombre ×
    Σ (fiche_row.poids × nourriture.prix_gramme)
    WHERE fiche_row.semaine ≤ fn_semaine_actuelle(lot, D)
```

Le multiplicateur `lot.nombre` est appliqué **en dehors du SUM**, pas à l'intérieur.

### 6.4 Calcul du bénéfice net

```
benefice_net(lot, D) =
    fn_revenus_lot(lot, D)
    − lot.prix_achat
    − fn_cout_nourriture(lot, D)

revenus_total(lot, D) =
    Σ vente_oeuf.prix_total    WHERE date_vente ≤ D
  + Σ vente_poulet.prix_total  WHERE date_vente ≤ D
  + Σ vente_lot.prix_vente     WHERE date_vente ≤ D
```

### 6.5 Disponibilité des œufs avant couvaison

```
disponible_ce_jour =
    Σ production WHERE date = aujourd'hui
  − Σ vente_oeuf WHERE date_vente = aujourd'hui
  − Σ oeuf_couvaison WHERE date_mise_couvaison = aujourd'hui
```

Plusieurs couvaisons le même jour sont possibles tant que leur total ne dépasse pas la production du jour.

### 6.6 Héritage du lot fils à l'éclosion

Le nouveau lot créé lors d'une éclosion hérite automatiquement des propriétés suivantes :

| Champ | Valeur | Source |
|-------|--------|--------|
| `age_arrivee` | `1` | Fixe (poussin à S1) |
| `prix_achat` | `0` | Production interne |
| `origine` | `'couvaison'` | Fixe |
| `nombre` | `nb_ecloses` saisi | Résultat de l'éclosion |
| `date_arrivee` | `oeuf_couvaison.date_eclosion` | Date calculée |
| `id_race` | `lot_mere.id_race` | Hérité |
| `id_fiche` | `lot_mere.id_fiche` | Hérité — même plan de croissance |
| `id_lot_mere` | `oeuf_couvaison.id_lot_mere` | Traçabilité généalogique |

### 6.7 Prix automatique par trigger

Si `prix_unitaire` (vente œuf) ou `prix_kg` (vente poulet) est NULL à l'insertion, le trigger lit le prix de référence de la race du lot et le remplit. L'opérateur peut donc saisir des ventes sans préciser le prix → prix de référence de la race appliqué automatiquement. Ou saisir un prix personnalisé → valeur conservée telle quelle.

---

## 7. Conventions de développement

### 7.1 SQL Server

- `IDENTITY(1,1)` pour toutes les clés primaires auto-incrémentées
- `CAST(GETDATE() AS DATE)` pour la date du jour sans composante heure
- `GO` obligatoire entre chaque `CREATE FUNCTION`, `CREATE VIEW`, `CREATE TRIGGER`
- Interdiction d'`ORDER BY` dans les `CREATE VIEW`
- Préfixe `dbo.` obligatoire pour appeler les fonctions scalaires : `dbo.fn_nombre_actuel(...)`
- Contournement `OUTPUT INSERTED.*` sur les tables avec triggers : via `DECLARE @t TABLE(...)`

### 7.2 JavaScript

- Toutes les fonctions de `api.js` retournent `{ data, error }` — jamais de throw non intercepté
- Les scripts de page attendent toujours `partialsReady` avant d'initialiser
- Les pages sensibles à la date écoutent `dateChanged` et rappellent leur logique de chargement
- Validation inline : `classList.toggle('is-invalid', condition)` + effacement à l'événement `input`
- Les données source (races, lots, nourritures) sont stockées en constantes `ALLCAPS` et filtrées côté client si possible pour éviter des requêtes répétées

### 7.3 Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables SQL | `snake_case` singulier | `production_oeuf` |
| Fonctions scalaires SQL | `fn_` + verbe | `fn_stock_oeufs` |
| Fonctions table SQL | `fn_` + objet | `fn_dashboard` |
| Vues SQL | `vue_` + objet | `vue_dashboard` |
| Triggers SQL | `trg_` + table + action | `trg_vente_oeuf_set_price` |
| Endpoints API | `/api/` + ressource plurielle | `/api/lots` |
| Fichiers HTML | module en minuscules | `lots.html` |
| Fichiers JS page | identique à la page HTML | `lots.js` |
| IDs HTML | `kebab-case` | `#fiche-lot-select` |
| Constantes JS | `SCREAMING_SNAKE_CASE` | `FICHES_DATA` |
| Fonctions helpers JS | `camelCase` descriptif | `loadFiche()`, `renderTable()` |

---

## 8. Données de test

Le fichier `data.sql` est conçu pour être **réinitialisable à volonté** : il supprime toutes les données, reseede les identités, puis réinsère des données cohérentes.

### Jeu de données inclus

**Races :** ISA Brown, Lohmann, Bovans, Hy-Line

**Aliments :** Granulés ponte A/B, Mash standard, Démarrage poussin, Croissance A

**Fiches :**
- Fiche 1 : ISA Brown ponte standard (18 semaines — concessionnaire)
- Fiche 2 : Lohmann ponte standard (6 semaines — concessionnaire)
- Fiche 3 : ISA Brown démarrage poussin (2 semaines — défaut)
- Fiche 4 : Fiche minimale par défaut (2 semaines)

**Lots :**
- LOT1 : 500 ISA Brown achetées le 10/01/2026 — fiche 1
- LOT2 : 300 Lohmann achetées le 01/02/2026 — fiche 2
- LOT3 : 120 ISA Brown issues de couvaison (nées le 01/03/2026) — lot mère : LOT1

**Couvaisons :**
- Couvaison terminée : 80 œufs mis le 15/01/2026 → 69 éclos → LOT3
- Couvaison active 1 : 120 œufs mis le 10/02/2026 (éclosion prévue 27/03/2026)
- Couvaison active 2 : 85 œufs mis le 01/03/2026 (éclosion prévue 15/04/2026)

---

## 9. État d'avancement consolidé

### ✅ Complété et fonctionnel

| Couche | Module | Fonctionnalité |
|--------|--------|----------------|
| BDD | Schéma | Tables, colonnes calculées, triggers |
| BDD | Logique | Fonctions scalaires + fonctions table + vues |
| BDD | Tests | Données réinitialisables cohérentes |
| Backend | Config | Connexion SQL Server (pool mssql) |
| Backend | API | CRUD toutes tables |
| Backend | API | Validation disponibilité œufs avant couvaison |
| Backend | API | Endpoint événements calendrier |
| Frontend | Layout | Injection de partials (layout.js) |
| Frontend | Navigation | Sidebar dynamique avec badges (sidebar.js) |
| Frontend | Date | Date picker global + événement `dateChanged` |
| Frontend | API Client | `api.js` centralisé (actuellement données statiques) |
| Page | Dashboard | KPIs + graphiques + tableau récapitulatif |
| Page | Lots — liste | Tableau filtrable |
| Page | Lots — création | Modal stepper 3 étapes complet |
| Page | Lots — fiche S1 | Saisie manuelle semaine par semaine |
| Page | Lots — fiche S2 | Import CSV avec validation robuste |
| Page | Lots — fiche S3 | Chargement depuis fiche existante |
| Page | Lots — fiche S4 | Fiche par défaut par race |
| Page | Fiches | Tableau statuts + ajout inline + "Tout effacer" |
| Page | Fiches | Export CSV, indicateur non-sauvegardé, beforeunload |
| Page | Œufs | KPIs + tableau production |
| Page | Pertes | Tableau filtrable + badge sidebar |
| Page | Couvaison | Tableau actives + historique + barres progression |
| Page | Couvaison | Modals couvaison et éclosion (UI complète) |
| Page | Ventes | Onglets œufs / poulets / lots |
| Page | Rentabilité | Tableau financier par lot |
| Page | Races | CRUD + cartes visuelles |
| Page | Nourriture | CRUD + calcul indicatif |

### ⚠ Partiellement implémenté

| Module | État |
|--------|------|
| `api.js` | Toutes les fonctions retournent des données statiques. La structure `{ data, error }` est en place, les appels `fetch()` réels restent à implémenter fonction par fonction |
| `couvaison.html` | UI et modals complets. La soumission du modal éclosion n'est pas encore connectée à `POST /api/couvaisons/:id/eclore` |
| `routes/api.js` | Routes présentes mais l'endpoint `/api/couvaisons/:id/eclore` (transaction atomique) n'est pas encore implémenté |

### 🔴 Non commencé

| Module | Description |
|--------|-------------|
| `calendrier.html` | Page non créée |
| `api.html` | Page non créée |
| `settings.html` | Page non créée |
| Authentification | Aucune gestion d'utilisateurs ni de sessions |

---

## 10. Fonctionnalités restantes à implémenter

### 🔴 Priorité haute

#### A. Connexion `api.js` → routes Express

C'est le chantier principal. Remplacer les données statiques de chaque fonction par un `fetch()` réel.

Ordre recommandé (du plus simple au plus complexe) :

1. `API.getStatus()` → `GET /api/status`
2. `API.getRaces()` + `API.getNourriture()` — référentiels simples
3. `API.getLots()` → `GET /api/lots`
4. `API.getDashboard(date)` → `GET /api/dashboard?date=...`
5. `API.getRentabilite(date)` → `GET /api/rentabilite?date=...`
6. `API.getOeufs(date)`, `API.getPertes(date)`, `API.getCouvaisons()`
7. `API.createLot(payload)` → `POST /api/lots` avec fiche inline
8. Tous les CRUD de référentiels (createRace, updateRace, deleteRace...)
9. `API.eclore(id, payload)` → `POST /api/couvaisons/:id/eclore`

#### B. Endpoint transaction éclosion

Implémenter `POST /api/couvaisons/:id/eclore` côté Express :
1. Lecture couvaison + lot mère
2. `INSERT INTO lot` (lot fils avec héritage)
3. `UPDATE oeuf_couvaison SET nb_ecloses, id_lot_ne`
4. Retour `{ data: { couvaison, lot } }`

Connecter ensuite le modal éclosion de `couvaison.html` à cet endpoint.

### 🟡 Priorité moyenne

| Fonctionnalité | Description |
|----------------|-------------|
| `calendrier.html` | Créer la page avec vue mensuelle et points colorés par type d'événement |
| Modification d'un lot | Modal d'édition depuis la liste (race, fiche, nom...) |
| Suppression / archivage d'un lot | Ajouter un statut `actif / archivé` ou une suppression logique |
| Sélecteur lots dans `fiches.html` | Actuellement statique — à alimenter depuis `GET /api/lots` |
| `settings.html` | Paramètres globaux : monnaie, durée couvaison, aliments par défaut |
| Export PDF / Excel | Rentabilité et historique des événements |

### 🟢 Priorité basse

| Fonctionnalité | Description |
|----------------|-------------|
| Durée de couvaison configurable | Actuellement 45 jours codé en dur côté SQL (colonne calculée) et côté JS (`COUVAISON_DAYS`) |
| `api.html` | Explorateur API avec schéma dynamique et test des endpoints |
| Courbe prévisionnelle | Production attendue vs réelle basée sur la fiche |
| Alertes automatiques | Si production chute de X% par rapport à la semaine précédente |
| Multi-élevage | Table `ferme` pour gérer plusieurs sites |
| Application mobile (PWA) | Manifeste + Service Worker pour saisie terrain |
| Authentification | Table `utilisateur`, sessions JWT, rôles lecture / saisie / admin |

---

## 11. Décisions de conception et justifications

### Frontend : Vanilla JS plutôt que framework

Un framework comme Angular (mentionné dans les spécifications initiales) ou React apporterait de la complexité de build sans bénéfice proportionnel pour une application mono-utilisateur de cette taille. Le Vanilla JS avec Bootstrap 5 permet de livrer des pages fonctionnelles rapidement, sans étape de compilation, avec un comportement prévisible et une courbe d'apprentissage nulle pour maintenir le code.

### Données statiques dans api.js

Pendant la phase de construction de l'UI, toutes les fonctions de `api.js` retournent des données statiques cohérentes. Cela permet de développer et tester chaque page sans dépendre de l'état de la base de données. La structure `{ data, error }` est identique à ce que retourneront les vrais `fetch()` — le branchement se fait donc ligne par ligne sans réécriture.

### Fonctions table (TVF) plutôt que vues simples

Les vues SQL Server n'acceptent pas de paramètres. Les fonctions table (TVF paramétrées) offrent la même interface de requête (`SELECT * FROM dbo.fn_dashboard(@date)`) tout en permettant de passer une date arbitraire. Les vues `vue_dashboard` et `vue_rentabilite` restent disponibles comme raccourcis "aujourd'hui".

### Stratégie replace-all pour les fiches

Plutôt que de gérer les insertions, modifications et suppressions de lignes individuelles (`fiche_row`), le `PUT /api/fiches/:id` supprime toutes les lignes existantes et réinsère le tableau complet. Cela simplifie considérablement la logique client (qui gère un tableau en mémoire) et la logique serveur (pas de diff à calculer). Acceptable car les fiches sont des objets de taille raisonnable (< 50 semaines).

### Seule la dernière semaine est supprimable

La règle métier imposant la consécutivité des semaines d'une fiche (S1, S2, S3... sans saut) est enforced côté UI en n'autorisant la suppression que de la dernière ligne. Un cadenas visuel sur les autres lignes communique cette contrainte à l'utilisateur sans nécessiter de message d'erreur.

### Triggers pour les prix par défaut

Plutôt que de gérer le prix par défaut côté applicatif (avec un IF dans le code Node.js), les triggers SQL gèrent ce comportement directement à l'insertion. Avantage : le comportement est garanti quelle que soit l'interface d'accès à la base (pas seulement depuis l'API Node.js).

---

*AKOHO — Document de référence technique — Mars 2026*

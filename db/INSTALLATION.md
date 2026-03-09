# AKOHO — Guide d'installation de la base de données

## Prérequis

- **Docker** installé et démarré
- **Node.js** (v18+) et **npm**
- Les dépendances npm installées (`npm install` à la racine du projet)

---

## 1. Lancer le conteneur SQL Server

```bash
docker run -e "ACCEPT_EULA=Y" \
           -e "SA_PASSWORD=Oceane123A" \
           -p 1433:1433 \
           --name akoho-sql \
           -d mcr.microsoft.com/mssql/server:2022-latest
```

> **Note :** attendre ~10 secondes que SQL Server soit prêt avant de passer à l'étape suivante.

---

## 2. Fichiers SQL — ordre d'exécution

Le dossier `db/` contient les fichiers suivants :

| # | Fichier         | Rôle                                                                                         |
|---|-----------------|----------------------------------------------------------------------------------------------|
| 1 | `schema.sql`    | Crée la base `akoho`, toutes les tables, triggers, fonctions scalaires, TVF et vues          |
| 2 | `data.sql`      | Insère les données de référence (races, nourriture, paramètres, fiche par défaut) **et** les données de test (lots, production, ventes, couvaison, pertes) |

### Détail de `schema.sql`

1. Création de la base de données `akoho` (si elle n'existe pas)
2. Tables de référence : `race`, `nourriture`, `fiche_model`, `fiche_row`
3. Table centrale : `lot`
4. Tables d'événements : `production_oeuf`, `vente_oeuf`, `oeuf_couvaison`, `perte`, `vente_poulet`, `vente_lot`
5. Tables de configuration : `parametre`, `fiche_defaut_row`
6. Triggers : `trg_lot_sync_race_from_fiche`, `trg_vente_oeuf_set_price`, `trg_vente_poulet_set_price`
7. Fonctions scalaires : `fn_semaine_actuelle`, `fn_nombre_actuel`, `fn_stock_oeufs`, `fn_cout_nourriture`, `fn_revenus_lot`, `fn_benefice_net`, `fn_prix_revient_oeuf`
8. Fonctions table (TVF) : `fn_dashboard`, `fn_rentabilite`
9. Vues : `vue_dashboard`, `vue_rentabilite`

### Détail de `data.sql`

1. **Nettoyage** — vide toutes les tables (ordre inverse des FK) et remet les compteurs IDENTITY à zéro
2. **Données de référence** (obligatoire pour toute installation) :
   - 4 races de poules
   - 5 types de nourriture
   - 6 paramètres système
   - 30 lignes de fiche par défaut (courbe de croissance)
3. **Fiches de croissance** — 4 fiches modèles avec leurs lignes
4. **Lots** — 3 lots de démonstration (LOT1, LOT2, LOT3)
5. **Événements de test** — production d'œufs, ventes d'œufs, couvaisons, pertes, ventes de poulets

---

## 3. Exécution automatique (recommandé)

Le script Node.js `db/init.js` exécute automatiquement `schema.sql` puis `data.sql` :

```bash
# Depuis la racine du projet
node db/init.js
```

Variables d'environnement attendues (ou valeurs par défaut) :

| Variable         | Défaut      | Description                    |
|------------------|-------------|--------------------------------|
| `DB_SERVER`      | `localhost` | Adresse du serveur SQL Server  |
| `DB_USER`        | `sa`        | Utilisateur SQL Server         |
| `DB_PASSWORD`    | *(vide)*    | Mot de passe (ex: `Oceane123A`)|
| `DB_ENCRYPT`     | `false`     | Activer le chiffrement TLS     |

Exemple avec le `.env` :

```env
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=Oceane123A
DB_ENCRYPT=false
```

---

## 4. Exécution manuelle (alternative)

Si vous préférez exécuter les fichiers SQL manuellement (via SSMS, Azure Data Studio, ou `sqlcmd`) :

```bash
# 1. Créer le schéma
sqlcmd -S localhost -U sa -P "Oceane123A" -i db/schema.sql

# 2. Insérer les données
sqlcmd -S localhost -U sa -P "Oceane123A" -i db/data.sql
```

**Ordre obligatoire :** toujours exécuter `schema.sql` AVANT `data.sql`.

---

## 5. Fichiers utilitaires

| Fichier         | Rôle                                           |
|-----------------|-------------------------------------------------|
| `connection.js` | Module de connexion partagé (pool `mssql`)      |
| `init.js`       | Script d'initialisation (lance schema + data)   |

---

## 6. Réinitialiser la base

Pour remettre la base à zéro avec les données de test :

```bash
node db/init.js
```

Le fichier `data.sql` vide d'abord toutes les tables avant de réinsérer les données.

---

## Arborescence du dossier `db/`

```
db/
├── connection.js      # Pool de connexion SQL Server
├── init.js            # Script d'initialisation automatique
├── schema.sql         # Schéma complet (tables, triggers, fonctions, vues)
├── data.sql           # Données de référence + données de test
└── INSTALLATION.md    # Ce fichier
```

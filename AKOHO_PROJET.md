# AKOHO — Présentation du projet

> Une application pour gérer un élevage de poules pondeuses, simplement et efficacement.

---

## Sommaire

1. [C&#39;est quoi AKOHO ?](#1-cest-quoi-akoho-)
2. [À quoi ça sert au quotidien ?](#2-à-quoi-ça-sert-au-quotidien-)
3. [Les grandes idées du projet](#3-les-grandes-idées-du-projet)
4. [Tout ce qu&#39;on peut faire dans l&#39;application](#4-tout-ce-quon-peut-faire-dans-lapplication)
5. [Les pages de l&#39;application, une par une](#5-les-pages-de-lapplication-une-par-une)
6. [Comment ça fonctionne (la logique derrière)](#6-comment-ça-fonctionne-la-logique-derrière)
7. [Les données de démo](#7-les-données-de-démo)
8. [Ce qui est déjà fait](#8-ce-qui-est-déjà-fait)
9. [Ce qu&#39;il reste à faire](#9-ce-quil-reste-à-faire)
10. [Ce qui n&#39;est pas prévu pour l&#39;instant](#10-ce-qui-nest-pas-prévu-pour-linstant)
11. [Pourquoi certains choix ont été faits](#11-pourquoi-certains-choix-ont-été-faits)

---

## 1. C'est quoi AKOHO ?

AKOHO est une application web (qui s'ouvre dans un navigateur internet) pour **gérer un élevage de poules pondeuses**.

L'idée centrale : les poules sont organisées en **lots**. Un lot, c'est un groupe de poules de la même race, arrivées le même jour, qu'on suit ensemble du début à la fin — de leur achat (ou leur naissance) jusqu'à leur vente ou leur fin de vie.

L'application permet de tout noter, tout suivre, et tout calculer : combien de poules sont vivantes, combien d'œufs ont été pondus, vendus, mis en couvaison, combien d'argent a été gagné ou dépensé, etc.

---

## 2. À quoi ça sert au quotidien ?

Voici ce qu'un éleveur fait concrètement avec AKOHO :

- **Le matin** : il ouvre l'application, voit le tableau de bord qui résume la situation du jour (nombre de poules, œufs en stock, ventes du jour).
- **Après la collecte** : il note combien d'œufs chaque lot a produit aujourd'hui.
- **En cas de perte** : il enregistre les poules mortes avec la cause (maladie, prédateur, inconnue…).
- **Lors d'une vente** : il note la vente d'œufs ou de poulets, le prix est calculé automatiquement si besoin.
- **Pour la couvaison** : il met des œufs en incubateur et l'application suit les 45 jours jusqu'à l'éclosion, puis crée automatiquement le nouveau lot de poussins.
- **Pour la nourriture** : il suit un plan alimentaire semaine par semaine grâce aux fiches de croissance.
- **Pour les finances** : il consulte la rentabilité de chaque lot — combien ça a coûté, combien ça a rapporté, est-ce que c'est rentable.

---

## 3. Les grandes idées du projet

### Tout est daté

Chaque événement (ponte, vente, perte, couvaison) est enregistré avec sa date. Ça permet de remonter dans le temps et de voir exactement l'état de l'élevage à n'importe quelle date passée. Les données ne sont jamais modifiées rétroactivement — on peut toujours reconstituer l'historique.

### La date est un curseur

Partout dans l'application, il y a un sélecteur de date. En changeant la date, tous les chiffres se recalculent : combien de poules vivantes à cette date, combien d'œufs en stock, quel bénéfice, etc. C'est comme une machine à remonter le temps pour l'élevage.

### Un lot = un groupe cohérent

Un lot regroupe des poules de même race, arrivées ensemble. On les suit comme un ensemble. Chaque lot a son propre historique, sa propre fiche alimentaire, ses propres chiffres de production et de vente.

---

## 4. Tout ce qu'on peut faire dans l'application

### 📋 Gérer les références de base

**Les races de poules**

- Créer, modifier et supprimer des races (ex : ISA Brown, Lohmann…)
- Pour chaque race, on définit le prix de vente d'un œuf et le prix de vente au kilo pour la viande
- Ces prix servent de valeur par défaut lors des ventes

**Les aliments**

- Créer, modifier et supprimer des types de nourriture (ex : Granulés ponte, Mash standard…)
- Pour chaque aliment, on note le prix au gramme
- Ces aliments sont utilisés dans les fiches de croissance

---

### 🐔 Gérer les lots de poules

**Créer un lot** (en 3 étapes)

*Étape 1 — Les informations de base :*

- Donner un nom au lot (ex : LOT1)
- Choisir la race
- Indiquer le nombre de poules
- Indiquer leur âge à l'arrivée (en semaines)
- Indiquer la date d'arrivée
- Indiquer le prix d'achat total
- Préciser l'origine : **achat** (poules achetées à l'extérieur) ou **couvaison** (poussins nés dans l'élevage)
  - Si c'est une couvaison, on indique quel est le lot mère, et le prix d'achat passe automatiquement à 0

*Étape 2 — La fiche de croissance (plan alimentaire) :*
C'est le planning de nourriture semaine par semaine. On peut la créer de 4 façons :

1. **Saisie manuelle** : on ajoute les semaines une à une (semaine 1, semaine 2, etc.) en indiquant l'aliment, la quantité, et l'évolution de poids prévue
2. **Choisir une fiche existante** : on récupère une fiche déjà créée pour un autre lot
3. **Importer un fichier** : on charge un fichier de données (format tableur simplifié)
4. **Fiche par défaut** : on prend la fiche standard associée à la race choisie

C'est optionnel — on peut créer le lot sans fiche et l'ajouter plus tard.

*Étape 3 — Vérification :*

- Un récapitulatif de tout ce qui a été saisi
- On confirme et le lot est créé

**Suivre un lot**

- Voir la liste de tous les lots avec des filtres (recherche par nom, par race, par origine)
- Voir la semaine actuelle de chaque lot (calculée automatiquement depuis la date d'arrivée et l'âge)

---

### 📊 Les fiches de croissance (plans alimentaires)

Une fiche de croissance, c'est un tableau semaine par semaine qui dit :

- Quelle semaine (S1, S2, S3…)
- Quel âge ont les poules à cette semaine
- Quel aliment donner
- Quelle quantité par poule
- Quelle évolution de poids est attendue

**Règles importantes :**

- Les semaines doivent se suivre : S1, S2, S3… On ne peut pas sauter une semaine
- On ne peut supprimer que la dernière semaine (pour garder la continuité)
- Le coût estimé est calculé automatiquement (quantité × prix de l'aliment)

**Ce qu'on peut faire :**

- Ajouter des semaines rapidement (la prochaine semaine est proposée automatiquement)
- Tout effacer pour recommencer
- Sauvegarder les modifications
- Exporter la fiche en fichier téléchargeable
- L'application prévient si on essaie de quitter la page sans sauvegarder

**Statut visuel de chaque semaine :**

- Vert = semaine passée
- Bleu = semaine en cours
- Gris = semaine à venir

---

### 🥚 La production d'œufs

**Saisir la production :**

- Chaque jour, on note combien d'œufs chaque lot a produit

**Voir les chiffres clés (à la date choisie) :**

- Total d'œufs produits
- Total d'œufs vendus
- Œufs actuellement en stock
- Œufs mis en couvaison
- Taux de vente (pourcentage d'œufs vendus par rapport à la production)

---

### 🪺 La couvaison (incubation des œufs)

La couvaison, c'est quand on met des œufs en incubateur pour faire naître des poussins. Le cycle dure **45 jours**.

**Lancer une couvaison :**

- Choisir quel lot fournit les œufs
- Indiquer la date de mise en couvaison
- Indiquer combien d'œufs
- L'application vérifie qu'il y a assez d'œufs disponibles ce jour-là (production du jour moins les ventes et autres couvaisons déjà lancées)
- Les œufs mis en couvaison **sortent immédiatement du stock**

**Suivre les couvaisons en cours :**

- Barre de progression sur 45 jours
- Jours restants avant éclosion
- Alerte visuelle quand l'éclosion approche (moins de 5 jours)

**L'éclosion :**

- Quand les 45 jours sont passés, on clique sur "Éclosion"
- On indique combien de poussins sont nés et on donne un nom au nouveau lot
- L'application crée automatiquement le nouveau lot avec toutes les bonnes informations :
  - Même race que la mère
  - Même fiche de croissance que la mère
  - Âge de départ = 1 semaine
  - Prix d'achat = 0 (c'est une production interne)
  - Lien vers le lot mère (traçabilité)

**Indicateurs :**

- Nombre de couvaisons en cours
- Couvaisons proches de l'éclosion (< 5 jours)
- Couvaisons terminées
- Total d'œufs couvés
- Taux d'éclosion par couvaison (pourcentage de poussins nés par rapport aux œufs mis)

---

### ☠️ Les pertes et la mortalité

**Enregistrer une perte :**

- Choisir le lot concerné
- Indiquer la date
- Indiquer le nombre de poules perdues
- Indiquer la cause (optionnel — on peut laisser « cause inconnue »)

**Voir les chiffres :**

- Pertes du jour
- Pertes du mois
- Pertes totales
- Lot le plus touché

Le nombre de poules perdues est automatiquement soustrait de l'effectif vivant du lot.

---

### 💰 Les ventes

Trois types de ventes :

**Vente d'œufs :**

- Choisir le lot, la date, le nombre d'œufs
- Le prix unitaire peut être saisi manuellement ou laissé vide → dans ce cas, le prix de la race est appliqué automatiquement
- Le total est calculé en temps réel (nombre × prix)

**Vente de poulets au poids :**

- Choisir le lot, la date, le nombre de poulets, le poids total en kg
- Le prix au kilo peut être saisi ou laissé vide → prix de la race appliqué automatiquement
- Le total est calculé (poids × prix/kg)

**Cession d'un lot entier :**

- On vend la totalité d'un lot d'un coup, à un prix global qu'on fixe

---

### 📈 La rentabilité

Pour chaque lot, l'application calcule :

| Donnée                               | Signification                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Coût d'acquisition**         | Combien les poules ont coûté à l'achat                                                         |
| **Coût de nourriture estimé** | Calculé à partir de la fiche de croissance : quantité × prix de l'aliment × nombre de poules |
| **Revenus œufs**               | Total des ventes d'œufs                                                                          |
| **Revenus poulets**             | Total des ventes de poulets + cessions de lot                                                     |
| **Bénéfice net**              | Revenus totaux − coût d'achat − coût nourriture                                               |
| **Marge en %**                  | Pourcentage de bénéfice par rapport aux coûts                                                  |

On voit aussi :

- Le bénéfice cumulé de tout l'élevage
- Le lot le plus rentable
- Le lot qui perd de l'argent

Tout se recalcule en changeant la date.

---

### 📅 Le calendrier

Une vue mensuelle qui affiche tous les événements de tous les lots :

- **Points verts** : production d'œufs
- **Points rouges** : pertes
- **Points bleus** : ventes
- **Points oranges** : mises en couvaison
- **Points violets** : éclosions

En cliquant sur un jour, on voit la liste détaillée de tout ce qui s'est passé ce jour-là.

---

### 🏠 Le tableau de bord (page d'accueil)

Vue d'ensemble rapide à la date choisie :

**4 chiffres clés en haut :**

- Nombre de lots actifs
- Stock total d'œufs
- Nombre total de poules vivantes
- Chiffre d'affaires du jour

**Graphiques :**

- Courbe de production d'œufs (sur 7 jours, 30 jours ou 90 jours)
- Camembert : répartition des poules par lot
- Barres : stock d'œufs par lot

**Autres :**

- Les 10 derniers événements
- Tableau récapitulatif de chaque lot (production du jour, pertes du jour, stock, etc.)

---

## 5. Les pages de l'application, une par une

| Page                           | Ce qu'on y trouve                                   |
| ------------------------------ | --------------------------------------------------- |
| **Tableau de bord**      | Vue d'ensemble avec chiffres clés et graphiques    |
| **Lots**                 | Liste de tous les lots + création d'un nouveau lot |
| **Fiches de croissance** | Plans alimentaires semaine par semaine              |
| **Pertes / Mortalité**  | Enregistrement et suivi des poules perdues          |
| **Production d'œufs**   | Saisie quotidienne et chiffres de production        |
| **Couvaison**            | Suivi des incubations et éclosions                 |
| **Ventes**               | Historique des ventes (œufs, poulets, lots)        |
| **Rentabilité**         | Calculs financiers par lot                          |
| **Races**                | Gestion des races de poules (noms, prix)            |
| **Nourriture**           | Gestion des types d'aliments (noms, prix)           |
| **Paramètres**          | Réglages globaux de l'application                  |
| **Calendrier**           | Vue chronologique de tous les événements          |

La barre latérale à gauche permet de naviguer entre toutes ces pages. Certaines pages affichent un petit compteur (badge) :

- **Pertes** : nombre de pertes du jour
- **Couvaison** : nombre de couvaisons proches de l'éclosion (< 5 jours)

---

## 6. Comment ça fonctionne (la logique derrière)

### Combien de poules sont vivantes ?

> Nombre de poules au départ **−** total des pertes **−** total des poulets vendus = **poules vivantes**

Tout est calculé jusqu'à la date sélectionnée.

### Combien d'œufs en stock ?

> Total des œufs produits **−** œufs vendus **−** œufs mis en couvaison = **stock d'œufs**

Les œufs mis en couvaison sortent du stock le jour même.

### Combien coûte la nourriture ?

> Pour chaque semaine passée de la fiche : (quantité de nourriture × prix de l'aliment) → on additionne tout → on multiplie par le nombre de poules du lot.

C'est une **estimation** basée sur le plan alimentaire, pas une mesure réelle de ce qui a été consommé.

### Est-ce que c'est rentable ?

> Tout ce qui a été vendu (œufs + poulets + cessions) **−** le prix d'achat des poules **−** le coût estimé de la nourriture = **bénéfice net**

### Les prix automatiques

Quand on enregistre une vente sans indiquer le prix, l'application prend automatiquement le prix de référence de la race :

- Pour les œufs → le prix de l'œuf de la race
- Pour les poulets → le prix au kilo de la race

On peut toujours indiquer un prix différent si on veut.

---

## 7. Les données de démo

L'application est livrée avec des données d'exemple pour tester :

**4 races :** ISA Brown, Lohmann, Bovans, Hy-Line

**5 types d'aliments :** Granulés ponte A, Granulés ponte B, Mash standard, Démarrage poussin, Croissance A

**4 fiches de croissance :** de 2 à 18 semaines

**3 lots :**

- **LOT1** : 500 poules ISA Brown, achetées le 10 janvier 2026
- **LOT2** : 300 poules Lohmann, achetées le 1er février 2026
- **LOT3** : 120 poussins ISA Brown, nés le 1er mars 2026 par couvaison (lot mère : LOT1)

**3 couvaisons :**

- 1 terminée : 80 œufs → 69 poussins nés (LOT3)
- 1 en cours : 120 œufs, éclosion prévue le 27 mars 2026
- 1 en cours : 85 œufs, éclosion prévue le 15 avril 2026

Ces données peuvent être réinitialisées à tout moment pour repartir de zéro.

---

TECHNO : Node.js et SQLServer et affichage Angular
ET je precise que tout peut etre parametrable (les nombres et les chiffres et tout )


*AKOHO — Description fonctionnelle du projet — Mars 2026*

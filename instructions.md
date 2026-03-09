

## Prompt réorganisé et clarifié

### Contexte

Nous travaillons sur l’interface de vente de poulets :

* URL de référence : `http://localhost:3000/ventes`
* Objectif principal : corriger le calcul du poids total, automatiser le prix, et ajouter des paramètres configurables pour la gestion des ventes.

---

### 1️⃣ Vérifications existantes

* Actuellement, le champ **“Poids total (kg)”** n’est pas automatiquement calculé selon la date.
* Il faut **trouver la raison** pour laquelle le poids du poulet n’est pas saisi automatiquement.

---

### 2️⃣ Nouvelle page Paramètres

Créer une page **Paramètres** dans l’interface utilisateur avec des options activables/désactivables.

#### Paramètres à ajouter :

1. **Limitation de vente**

   * Les poulets ne peuvent être vendus que si :

     * ils ont dépassé une certaine semaine **ou**
     * ils ont atteint un certain poids (selon la fiche du lot).

2. **Semaine d’arrêt de progression du poids**

   * Définir la semaine à laquelle le poids des poulets ne doit plus augmenter.
   * Lorsque ce paramètre est activé :

     * on utilise la nourriture pour la dernière semaine concernée
     * le poids n’augmente plus après cette semaine.

---

### 3️⃣ Base de données et calculs

#### Tables existantes / à créer :

```sql
CREATE TABLE race (
    id_race INT PRIMARY KEY IDENTITY(1,1),
    nom_race VARCHAR(255) NOT NULL,
    prix_oeuf FLOAT NOT NULL,
    prix_kg FLOAT NOT NULL,
    description VARCHAR(500) NULL
);

CREATE TABLE vente_poulet (
    id_vente INT PRIMARY KEY IDENTITY(1,1),
    id_lot INT NOT NULL REFERENCES lot(id_lot),
    date_vente DATE NOT NULL,
    nb_poulets INT NOT NULL,
    poids_total_kg FLOAT NOT NULL, 
    -- Calcul : somme des variations de poids par semaine
    -- Si ce n’est pas une semaine complète, diviser la variation de la semaine restante proportionnellement aux jours
    -- L’âge des poulets est calculé en semaines et jours selon la date de vente
    prix_kg FLOAT NULL, 
    -- Doit être automatiquement récupéré depuis la table race
    prix_total AS (poids_total_kg * prix_kg) PERSISTED
);
```

---

### 4️⃣ Fiche par défaut pour la progression du poids

* Créer une **fiche par défaut couvrant 30 semaines**.
* Objectif : combler les semaines manquantes dans les fiches des lots pour assurer une **progression approximative du poids**.
* Fonctionnement :

  * Si une fiche de lot n’a pas toutes les lignes pour les variations de poids, la fiche par défaut s’applique pour les semaines manquantes.
  * La fiche par défaut peut **être activée ou désactivée** selon les paramètres.

---

### 5️⃣ Points de vigilance

* Avant d’appliquer les changements, vérifier :

  * Que toutes les instructions sont compréhensibles
  * Que les paramètres activables/désactivables sont bien définis
  * Les relations entre les tables et calculs de poids/ prix sont correctes


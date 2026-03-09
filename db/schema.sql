-- ============================================================
-- AKOHO — Schéma complet de la base de données
-- SQL Server (T-SQL)
-- ============================================================

-- Création de la base si elle n'existe pas
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'akoho')
    CREATE DATABASE akoho;
GO

USE akoho;
GO

-- ============================================================
-- 1. TABLES DE RÉFÉRENCE
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'race')
CREATE TABLE race (
    id_race     INT PRIMARY KEY IDENTITY(1,1),
    nom_race    VARCHAR(255) NOT NULL,
    prix_oeuf   FLOAT NOT NULL,
    prix_kg     FLOAT NOT NULL,
    description VARCHAR(500) NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'nourriture')
CREATE TABLE nourriture (
    id_nourriture  INT PRIMARY KEY IDENTITY(1,1),
    nom_nourriture VARCHAR(255) NOT NULL,
    prix_gramme    FLOAT NOT NULL,
    type_aliment   VARCHAR(50) NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fiche_model')
CREATE TABLE fiche_model (
    id_fiche  INT PRIMARY KEY IDENTITY(1,1),
    id_race   INT NOT NULL REFERENCES race(id_race),
    type      VARCHAR(20) NOT NULL DEFAULT 'concessionnaire',
    label     VARCHAR(255) NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fiche_row')
CREATE TABLE fiche_row (
    id_row        INT PRIMARY KEY IDENTITY(1,1),
    id_fiche      INT NOT NULL REFERENCES fiche_model(id_fiche),
    semaine       INT NOT NULL,
    age           INT NOT NULL,
    variation     FLOAT NOT NULL,
    id_nourriture INT NOT NULL REFERENCES nourriture(id_nourriture),
    poids         FLOAT NOT NULL
);
GO

-- ============================================================
-- 2. TABLE CENTRALE : LOT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lot')
CREATE TABLE lot (
    id_lot       INT PRIMARY KEY IDENTITY(1,1),
    nom_lot      VARCHAR(255) NOT NULL,
    id_race      INT NOT NULL REFERENCES race(id_race),
    age_arrivee  INT NOT NULL,
    nombre       INT NOT NULL,
    date_arrivee DATE NOT NULL,
    prix_achat   FLOAT NOT NULL DEFAULT 0,
    origine      VARCHAR(50) NOT NULL,
    id_lot_mere  INT REFERENCES lot(id_lot) NULL,
    id_fiche     INT REFERENCES fiche_model(id_fiche) NULL
);
GO

-- ============================================================
-- 3. TABLES D'ÉVÉNEMENTS
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'production_oeuf')
CREATE TABLE production_oeuf (
    id_production   INT PRIMARY KEY IDENTITY(1,1),
    id_lot          INT NOT NULL REFERENCES lot(id_lot),
    date_production DATE NOT NULL,
    nb_oeufs        INT NOT NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vente_oeuf')
CREATE TABLE vente_oeuf (
    id_vente      INT PRIMARY KEY IDENTITY(1,1),
    id_lot        INT NOT NULL REFERENCES lot(id_lot),
    date_vente    DATE NOT NULL,
    nb_oeufs      INT NOT NULL,
    prix_unitaire FLOAT NULL,
    prix_total    AS (nb_oeufs * prix_unitaire) PERSISTED
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'oeuf_couvaison')
CREATE TABLE oeuf_couvaison (
    id_couvaison        INT PRIMARY KEY IDENTITY(1,1),
    id_lot_mere         INT NOT NULL REFERENCES lot(id_lot),
    date_mise_couvaison DATE NOT NULL,
    nb_oeufs_couves     INT NOT NULL,
    date_eclosion       AS (DATEADD(DAY, 45, date_mise_couvaison)) PERSISTED,
    nb_ecloses          INT NULL,
    id_lot_ne           INT REFERENCES lot(id_lot) NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'perte')
CREATE TABLE perte (
    id_perte   INT PRIMARY KEY IDENTITY(1,1),
    id_lot     INT NOT NULL REFERENCES lot(id_lot),
    date_perte DATE NOT NULL,
    nb_perdus  INT NOT NULL,
    cause      VARCHAR(255) NULL,
    entite     VARCHAR(50) NULL CHECK (entite IN ('Poulet', 'Oeuf'))
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vente_poulet')
CREATE TABLE vente_poulet (
    id_vente       INT PRIMARY KEY IDENTITY(1,1),
    id_lot         INT NOT NULL REFERENCES lot(id_lot),
    date_vente     DATE NOT NULL,
    nb_poulets     INT NOT NULL,
    poids_total_kg FLOAT NOT NULL,
    prix_kg        FLOAT NULL,
    prix_total     AS (poids_total_kg * prix_kg) PERSISTED
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vente_lot')
CREATE TABLE vente_lot (
    id_vente   INT PRIMARY KEY IDENTITY(1,1),
    id_lot     INT NOT NULL REFERENCES lot(id_lot),
    date_vente DATE NOT NULL,
    prix_vente FLOAT NOT NULL
);
GO

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Sync race from fiche on lot insert/update
IF OBJECT_ID('trg_lot_sync_race_from_fiche', 'TR') IS NOT NULL DROP TRIGGER trg_lot_sync_race_from_fiche;
GO

CREATE TRIGGER trg_lot_sync_race_from_fiche
ON lot
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE l
    SET l.id_race = fm.id_race
    FROM lot l
    INNER JOIN inserted i ON l.id_lot = i.id_lot
    INNER JOIN fiche_model fm ON i.id_fiche = fm.id_fiche
    WHERE i.id_fiche IS NOT NULL;
END;
GO

-- Auto-fill prix_unitaire on vente_oeuf
IF OBJECT_ID('trg_vente_oeuf_set_price', 'TR') IS NOT NULL DROP TRIGGER trg_vente_oeuf_set_price;
GO

CREATE TRIGGER trg_vente_oeuf_set_price
ON vente_oeuf
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE vo
    SET vo.prix_unitaire = r.prix_oeuf
    FROM vente_oeuf vo
    INNER JOIN inserted i ON vo.id_vente = i.id_vente
    INNER JOIN lot l ON i.id_lot = l.id_lot
    INNER JOIN race r ON l.id_race = r.id_race
    WHERE i.prix_unitaire IS NULL;
END;
GO

-- Auto-fill prix_kg on vente_poulet
IF OBJECT_ID('trg_vente_poulet_set_price', 'TR') IS NOT NULL DROP TRIGGER trg_vente_poulet_set_price;
GO

CREATE TRIGGER trg_vente_poulet_set_price
ON vente_poulet
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE vp
    SET vp.prix_kg = r.prix_kg
    FROM vente_poulet vp
    INNER JOIN inserted i ON vp.id_vente = i.id_vente
    INNER JOIN lot l ON i.id_lot = l.id_lot
    INNER JOIN race r ON l.id_race = r.id_race
    WHERE i.prix_kg IS NULL;
END;
GO

-- ============================================================
-- 5. FONCTIONS SCALAIRES
-- ============================================================

IF OBJECT_ID('dbo.fn_semaine_actuelle', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_semaine_actuelle;
GO

CREATE FUNCTION dbo.fn_semaine_actuelle(@id_lot INT, @date DATE)
RETURNS INT
AS
BEGIN
    DECLARE @result INT;
    SELECT @result = age_arrivee + DATEDIFF(WEEK, date_arrivee, @date)
    FROM lot WHERE id_lot = @id_lot;
    RETURN @result;
END;
GO

IF OBJECT_ID('dbo.fn_nombre_actuel', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_nombre_actuel;
GO

CREATE FUNCTION dbo.fn_nombre_actuel(@id_lot INT, @date DATE)
RETURNS INT
AS
BEGIN
    DECLARE @result INT;
    SELECT @result = l.nombre
        - ISNULL((SELECT SUM(nb_perdus) FROM perte WHERE id_lot = @id_lot AND date_perte <= @date AND (entite = 'Poulet' OR entite IS NULL)), 0)
        - ISNULL((SELECT SUM(nb_poulets) FROM vente_poulet WHERE id_lot = @id_lot AND date_vente <= @date), 0)
    FROM lot l WHERE l.id_lot = @id_lot;
    RETURN @result;
END;
GO

IF OBJECT_ID('dbo.fn_stock_oeufs', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_stock_oeufs;
GO

CREATE FUNCTION dbo.fn_stock_oeufs(@id_lot INT, @date DATE)
RETURNS INT
AS
BEGIN
    DECLARE @result INT;
    SET @result =
        ISNULL((SELECT SUM(nb_oeufs) FROM production_oeuf WHERE id_lot = @id_lot AND date_production <= @date), 0)
      - ISNULL((SELECT SUM(nb_oeufs) FROM vente_oeuf WHERE id_lot = @id_lot AND date_vente <= @date), 0)
      - ISNULL((SELECT SUM(nb_oeufs_couves) FROM oeuf_couvaison WHERE id_lot_mere = @id_lot AND date_mise_couvaison <= @date), 0);
    RETURN @result;
END;
GO

IF OBJECT_ID('dbo.fn_cout_nourriture', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_cout_nourriture;
GO

CREATE FUNCTION dbo.fn_cout_nourriture(@id_lot INT, @date DATE)
RETURNS FLOAT
AS
BEGIN
    DECLARE @result FLOAT;
    DECLARE @nombre INT;
    DECLARE @id_fiche INT;
    DECLARE @semaine_actuelle INT;

    SELECT @nombre = nombre, @id_fiche = id_fiche FROM lot WHERE id_lot = @id_lot;
    SET @semaine_actuelle = dbo.fn_semaine_actuelle(@id_lot, @date);

    IF @id_fiche IS NULL
        RETURN 0;

    SELECT @result = @nombre * ISNULL(SUM(fr.poids * n.prix_gramme), 0)
    FROM fiche_row fr
    INNER JOIN nourriture n ON fr.id_nourriture = n.id_nourriture
    WHERE fr.id_fiche = @id_fiche AND fr.semaine <= @semaine_actuelle;

    RETURN ISNULL(@result, 0);
END;
GO

IF OBJECT_ID('dbo.fn_revenus_lot', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_revenus_lot;
GO

CREATE FUNCTION dbo.fn_revenus_lot(@id_lot INT, @date DATE)
RETURNS FLOAT
AS
BEGIN
    DECLARE @result FLOAT;
    SET @result =
        ISNULL((SELECT SUM(prix_total) FROM vente_oeuf WHERE id_lot = @id_lot AND date_vente <= @date), 0)
      + ISNULL((SELECT SUM(prix_total) FROM vente_poulet WHERE id_lot = @id_lot AND date_vente <= @date), 0)
      + ISNULL((SELECT SUM(prix_vente) FROM vente_lot WHERE id_lot = @id_lot AND date_vente <= @date), 0);
    RETURN @result;
END;
GO

IF OBJECT_ID('dbo.fn_benefice_net', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_benefice_net;
GO

CREATE FUNCTION dbo.fn_benefice_net(@id_lot INT, @date DATE)
RETURNS FLOAT
AS
BEGIN
    DECLARE @result FLOAT;
    DECLARE @prix_achat FLOAT;
    SELECT @prix_achat = prix_achat FROM lot WHERE id_lot = @id_lot;
    SET @result = dbo.fn_revenus_lot(@id_lot, @date) - @prix_achat - dbo.fn_cout_nourriture(@id_lot, @date);
    RETURN @result;
END;
GO

IF OBJECT_ID('dbo.fn_prix_revient_oeuf', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_prix_revient_oeuf;
GO

CREATE FUNCTION dbo.fn_prix_revient_oeuf(@id_lot INT, @date DATE)
RETURNS FLOAT
AS
BEGIN
    DECLARE @total_oeufs INT;
    DECLARE @prix_achat FLOAT;
    SELECT @prix_achat = prix_achat FROM lot WHERE id_lot = @id_lot;
    SELECT @total_oeufs = ISNULL(SUM(nb_oeufs), 0) FROM production_oeuf WHERE id_lot = @id_lot AND date_production <= @date;
    IF @total_oeufs = 0 RETURN NULL;
    RETURN (@prix_achat + dbo.fn_cout_nourriture(@id_lot, @date)) / @total_oeufs;
END;
GO

-- ============================================================
-- 6. FONCTIONS TABLE (TVF)
-- ============================================================

IF OBJECT_ID('dbo.fn_dashboard', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_dashboard;
GO

CREATE FUNCTION dbo.fn_dashboard(@date DATE)
RETURNS TABLE
AS
RETURN (
    SELECT
        l.id_lot,
        l.nom_lot AS lot,
        r.nom_race,
        ISNULL((SELECT SUM(p.nb_perdus) FROM perte p WHERE p.id_lot = l.id_lot AND p.date_perte = @date), 0) AS nb_mort_poulet,
        ISNULL((SELECT SUM(po.nb_oeufs) FROM production_oeuf po WHERE po.id_lot = l.id_lot AND po.date_production = @date), 0) AS atody_oeufs,
        r.prix_oeuf AS prix_moyen_race,
        ISNULL((SELECT SUM(vo.prix_total) FROM vente_oeuf vo WHERE vo.id_lot = l.id_lot AND vo.date_vente = @date), 0) AS prix_vente_jour,
        dbo.fn_nombre_actuel(l.id_lot, @date) AS nombre_actuel,
        dbo.fn_stock_oeufs(l.id_lot, @date) AS stock_oeufs,
        dbo.fn_semaine_actuelle(l.id_lot, @date) AS semaine_actuelle
    FROM lot l
    INNER JOIN race r ON l.id_race = r.id_race
);
GO

IF OBJECT_ID('dbo.fn_rentabilite', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_rentabilite;
GO

CREATE FUNCTION dbo.fn_rentabilite(@date DATE)
RETURNS TABLE
AS
RETURN (
    SELECT
        l.id_lot,
        l.nom_lot,
        r.nom_race,
        l.prix_achat AS cout_acquisition,
        dbo.fn_cout_nourriture(l.id_lot, @date) AS cout_nourriture_estime,
        ISNULL((SELECT SUM(vo.prix_total) FROM vente_oeuf vo WHERE vo.id_lot = l.id_lot AND vo.date_vente <= @date), 0) AS revenus_oeufs,
        ISNULL((SELECT SUM(vp.prix_total) FROM vente_poulet vp WHERE vp.id_lot = l.id_lot AND vp.date_vente <= @date), 0)
          + ISNULL((SELECT SUM(vl.prix_vente) FROM vente_lot vl WHERE vl.id_lot = l.id_lot AND vl.date_vente <= @date), 0) AS revenus_poulets,
        dbo.fn_benefice_net(l.id_lot, @date) AS benefice_net
    FROM lot l
    INNER JOIN race r ON l.id_race = r.id_race
);
GO

-- ============================================================
-- 7. VUES (raccourcis "aujourd'hui")
-- ============================================================

IF OBJECT_ID('dbo.vue_dashboard', 'V') IS NOT NULL DROP VIEW dbo.vue_dashboard;
GO

CREATE VIEW vue_dashboard AS SELECT * FROM dbo.fn_dashboard(CAST(GETDATE() AS DATE));
GO

IF OBJECT_ID('dbo.vue_rentabilite', 'V') IS NOT NULL DROP VIEW dbo.vue_rentabilite;
GO

CREATE VIEW vue_rentabilite AS SELECT * FROM dbo.fn_rentabilite(CAST(GETDATE() AS DATE));
GO

PRINT '✅ Schema created successfully';
GO

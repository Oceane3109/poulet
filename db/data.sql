-- ============================================================
-- AKOHO — Données de test (réinitialisables)
-- ============================================================
USE akoho;
GO

-- Nettoyage complet (ordre inverse des dépendances)
DELETE FROM vente_lot;
DELETE FROM vente_poulet;
DELETE FROM vente_oeuf;
DELETE FROM perte;
DELETE FROM oeuf_couvaison;
DELETE FROM production_oeuf;
DELETE FROM fiche_row;
DELETE FROM lot;
DELETE FROM fiche_model;
DELETE FROM nourriture;
DELETE FROM race;
GO

-- Reseed identities
DBCC CHECKIDENT ('race', RESEED, 0);
DBCC CHECKIDENT ('nourriture', RESEED, 0);
DBCC CHECKIDENT ('fiche_model', RESEED, 0);
DBCC CHECKIDENT ('fiche_row', RESEED, 0);
DBCC CHECKIDENT ('lot', RESEED, 0);
DBCC CHECKIDENT ('production_oeuf', RESEED, 0);
DBCC CHECKIDENT ('vente_oeuf', RESEED, 0);
DBCC CHECKIDENT ('oeuf_couvaison', RESEED, 0);
DBCC CHECKIDENT ('perte', RESEED, 0);
DBCC CHECKIDENT ('vente_poulet', RESEED, 0);
DBCC CHECKIDENT ('vente_lot', RESEED, 0);
GO

-- ============================================================
-- RACES
-- ============================================================
INSERT INTO race (nom_race, prix_oeuf, prix_kg, description) VALUES
('ISA Brown',  500,  15000, 'Race hybride pondeuse très productive, plumage brun'),
('Lohmann',    450,  14000, 'Pondeuse industrielle performante, bonne rusticité'),
('Bovans',     480,  13500, 'Race pondeuse à fort rendement, adaptée climat chaud'),
('Hy-Line',    520,  16000, 'Pondeuse premium, œufs gros calibre');
GO

-- ============================================================
-- NOURRITURE
-- ============================================================
INSERT INTO nourriture (nom_nourriture, prix_gramme, type_aliment) VALUES
('Granulés ponte A',     0.8,  'Granulés'),
('Granulés ponte B',     0.65, 'Granulés'),
('Mash standard',        0.5,  'Mash'),
('Démarrage poussin',    1.2,  'Démarrage'),
('Croissance A',         0.9,  'Croissance');
GO

-- ============================================================
-- FICHES DE CROISSANCE
-- ============================================================

-- Fiche 1 : ISA Brown ponte standard (concessionnaire)
INSERT INTO fiche_model (id_race, type, label) VALUES (1, 'concessionnaire', 'ISA Brown — Ponte standard 18S');
-- Fiche 2 : Lohmann ponte standard (concessionnaire)
INSERT INTO fiche_model (id_race, type, label) VALUES (2, 'concessionnaire', 'Lohmann — Ponte standard 6S');
-- Fiche 3 : ISA Brown démarrage (defaut)
INSERT INTO fiche_model (id_race, type, label) VALUES (1, 'defaut', 'ISA Brown — Démarrage poussin');
-- Fiche 4 : Fiche minimale (defaut)
INSERT INTO fiche_model (id_race, type, label) VALUES (3, 'defaut', 'Bovans — Fiche minimale');
GO

-- Fiche 1 rows (18 semaines)
INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids) VALUES
(1, 1,  18, 25, 1, 105), (1, 2,  19, 30, 1, 110), (1, 3,  20, 28, 1, 112),
(1, 4,  21, 25, 1, 115), (1, 5,  22, 20, 1, 118), (1, 6,  23, 18, 1, 120),
(1, 7,  24, 15, 2, 120), (1, 8,  25, 12, 2, 118), (1, 9,  26, 10, 2, 118),
(1, 10, 27, 8,  2, 115), (1, 11, 28, 6,  2, 115), (1, 12, 29, 5,  2, 112),
(1, 13, 30, 4,  3, 110), (1, 14, 31, 3,  3, 110), (1, 15, 32, 2,  3, 108),
(1, 16, 33, 2,  3, 108), (1, 17, 34, 1,  3, 105), (1, 18, 35, 1,  3, 105);
GO

-- Fiche 2 rows (6 semaines)
INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids) VALUES
(2, 1, 20, 30, 1, 110), (2, 2, 21, 28, 1, 115),
(2, 3, 22, 25, 2, 118), (2, 4, 23, 20, 2, 120),
(2, 5, 24, 15, 3, 115), (2, 6, 25, 12, 3, 112);
GO

-- Fiche 3 rows (2 semaines démarrage)
INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids) VALUES
(3, 1, 1, 45, 4, 30), (3, 2, 2, 50, 4, 45);
GO

-- Fiche 4 rows (2 semaines minimales)
INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids) VALUES
(4, 1, 1, 40, 4, 28), (4, 2, 2, 48, 5, 42);
GO

-- ============================================================
-- LOTS
-- ============================================================

-- LOT1 : 500 ISA Brown, achetées le 10/01/2026, age 18 semaines, fiche 1
INSERT INTO lot (nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche)
VALUES ('LOT1', 1, 18, 500, '2026-01-10', 2500000, 'achat', NULL, 1);

-- LOT2 : 300 Lohmann, achetées le 01/02/2026, age 20 semaines, fiche 2
INSERT INTO lot (nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche)
VALUES ('LOT2', 2, 20, 300, '2026-02-01', 1800000, 'achat', NULL, 2);

-- LOT3 : 120 ISA Brown, issues de couvaison le 01/03/2026, age 1 semaine, fiche 3
INSERT INTO lot (nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche)
VALUES ('LOT3', 1, 1, 120, '2026-03-01', 0, 'couvaison', 1, 3);
GO

-- ============================================================
-- PRODUCTION D'OEUFS
-- ============================================================
INSERT INTO production_oeuf (id_lot, date_production, nb_oeufs) VALUES
-- LOT1 production janvier
(1, '2026-01-15', 280), (1, '2026-01-16', 295), (1, '2026-01-17', 310),
(1, '2026-01-18', 305), (1, '2026-01-19', 320), (1, '2026-01-20', 315),
(1, '2026-01-25', 330), (1, '2026-01-26', 325), (1, '2026-01-27', 340),
-- LOT1 production février
(1, '2026-02-01', 350), (1, '2026-02-02', 345), (1, '2026-02-05', 360),
(1, '2026-02-10', 370), (1, '2026-02-15', 365), (1, '2026-02-20', 380),
(1, '2026-02-25', 375),
-- LOT1 production mars
(1, '2026-03-01', 385), (1, '2026-03-02', 390), (1, '2026-03-03', 388),
(1, '2026-03-04', 395), (1, '2026-03-05', 392), (1, '2026-03-06', 400),
(1, '2026-03-07', 398), (1, '2026-03-08', 405),
-- LOT2 production février
(2, '2026-02-05', 150), (2, '2026-02-10', 170), (2, '2026-02-15', 185),
(2, '2026-02-20', 195), (2, '2026-02-25', 200),
-- LOT2 production mars
(2, '2026-03-01', 210), (2, '2026-03-02', 215), (2, '2026-03-03', 208),
(2, '2026-03-04', 220), (2, '2026-03-05', 218), (2, '2026-03-06', 225),
(2, '2026-03-07', 222), (2, '2026-03-08', 228);
GO

-- ============================================================
-- VENTES D'OEUFS
-- ============================================================
INSERT INTO vente_oeuf (id_lot, date_vente, nb_oeufs, prix_unitaire) VALUES
(1, '2026-01-20', 200, 500),
(1, '2026-01-27', 300, 500),
(1, '2026-02-05', 250, 520),
(1, '2026-02-15', 400, 500),
(1, '2026-02-25', 350, 480),
(1, '2026-03-01', 300, 500),
(1, '2026-03-05', 500, 510),
(2, '2026-02-15', 150, 450),
(2, '2026-02-25', 180, 450),
(2, '2026-03-03', 200, 460),
(2, '2026-03-07', 250, 450);
GO

-- ============================================================
-- COUVAISONS
-- ============================================================

-- Couvaison terminée (80 œufs → 69 éclos → LOT3)
INSERT INTO oeuf_couvaison (id_lot_mere, date_mise_couvaison, nb_oeufs_couves, nb_ecloses, id_lot_ne)
VALUES (1, '2026-01-15', 80, 69, 3);

-- Couvaison active 1 (120 œufs, éclosion prévue 27/03/2026)
INSERT INTO oeuf_couvaison (id_lot_mere, date_mise_couvaison, nb_oeufs_couves, nb_ecloses, id_lot_ne)
VALUES (1, '2026-02-10', 120, NULL, NULL);

-- Couvaison active 2 (85 œufs, éclosion prévue 15/04/2026)
INSERT INTO oeuf_couvaison (id_lot_mere, date_mise_couvaison, nb_oeufs_couves, nb_ecloses, id_lot_ne)
VALUES (2, '2026-03-01', 85, NULL, NULL);
GO

-- ============================================================
-- PERTES
-- ============================================================
INSERT INTO perte (id_lot, date_perte, nb_perdus, cause) VALUES
(1, '2026-01-18', 3,  'Maladie respiratoire'),
(1, '2026-01-25', 2,  'Prédateur'),
(1, '2026-02-10', 1,  NULL),
(1, '2026-02-20', 4,  'Maladie'),
(1, '2026-03-05', 2,  'Stress thermique'),
(1, '2026-03-08', 1,  NULL),
(2, '2026-02-15', 2,  'Maladie'),
(2, '2026-03-01', 3,  'Prédateur'),
(2, '2026-03-07', 1,  NULL),
(3, '2026-03-05', 5,  'Mortalité poussin');
GO

-- ============================================================
-- VENTES DE POULETS
-- ============================================================
INSERT INTO vente_poulet (id_lot, date_vente, nb_poulets, poids_total_kg, prix_kg) VALUES
(1, '2026-02-20', 10, 18.5, 15000),
(1, '2026-03-05', 15, 28.2, 15500),
(2, '2026-03-01', 8,  14.0, 14000);
GO

-- ============================================================
-- VENTES DE LOTS (cessions)
-- ============================================================
-- Aucune cession pour le moment

-- ============================================================
-- PARAMETRES
-- ============================================================
DELETE FROM parametre;
INSERT INTO parametre (cle, valeur, label, type_input) VALUES
('limite_vente_active',    '0', 'Activer limitation de vente',                   'toggle'),
('limite_vente_semaine',   '6', 'Semaine minimale pour vendre des poulets',       'number'),
('limite_vente_poids_kg',  '0.5', 'Poids minimum pour vendre (kg)',               'number'),
('arret_poids_active',     '0', 'Activer arrêt progression du poids',            'toggle'),
('arret_poids_semaine',    '25', 'Semaine d''arrêt de progression du poids',      'number'),
('fiche_defaut_active',    '1', 'Utiliser fiche par défaut si semaines manquantes','toggle');
GO

-- ============================================================
-- FICHE PAR DEFAUT 30 SEMAINES
-- ============================================================
DELETE FROM fiche_defaut_row;
INSERT INTO fiche_defaut_row (semaine, variation, poids) VALUES
(1, 45, 30), (2, 50, 45), (3, 48, 55), (4, 45, 65), (5, 40, 80),
(6, 35, 95), (7, 30, 110), (8, 28, 125), (9, 25, 135), (10, 22, 145),
(11, 20, 155), (12, 18, 165), (13, 16, 175), (14, 14, 182), (15, 12, 190),
(16, 10, 196), (17, 9, 202), (18, 8, 208), (19, 7, 212), (20, 6, 216),
(21, 5, 220), (22, 5, 224), (23, 4, 227), (24, 4, 230), (25, 3, 232),
(26, 3, 234), (27, 2, 235), (28, 2, 236), (29, 1, 237), (30, 1, 238);
GO

PRINT '✅ Test data inserted successfully';
GO

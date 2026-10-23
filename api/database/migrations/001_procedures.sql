-- ---------------------------------------------------------------------------
-- 001 : procédures définies dans le panel (23/10/2026).
--
-- Un modèle de procédure (« Visa visiteur – salarié ») porte les étapes du
-- suivi et les pièces à fournir. À l'ouverture d'un dossier, ils y sont
-- copiés : modifier un modèle ensuite ne change pas les dossiers ouverts.
--
-- Les dossiers existants gardent les étapes par défaut (colonne `steps`
-- vide, voir App\Dossiers\Process) ; seul le libellé de leur étape en cours
-- est recopié ici.
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `procedures` (
    `id`         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    -- Identifiant de la prestation (section « Prestations » du contenu).
    `service`    VARCHAR(60) NOT NULL,
    `name`       VARCHAR(120) NOT NULL,
    -- [{label, description}], dans l'ordre du suivi.
    `steps`      LONGTEXT NOT NULL,
    -- [{label, help, required}], dans l'ordre d'affichage.
    `checklist`  LONGTEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `procedures_service` (`service`),
    CONSTRAINT `procedures_steps_json` CHECK (JSON_VALID(`steps`)),
    CONSTRAINT `procedures_checklist_json` CHECK (JSON_VALID(`checklist`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `dossiers`
    ADD COLUMN `procedure_name` VARCHAR(120) NOT NULL DEFAULT '' AFTER `service`,
    ADD COLUMN `step_count` TINYINT UNSIGNED NOT NULL DEFAULT 5 AFTER `step`,
    ADD COLUMN `step_label` VARCHAR(80) NOT NULL DEFAULT '' AFTER `step_count`,
    ADD COLUMN `steps` LONGTEXT NULL DEFAULT NULL AFTER `step_changed_at`,
    ADD CONSTRAINT `dossiers_steps_json` CHECK (`steps` IS NULL OR JSON_VALID(`steps`));

-- Libellés des étapes par défaut (Process::DEFAULT_STEPS au 23/10/2026).
UPDATE `dossiers` SET `step_label` = CASE `step`
    WHEN 1 THEN 'Dossier ouvert'
    WHEN 2 THEN 'Documents à fournir'
    WHEN 3 THEN 'Dossier en préparation'
    WHEN 4 THEN 'Déposé au consulat'
    WHEN 5 THEN 'Décision rendue'
    ELSE `step_label`
END
WHERE `steps` IS NULL;

INSERT INTO `schema_migrations` (`version`) VALUES ('001_procedures');

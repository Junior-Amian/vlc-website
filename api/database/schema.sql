-- ---------------------------------------------------------------------------
-- Schéma de la base VISILION CORPORATE : panel d'administration du contenu
-- et espace client.
--
-- À importer une fois (phpMyAdmin > Importer, ou en ligne de commande), puis
-- importer seed.sql pour le contenu initial du site. Compatible MySQL 5.7+
-- et MariaDB 10.2+.
--
-- Le contenu du site tient dans content_sections : une ligne par section
-- (bannière, prestations, témoignages…), dont les données sont un document
-- JSON. Sa structure est fixée et validée par app/Content/ContentSchema.php,
-- jamais par la base : ajouter un champ ne demande donc aucune migration.
--
-- Identifiants : UUID version 4, en CHAR(36) ASCII, tirés par l'API
-- (app/Core/Uuid.php) et jamais par la base (UUID() de MariaDB donne des v1,
-- dérivés de l'horloge). Ils ne révèlent ni le nombre de lignes ni leur
-- ordre, et restent lisibles dans phpMyAdmin. Deux exceptions :
-- analytics_events (journal interne, volumineux, jamais exposé : un entier
-- suffit) et content_sections (clé déjà textuelle : hero, services…).
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `admins` (
    `id`            CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `name`          VARCHAR(120) NOT NULL,
    `email`         VARCHAR(180) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    -- Incrémenté à chaque changement de mot de passe : les sessions ouvertes
    -- avant le changement deviennent invalides.
    `token_version` INT UNSIGNED NOT NULL DEFAULT 1,
    `last_login_at` DATETIME NULL DEFAULT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `admins_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Images envoyées depuis le panel. Chaque image existe en plusieurs largeurs,
-- produites par le navigateur de l'administrateur avant l'envoi : `variants`
-- liste ces fichiers, relatifs à api/public/uploads.
CREATE TABLE IF NOT EXISTS `media` (
    `id`            CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `alt`           VARCHAR(200) NOT NULL DEFAULT '',
    `width`         INT UNSIGNED NOT NULL,
    `height`        INT UNSIGNED NOT NULL,
    `variants`      LONGTEXT NOT NULL,
    `size`          INT UNSIGNED NOT NULL DEFAULT 0,
    `created_by`    CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `media_variants_json` CHECK (JSON_VALID(`variants`)),
    CONSTRAINT `media_created_by_fk` FOREIGN KEY (`created_by`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mesure d'audience du site, sans cookie ni service tiers.
--
-- Aucune donnée personnelle : `visitor` est une empreinte de l'adresse IP et
-- du navigateur, calculée avec une clé qui change chaque jour et n'est jamais
-- conservée (app/Analytics/VisitorId.php). Elle distingue les visiteurs d'une
-- même journée, sans permettre de retrouver qui que ce soit ni de suivre
-- quelqu'un d'un jour à l'autre. Les lignes de plus de 13 mois sont effacées.
--
-- type = pageview (name : chemin), section (name : identifiant de la section
-- vue) ou action (name : call, whatsapp, email, contact_form).
CREATE TABLE IF NOT EXISTS `analytics_events` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type`       ENUM('pageview', 'section', 'action') NOT NULL,
    `name`       VARCHAR(120) NOT NULL,
    `visitor`    CHAR(16) NOT NULL,
    -- Site d'où vient le visiteur (domaine seul), pour les pages vues.
    `referrer`   VARCHAR(120) NULL DEFAULT NULL,
    `device`     ENUM('mobile', 'tablet', 'desktop') NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `analytics_type_date` (`type`, `created_at`),
    KEY `analytics_visitor_date` (`visitor`, `created_at`),
    -- Totaux et courbe du tableau de bord : filtrés sur la période seule,
    -- sans type, ils ne peuvent pas s'appuyer sur les deux index ci-dessus.
    KEY `analytics_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demandes envoyées par le formulaire de contact du site.
--
-- Enregistrées avant l'envoi de l'email de notification : une demande dont
-- l'email échoue n'est jamais perdue. `status` suit le traitement dans le
-- panel ; `note` est une note interne, jamais montrée au visiteur. Données
-- personnelles : à supprimer depuis le panel une fois la demande traitée et
-- devenue inutile.
CREATE TABLE IF NOT EXISTS `contact_requests` (
    `id`         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `full_name`  VARCHAR(120) NOT NULL,
    `email`      VARCHAR(180) NOT NULL,
    `phone`      VARCHAR(30) NOT NULL,
    `message`    TEXT NOT NULL,
    `status`     ENUM('new', 'in_progress', 'done', 'spam') NOT NULL DEFAULT 'new',
    `note`       TEXT NULL DEFAULT NULL,
    -- L'email de notification est-il bien parti ?
    `email_sent` TINYINT(1) NOT NULL DEFAULT 0,
    -- Dernier administrateur à avoir changé l'état ou la note.
    `handled_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `contact_requests_status_date` (`status`, `created_at`),
    CONSTRAINT `contact_requests_handled_by_fk` FOREIGN KEY (`handled_by`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `content_sections` (
    `section_key` VARCHAR(40) NOT NULL,
    `data`        LONGTEXT NOT NULL,
    -- Verrou optimiste : un enregistrement fondé sur une version périmée est
    -- refusé (409) au lieu d'écraser les modifications d'un autre administrateur.
    `version`     INT UNSIGNED NOT NULL DEFAULT 1,
    `updated_by`  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`section_key`),
    CONSTRAINT `content_sections_data_json` CHECK (JSON_VALID(`data`)),
    CONSTRAINT `content_sections_updated_by_fk` FOREIGN KEY (`updated_by`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Espace client
--
-- Un compte client n'existe que sur invitation : l'équipe ouvre le dossier
-- dans le panel, le client reçoit un lien et choisit son mot de passe.
-- Les documents déposés sont rangés dans api/storage/documents, hors de la
-- racine web, sous un nom aléatoire ; ils ne sont servis qu'à leur
-- propriétaire et aux administrateurs.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `clients` (
    `id`            CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `email`         VARCHAR(180) NOT NULL,
    -- NULL tant que l'invitation n'a pas été acceptée.
    `password_hash` VARCHAR(255) NULL DEFAULT NULL,
    `full_name`     VARCHAR(120) NOT NULL,
    `phone`         VARCHAR(30) NOT NULL DEFAULT '',
    -- Réponses du formulaire d'ouverture de dossier. Les questions sont
    -- définies dans app/Dossiers/Onboarding.php, pas dans la base : les
    -- changer ne demande aucune migration.
    `profile`       LONGTEXT NULL DEFAULT NULL,
    `onboarded_at`  DATETIME NULL DEFAULT NULL,
    `token_version` INT UNSIGNED NOT NULL DEFAULT 1,
    `last_login_at` DATETIME NULL DEFAULT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `clients_email_unique` (`email`),
    CONSTRAINT `clients_profile_json` CHECK (`profile` IS NULL OR JSON_VALID(`profile`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Liens d'invitation et de mot de passe oublié. Seule l'empreinte SHA-256
-- du jeton est conservée : une fuite de la base ne donne accès à aucun compte.
CREATE TABLE IF NOT EXISTS `client_tokens` (
    `id`         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `client_id`  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `type`       ENUM('invite', 'reset') NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `used_at`    DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `client_tokens_hash_unique` (`token_hash`),
    CONSTRAINT `client_tokens_client_fk` FOREIGN KEY (`client_id`)
        REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un dossier de visa. `step` renvoie aux étapes d'app/Dossiers/Process.php ;
-- `amount_total` est en francs CFA, NULL tant que le montant n'est pas fixé.
CREATE TABLE IF NOT EXISTS `dossiers` (
    `id`                 CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    -- Numéro d'ordre, d'où la référence lisible donnée au client
    -- (VLC-2026-0042, voir Dossier::reference) : l'UUID ne s'épelle pas au téléphone.
    `number`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id`          CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    -- Identifiant de la prestation (section « Prestations » du contenu).
    `service`            VARCHAR(60) NOT NULL,
    `country`            VARCHAR(80) NOT NULL DEFAULT '',
    `step`               TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `step_changed_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `amount_total`       INT UNSIGNED NULL DEFAULT NULL,
    -- Note interne, jamais montrée au client.
    `note`               TEXT NULL DEFAULT NULL,
    `contact_request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `created_by`         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    -- Dernière lecture des messages du dossier, par le client et par
    -- l'équipe : un message de l'autre partie plus récent est « non lu ».
    -- Au millième de seconde, comme dossier_messages.created_at.
    `client_read_at`     DATETIME(3) NULL DEFAULT NULL,
    `team_read_at`       DATETIME(3) NULL DEFAULT NULL,
    -- Dernier email « documents reçus » envoyé au client, et dernier email
    -- « documents déposés » envoyé à l'équipe : un client qui dépose cinq
    -- fichiers d'affilée ne déclenche qu'un email de chaque (app/Dossiers/Notifier.php).
    `receipt_notified_at` DATETIME NULL DEFAULT NULL,
    `upload_notified_at`  DATETIME NULL DEFAULT NULL,
    `created_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `dossiers_number_unique` (`number`),
    KEY `dossiers_client` (`client_id`),
    CONSTRAINT `dossiers_client_fk` FOREIGN KEY (`client_id`)
        REFERENCES `clients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `dossiers_contact_request_fk` FOREIGN KEY (`contact_request_id`)
        REFERENCES `contact_requests` (`id`) ON DELETE SET NULL,
    CONSTRAINT `dossiers_created_by_fk` FOREIGN KEY (`created_by`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pièces à fournir, propres à chaque dossier : la liste par défaut
-- (app/Dossiers/Process.php) est copiée à l'ouverture, puis ajustée à la main.
CREATE TABLE IF NOT EXISTS `checklist_items` (
    `id`               CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `dossier_id`       CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `label`            VARCHAR(160) NOT NULL,
    `help`             VARCHAR(300) NOT NULL DEFAULT '',
    `required`         TINYINT(1) NOT NULL DEFAULT 1,
    -- missing : rien reçu ; received : à vérifier ; validated : accepté ;
    -- rejected : à refaire, motif dans rejection_reason.
    `status`           ENUM('missing', 'received', 'validated', 'rejected') NOT NULL DEFAULT 'missing',
    `rejection_reason` VARCHAR(300) NULL DEFAULT NULL,
    `position`         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `checklist_items_dossier` (`dossier_id`, `position`),
    CONSTRAINT `checklist_items_dossier_fk` FOREIGN KEY (`dossier_id`)
        REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fichiers déposés pour une pièce (plusieurs possibles : pages d'un
-- passeport, relevés de plusieurs mois). Conservés sans limite de durée, à
-- la demande du client ; supprimés avec leur dossier.
CREATE TABLE IF NOT EXISTS `documents` (
    `id`                CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `checklist_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `original_name`     VARCHAR(255) NOT NULL,
    -- Chemin relatif à api/storage/documents, nom aléatoire sans extension.
    `stored_name`       VARCHAR(80) NOT NULL,
    `mime`              VARCHAR(120) NOT NULL,
    `size`              INT UNSIGNED NOT NULL,
    `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `documents_item` (`checklist_item_id`),
    CONSTRAINT `documents_item_fk` FOREIGN KEY (`checklist_item_id`)
        REFERENCES `checklist_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Versements reçus, en francs CFA. Le solde est calculé, jamais stocké.
CREATE TABLE IF NOT EXISTS `dossier_payments` (
    `id`          CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `dossier_id`  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `amount`      INT UNSIGNED NOT NULL,
    `paid_on`     DATE NOT NULL,
    `label`       VARCHAR(120) NOT NULL DEFAULT '',
    `recorded_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `dossier_payments_dossier` (`dossier_id`, `paid_on`),
    CONSTRAINT `dossier_payments_dossier_fk` FOREIGN KEY (`dossier_id`)
        REFERENCES `dossiers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `dossier_payments_recorded_by_fk` FOREIGN KEY (`recorded_by`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages échangés entre le client et l'équipe, un fil par dossier.
-- `author` : qui écrit ; `admin_id` : quel membre de l'équipe (son nom est
-- montré au client). Horodatés au millième de seconde : deux messages de la
-- même seconde gardent leur ordre. Supprimés avec leur dossier.
CREATE TABLE IF NOT EXISTS `dossier_messages` (
    `id`         CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `dossier_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `author`     ENUM('client', 'team') NOT NULL,
    `admin_id`   CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
    `body`       TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    KEY `dossier_messages_dossier` (`dossier_id`, `created_at`),
    CONSTRAINT `dossier_messages_dossier_fk` FOREIGN KEY (`dossier_id`)
        REFERENCES `dossiers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `dossier_messages_admin_fk` FOREIGN KEY (`admin_id`)
        REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Version de la base : une ligne par migration passée (database/migrations/).
-- Ouvrir cette table dans phpMyAdmin dit où en est une base, et donc quelles
-- migrations lui restent à importer. Une installation neuve part de ce
-- fichier, qui contient déjà toutes les migrations : elles y sont inscrites
-- d'office ci-dessous.
CREATE TABLE IF NOT EXISTS `schema_migrations` (
    `version`    VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- À compléter à chaque migration ajoutée (voir database/migrations/README.md).
INSERT IGNORE INTO `schema_migrations` (`version`) VALUES
('000_initial');

# VISILION CORPORATE

Site de VISILION CORPORATE, cabinet d'assistanat visa basé à Abidjan :
site vitrine, panel d'administration du contenu et espace client de suivi
des dossiers.

| Partie | Adresse | Rôle |
|---|---|---|
| Site vitrine | `/` | Page unique pré-rendue en HTML statique, indexable sans JavaScript |
| Panel d'administration | `/admin` | Contenu du site, photos, demandes de contact, dossiers clients, statistiques |
| Espace client | `/espace-client` | Suivi du dossier, dépôt des pièces, paiements, messagerie (accès sur invitation) |
| API | `/api` | PHP, réponses JSON |

## Technologies

- **Front** : React 19, Vite, Tailwind CSS 4, pré-rendu par `vite-react-ssg`.
  Le panel et l'espace client sont chargés à part, seulement sur leurs adresses.
- **API** : PHP 8.2 natif, structuré en MVC, **sans Composer ni framework**
  (choix du client). MySQL ou MariaDB.
- **Hébergement visé** : mutualisé cPanel, sans Node en production. Le front
  est donc livré compilé, et l'API tourne derrière Apache.

## Organisation

```
api/                    API PHP
  public/               Seul dossier exposé au web (index.php, .htaccess)
  app/Core/             Socle : routeur, requête, réponse, modèle, validateur…
  app/Controllers/      Contrôleurs (Admin/, Client/, puis routes publiques)
  app/Models/           Une classe par table
  app/Middleware/       Authentification, CSRF, CORS, limitation de débit
  app/Content/          Contenu du site : schéma, validation, publication
  app/Dossiers/         Espace client : étapes, documents, notifications
  routes/api.php        Toutes les routes
  database/             schema.sql, seed.sql, migrations/, guide d'exploitation
  bin/                  Outils en ligne de commande (comptes administrateurs)
  storage/              Journaux, cache, documents des clients (hors web)
frontend/               Application React
  src/components/       Sections du site, mise en page, briques d'interface
  src/content/          Contenu par défaut (baseline.json) et son chargement
  src/admin/            Panel d'administration
  src/client/           Espace client
  src/dossiers/         Code commun au panel et à l'espace client
  src/lib/              Utilitaires (appels à l'API, formats, mesure d'audience)
```

## Installation locale

Prérequis : Node 22, PHP 8.2 avec `pdo_mysql`, MySQL ou MariaDB.

```bash
# 1. Base de données
mysql -u root -e "CREATE DATABASE visilion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root visilion < api/database/schema.sql
mysql -u root visilion < api/database/seed.sql

# 2. API
cp api/.env.example api/.env        # puis renseigner la base et JWT_SECRET
php api/bin/create-admin.php        # crée un compte du panel
php -S 127.0.0.1:8000 -t api/public

# 3. Front (dans un autre terminal)
cd frontend
npm ci
VITE_API_PROXY=http://127.0.0.1:8000 npm run dev   # http://localhost:5173
```

Sans `api/.env`, l'API ne démarre pas. En local, `MAIL_TRANSPORT=log` écrit
les emails dans `api/storage/logs/` au lieu de les envoyer.

## Commandes du front

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript puis génération statique dans `dist/` |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm run content:pull` | Recopie le contenu publié dans `baseline.json`, avant un build |

## Mise en ligne

Le déploiement se fait par dépôt des fichiers (FTP ou gestionnaire de
fichiers de cPanel) :

- `frontend/dist/` va dans `public_html/` ;
- `api/public/` doit répondre à `/api` sur le même domaine, le reste de
  `api/` restant hors de la racine web.

La procédure complète est dans
[`api/database/README.md`](api/database/README.md) : création de la base,
`.env` de production, comptes administrateurs, droits d'écriture,
statistiques et espace client. Les évolutions de la base après la mise en
ligne suivent [`api/database/migrations/README.md`](api/database/migrations/README.md).

Chaque envoi sur `main` publie aussi un aperçu du site vitrine sur GitHub
Pages (`.github/workflows/pages.yml`). Cet aperçu est statique : l'API n'y
tourne pas, donc le formulaire de contact, le panel et l'espace client n'y
fonctionnent pas.

## Sécurité

- Sessions du panel et de l'espace client en cookies `HttpOnly`, jamais
  accessibles au JavaScript.
- Toute écriture sur `/api/admin/*` et `/api/client/*` exige l'en-tête
  `X-Requested-With` (protection CSRF).
- Documents des clients rangés hors de la racine web, sous un nom aléatoire,
  servis uniquement à leur propriétaire et à l'équipe.
- Identifiants en UUID v4 : ils ne révèlent ni le nombre de lignes ni leur
  ordre.
- Ne sont jamais versionnés : `api/.env`, les documents des clients, les
  images envoyées depuis le panel, les journaux.

# Panel d'administration : installation et exploitation

Le panel (`/admin`) modifie le contenu du site sans recompilation : les textes,
prestations, témoignages, coordonnées et photos sont en base, et le site les
charge à chaque visite (`GET /api/content`).

## 1. Base de données

Dans cPanel, créer une base MySQL et un utilisateur qui a tous les droits
dessus (« Bases de données MySQL »), puis dans phpMyAdmin, sur cette base :

1. Importer `schema.sql` (les tables) ;
2. Importer `seed.sql` (le contenu actuel du site).

`seed.sql` utilise `INSERT IGNORE` : le réimporter ne remplace jamais une
section déjà modifiée dans le panel.

Ces deux imports ne servent qu'à l'installation. Ensuite, la structure de la
base n'évolue plus que par les scripts de `migrations/`, qui ont leur propre
mode d'emploi (`migrations/README.md`).

Renseigner ensuite `api/.env` (modèle : `api/.env.example`) :

- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` ;
- `JWT_SECRET` : **obligatoire**, sinon la connexion au panel échoue. Le
  générer avec `php -r "echo bin2hex(random_bytes(32));"`.
- `APP_ENV=production` et **`APP_DEBUG=false`** : le modèle est réglé pour le
  poste de développement, où les erreurs détaillées s'affichent. Laissé à
  `true` en ligne, l'API montrerait le détail de ses erreurs aux visiteurs.
- `APP_URL` : l'adresse du site (lien des emails de demande de contact).

## 2. Fichiers sur le serveur

- `frontend/dist/` (après `npm run build`) va dans `public_html/`.
- Le contenu de `api/public/` doit répondre à l'adresse `/api` du même
  domaine ; le reste de `api/` (code, `.env`, journaux) reste hors de la
  racine web. Le panel ne fonctionne que si le site et l'API partagent le
  domaine : son cookie de session n'est jamais envoyé ailleurs.
- `api/public/uploads/` reçoit les photos envoyées depuis le panel : PHP
  doit pouvoir y écrire (dossier en 755). Son `.htaccess` y interdit
  l'exécution de tout script ; ne pas le supprimer.
- `api/storage/` doit aussi être accessible en écriture (journaux, cache du
  contenu, limitation des tentatives de connexion).

## 3. Comptes administrateurs

Le panel ne crée pas de compte : c'est volontaire, une session volée ne peut
pas s'ouvrir un accès durable.

**Avec un terminal** (en local avec XAMPP, ou sur l'hébergement s'il en
propose un), depuis le dossier `api/` :

```bash
php bin/create-admin.php
```

Le script demande l'email, le nom affiché et le mot de passe (aucune règle de
longueur, à la demande du client ; seul un mot de passe vide est refusé).
Avec l'email d'un compte existant, il remplace son mot de passe :
c'est la procédure en cas d'oubli. Les sessions ouvertes avec l'ancien mot de
passe sont fermées.

**Sans terminal**, par phpMyAdmin :

1. Sur un poste qui a PHP (XAMPP), depuis le dossier `api/` :
   `php bin/admin-sql.php`. Le script demande l'email, le nom et le mot de
   passe, et affiche la requête `INSERT INTO admins …` toute prête : elle
   contient l'identifiant (un UUID v4) et l'empreinte du mot de passe. Il ne
   touche à aucune base.
2. Coller cette requête dans l'onglet SQL de la base, dans phpMyAdmin.

   Ne pas écrire l'`INSERT` à la main avec `UUID()` : MariaDB produit des
   UUID version 1, que l'API refuse ; le compte ne pourrait pas se connecter.

   Pour un oubli : générer une empreinte avec
   `php -r "echo password_hash('le-mot-de-passe', PASSWORD_DEFAULT);"`, puis
   `UPDATE admins SET password_hash = '…', token_version = token_version + 1 WHERE email = '…';`

L'email s'écrit en minuscules : c'est sous cette forme que la connexion le
cherche.

## 4. Après la mise en ligne

- Vérifier `https://visilioncorporate.com/api/health` : `database` doit valoir
  « connectée ».
- Se connecter sur `https://visilioncorporate.com/admin`.
- 5 tentatives de connexion par adresse IP toutes les 10 minutes, au-delà,
  attendre.

## 5. Statistiques du tableau de bord

Le site mesure lui-même sa fréquentation (table `analytics_events`), sans
cookie ni service tiers :

- **ce qui est compté** : les pages vues, chaque section atteinte en faisant
  défiler la page, les prises de contact (clic sur le téléphone, WhatsApp,
  l'email, formulaire envoyé), la provenance (domaine seul) et le type
  d'appareil ;
- **ce qui ne l'est pas** : les robots, les navigateurs réglés sur « ne pas
  me suivre », et les visites d'un administrateur connecté au panel ;
- **données personnelles** : aucune. L'adresse IP n'est jamais enregistrée ;
  le visiteur est une empreinte calculée avec une clé qui change chaque jour
  et n'est pas conservée. Un même visiteur revenu un autre jour compte donc
  deux fois. Les mesures de plus de 13 mois sont effacées.

La politique de confidentialité, à rédiger, devra mentionner cette mesure
d'audience.

## 6. Demandes de contact

Chaque message du formulaire du site est enregistré dans `contact_requests`
et signalé par email à `MAIL_ADMIN_ADDRESS`, avec un lien vers la demande
dans le panel (adresse construite à partir de `APP_URL` : à régler sur
l'adresse du site en production). Si l'email ne part pas, la demande reste
consultable dans le panel ; la fiche le signale.

Ce sont des données personnelles : supprimer depuis le panel les demandes
traitées dont on n'a plus besoin, selon la durée fixée dans la politique de
confidentialité.

## 7. Espace client

Les clients n'ont un compte que sur invitation. Dans le panel, **Dossiers
clients > Ouvrir un dossier** (ou le bouton « Ouvrir un dossier » d'une demande
de contact) crée en une fois :

- le compte du client (son email est son identifiant) ;
- son dossier, à l'étape 1, avec la liste de pièces par défaut ;
- un lien d'invitation valable 7 jours, envoyé par email et affiché dans le
  panel, à copier ou à envoyer par WhatsApp si l'email n'arrive pas. Le lien
  n'est montré qu'une fois ; « Renvoyer l'invitation » en crée un nouveau et
  annule l'ancien.

Le client choisit son mot de passe (8 caractères au moins), répond aux
questions d'ouverture, et le dossier passe de lui-même à l'étape « Documents à
fournir ». Ensuite, tout se fait dans la fiche du dossier : faire avancer les
étapes, valider ou refuser les pièces (un refus demande un motif, que le
client lit), ajuster la liste, enregistrer les versements.

À l'installation :

- `api/storage/` doit être accessible en écriture : les documents sont rangés
  dans `api/storage/documents/`, **hors de la racine web**. Ne jamais déplacer
  ce dossier sous `public_html` : ce sont des passeports et des relevés
  bancaires.
- Les documents peuvent peser 10 Mo. `api/public/.user.ini` relève les limites
  de PHP à 12 Mo ; si l'hébergeur l'ignore, régler `upload_max_filesize` (12M)
  et `post_max_size` (13M) dans « Sélecteur de version PHP > Options » de
  cPanel.
- `MAIL_DOSSIERS_ADDRESS` : adresse à laquelle les clients répondent aux emails
  de l'espace. **Fictive pour l'instant**, à remplacer par celle du client.
- Le site tient sur le même domaine que l'API : le cookie de session du client
  n'est jamais envoyé ailleurs.

**Emails automatiques** (envoyés selon `MAIL_TRANSPORT` : en local, écrits dans `storage/logs`) :

- au client : documents bien reçus, étape franchie (jamais pour un retour en
  arrière), pièce à refaire (avec le motif), nouveau message de l'équipe ;
- à l'équipe (`MAIL_DOSSIERS_ADDRESS`) : documents déposés, nouveau message
  d'un client.

Un client qui dépose plusieurs fichiers d'affilée ne déclenche qu'un email de
chaque sorte par quart d'heure. Un client qui n'a pas encore activé son espace
ne reçoit rien. Les emails ne contiennent ni les messages ni les documents :
ils mènent à l'espace, où il faut se connecter.

**Messagerie** : un fil par dossier, dans l'onglet « Messages » de l'espace
client et dans la fiche du dossier du panel. Ce qu'un administrateur lit est
lu pour toute l'équipe. Le menu du panel compte les dossiers qui attendent
quelque chose (pièce à vérifier ou message non lu).

Données personnelles : identité, pièces d'identité, situation familiale. Les
documents sont conservés tant que le dossier existe (choix du client) ;
supprimer un dossier supprime le compte du client et tous ses fichiers. La
politique de confidentialité devra le mentionner.

Les éléments encore provisoires (étapes, pièces par défaut, questions
d'ouverture) se changent chacun en un seul endroit : `app/Dossiers/Process.php`
et `app/Dossiers/Onboarding.php`. L'espace client et le panel les lisent par
l'API.

## 8. Recompiler le site

Une modification du panel est en ligne dès son enregistrement, sans
recompilation. Le HTML pré-rendu garde toutefois le contenu de la dernière
compilation : c'est lui que voient les moteurs qui n'exécutent pas
JavaScript, avant que la page ne charge le contenu à jour.

Avant chaque nouvelle compilation, reprendre donc le contenu en ligne :

```bash
cd frontend
npm run content:pull   # met à jour src/content/baseline.json
npm run build
```

## 9. Ajouter un champ ou une section

1. Le décrire dans `api/app/Content/ContentSchema.php` : le panel affiche
   aussitôt le champ (formulaire généré à partir du schéma), et l'API le
   valide.
2. L'ajouter au type correspondant dans `frontend/src/content/types.ts` et à
   `frontend/src/content/baseline.json`, puis l'afficher dans le composant de
   la section.

Pour proposer une nouvelle icône, l'ajouter à trois listes : `ICONS` dans
`ContentSchema.php`, `icon_names=` dans `frontend/index.html` (police du
site) et `ADMIN_ICONS` dans `frontend/src/admin/AdminEntry.tsx` (police du
panel).

# VISILION CORPORATE — site vitrine & espace client

Site de **VISILION CORPORATE** (Abidjan, Côte d'Ivoire) : assistanat visa, courtage
en affaires, import-export et billetterie. Slogan : « Notre vision, votre satisfaction ».

Fondateurs : Marc-Peniel & Marie-Paule, un couple — c'est un axe de communication
explicitement demandé par le client (« une DA qui parle du couple qui fait voyager »).

## Documents de référence

| Fichier | Contenu |
|---|---|
| `docs/CREATION DE SITE .pdf` | Cahier des charges : pages voulues, texte « À propos », couleurs, contact |
| `docs/Services_Assistanat_Visa.pdf` | Les 5 prestations rédigées par le client |
| `docs/Espace_Client_Cahier_des_Charges.pdf` | Périmètre de l'espace client (priorité 1 livrée, priorité 2 et V2 à venir) |
| `docs/Contrat_Referent_CU.pdf` | Contrat de référent avec le Collège Universel (Gatineau, QC) : source de la section `#college-universel` |
| `docs/logo.jpeg` | Logo officiel — source des couleurs de marque |
| `template/code.html` + `screen.png` | Maquette HTML validée visuellement par le client |
| `template/DESIGN.md` | Jetons de design proposés (Noto Serif + Plus Jakarta Sans) |

**Le PDF fait foi sur les couleurs** : « L'ENTREPRISE A 04 COULEURS (COULEURS
CHROMATIQUES : JAUNE BLEU ROUGE VERT) FAIS MOI DES PROPOSITIONS JE SUIS OUVERT ».

## Architecture

Décisions prises avec le client, à ne pas remettre en cause sans le consulter :

- **Hébergement : mutualisé cPanel.** Pas de Node en production — d'où le pré-rendu
  statique côté front, et pas de framework lourd côté API.
- **Front : React + Vite + pré-rendu** (`vite-react-ssg`). Le site est généré en HTML
  statique au build : indexable sans JavaScript.
- **API : PHP natif structuré en MVC**, sans Composer ni framework (choix explicite du
  client). Autoloader PSR-4 maison dans `api/app/Core/Autoloader.php`.
- **Site en page unique** pour l'instant, navigation par ancres. Le client se réserve
  de repasser à des pages distinctes ; les sections sont donc restées des composants
  autonomes dans `frontend/src/components/home/`, prêts à être réassemblés.
- **Contenu modifiable sans recompilation** (panel `/admin`, 02/10/2026). Le client
  déploie lui-même par FTP, sans GitHub : une modification ne peut donc pas passer
  par un nouveau build. Le contenu est en base (MySQL, une ligne JSON par section),
  servi par `GET /api/content` (cache disque), et appliqué par le site au
  chargement. Le HTML pré-rendu garde le contenu compilé
  (`frontend/src/content/baseline.json`) : il fait foi sans JavaScript, sans API
  (aperçu GitHub Pages) et pour le premier rendu (hydratation). Détails et
  exploitation : `api/database/README.md`.
- **Espace client sur invitation** (`/espace-client`, priorité 1 livrée le
  03/10/2026) : l'équipe ouvre le dossier dans le panel, ce qui crée le compte du
  client et lui envoie un lien (7 jours) pour choisir son mot de passe. Session
  par cookie HttpOnly `vlc_client` (14 jours), sur le modèle du panel — choix
  retenu plutôt qu'un jeton Bearer, pour la même raison (XSS). Documents rangés
  dans `api/storage/documents/`, hors racine web, sous un nom aléatoire, servis
  uniquement à leur propriétaire et aux administrateurs.

```
api/         API PHP (MVC natif, sans dépendances)
  app/Content/   Schéma du contenu, validation, assemblage public
  app/Dossiers/  Espace client : étapes, questions d'ouverture, stockage des documents
  database/      schema.sql, seed.sql, migrations/, README d'exploitation du panel
  bin/           create-admin.php (comptes du panel), admin-sql.php (requête pour phpMyAdmin)
frontend/    Application React (Vite + Tailwind 4)
  src/content/   Contenu du site : types, baseline.json, ContentProvider
  src/admin/     Panel d'administration (chargé à part, sur /admin seulement)
  src/client/    Espace client (chargé à part, sur /espace-client seulement)
  src/dossiers/  Commun au panel et à l'espace client : types du dossier, état des pièces, messagerie
docs/        Cahiers des charges et logo
template/    Maquette HTML d'origine et sa capture
```

## Commandes

```bash
cd frontend
npm run dev        # serveur de développement, port 5173
npm run build      # tsc --noEmit puis génération statique dans dist/
npm run typecheck  # vérification TypeScript seule
npm run content:pull [-- URL]  # recopie le contenu publié dans baseline.json (avant un build)
```

PHP et MySQL ne sont **pas dans le PATH**. Ils viennent de XAMPP :
`C:\xampp\php\php.exe` (PHP 8.2.12) et `C:\xampp\mysql\bin\` (MariaDB 10.4.32).
Aucun alias Apache `vlc-api` n'existe sur le poste : en local, l'API tourne avec le
serveur intégré de PHP, et Vite y relaie `/api` via `VITE_API_PROXY` :

```bash
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone
C:\xampp\php\php.exe -S 127.0.0.1:8000 -t api/public
VITE_API_PROXY=http://127.0.0.1:8000 npm run dev   # dans frontend/
```

Base locale : `visilion` (root sans mot de passe), compte du panel
`admin@visilion.test`. GD n'est pas activé dans le PHP de XAMPP, et rien n'en dépend.

## Conventions

- **Tailwind 4 se configure en CSS**, pas en JavaScript. Les jetons vivent dans
  `frontend/src/styles/index.css` sous `@theme`. Il n'y a pas de `tailwind.config.js`,
  et il ne faut pas en créer.
- **Couleurs de texte (audit du 03/10/2026)** : jamais de texte lisible pâli
  par opacité sous 85 % (`text-on-surface-variant/50` donnait 2,3 de contraste) ;
  marquer la hiérarchie par la graisse. Sur fond marine, les gris passent par
  `on-primary-soft` / `-variant` / `-muted`, jamais par `slate-*`. Petit texte
  ocre sur fond bleuté : `secondary-ink` (`secondary` y tombe à 4,32). Erreurs :
  `brand-red-ink` / `brand-red-soft`, pas les rouges par défaut de Tailwind.
- **Cibles tactiles du panel** : 44 px au doigt, 40 px à la souris
  (`min-h-11 pointer-fine:min-h-10`). Le tiroir mobile rend `<main>` inerte
  (`inert`) tant qu'il est ouvert ; il se ferme de lui-même au passage en grand
  écran, sans quoi la page resterait inutilisable.
- **Tailwind ignore silencieusement une classe inconnue.** Après tout renommage de
  jeton, vérifier que les utilitaires attendus sont bien émis dans `dist/assets/*.css` —
  la compilation ne signalera rien.
- **Le HTML de `index.html` ne porte ni `<title>` ni `<meta name="description">** :
  chaque page les fournit via `src/components/ui/Seo.tsx`. En coder un en dur produit
  une balise en double dans le HTML pré-rendu.
- **La police d'icônes est réduite aux icônes utilisées** (`icon_names=` dans
  `index.html`, par ordre alphabétique) : 9 Ko au lieu de 4 Mo. **Toute nouvelle
  icône Material Symbols doit y être ajoutée**, sinon elle s'affiche comme un mot
  (« arrow_forward »). La compilation ne signale rien. Le panel et l'espace
  client chargent chacun leur police (`ADMIN_ICONS` dans
  `src/admin/AdminEntry.tsx`, `CLIENT_ICONS` dans `src/client/ClientEntry.tsx`),
  ajoutée en fin de `<head>` au montage pour l'emporter sur celle du site. Une
  icône proposée dans les formulaires de contenu doit figurer dans **trois**
  listes : `ICONS` de `ContentSchema.php`, `index.html` et `ADMIN_ICONS`. Les
  icônes d'état des pièces (`src/dossiers/status.ts`) servent aux deux espaces :
  elles sont dans `ADMIN_ICONS` et `CLIENT_ICONS`.
- **Briques partagées panel / espace client** : boutons, champs, messages dans
  `src/components/ui/controls.tsx` (le panel les ré-exporte depuis
  `src/admin/ui.tsx`) ; dates, nombres, montants dans `src/lib/format.ts`.
  Ce qui touche au dossier et sert aux deux espaces (types, état des pièces,
  fil de messages) vit dans `src/dossiers/` : le panel n'importe jamais
  depuis `src/client/`, ni l'inverse.
  Pour un bouton plus grand, `bigButton` (`src/client/ui.tsx`) dérive la
  classe au lieu d'empiler `min-h-11` et `min-h-12` sur le même élément.
- **Aucun texte du site en dur dans les sections** : tout ce que le panel modifie
  vient de `useContent()` (`src/content/ContentProvider.tsx`). Un champ ajouté se
  déclare dans `api/app/Content/ContentSchema.php` (le formulaire du panel en
  découle), puis dans `src/content/types.ts` et `baseline.json`. Le premier rendu
  utilise toujours `baseline.json` : ne jamais lire le contenu de l'API pendant le
  rendu initial, l'hydratation échouerait.
- **Ne jamais imbriquer de `<form>` dans le panel** : le choix d'image s'ouvre à
  l'intérieur du formulaire de section. `MediaUploader` est donc un simple bloc.
- **Ne jamais poser `hidden`, `block`, `sm:block`… sur `<Icon>`** : la feuille de
  Google Fonts déclare `display: inline-block` hors des couches de Tailwind, ce qui
  l'emporte sur ces utilitaires. Envelopper l'icône dans un `<span>` qui les porte.
- **Écrans peu hauts** : le variant `short:` (moins de 500 px de haut, téléphone à
  l'horizontale) est défini par `@custom-variant` dans `index.css`. L'en-tête s'y
  resserre et la barre d'action du bas y cède son bouton à l'en-tête. Sous `lg`,
  le bouton « Démarrer ma procédure » vit dans la barre du bas, pas dans l'en-tête.
- **Champs de formulaire en 16 px sur écran tactile** (`pointer-fine:text-sm`
  seulement à la souris) : en deçà, iOS agrandit la page au premier appui.
- **Apparitions au défilement** : ajouter la classe `reveal` à un élément suffit
  (et `style={{ '--i': n }}` pour une cascade dans une liste). La classe
  `is-visible` est posée par `src/lib/useScrollReveal.ts`. L'état caché n'existe
  que sous `html.js`, posé par un script d'`index.html` avec un filet de sécurité
  de 4 s : sans JavaScript, tout reste visible. Ne pas mettre `reveal` sur un
  élément qui a déjà ses propres `transition-*` : l'envelopper plutôt.
- **Barre d'action mobile** (`src/components/layout/MobileActionBar.tsx`) : elle
  s'efface sur les sections d'identifiant `accueil`, `services`, `contact` et
  `pied-de-page`. Ne pas renommer ces identifiants sans mettre à jour la liste
  `HIDE_ON`.
- **Rien de `fixed` à l'intérieur de `<header>`** : son flou (`backdrop-filter`) en
  fait le bloc de référence des descendants `fixed`. Le menu mobile est donc rendu
  à côté de l'en-tête ; placé dedans, il était réduit à 49 px et invisible.
- **Galerie des prestations** (`lib/useHorizontalPin.ts`) : épinglée aussi sur
  mobile et tablette (mode `narrow`, une fiche pleine largeur par cran de
  défilement, aimantée par des repères `scroll-snap`) dès que l'écran fait 640 px
  de haut et que la fiche y tient réellement (mesuré au montage ; sinon, retour à
  la galerie au doigt, comme sur 320 × 640). Sur mobile, le bloc collant se cale
  sous l'en-tête (`top-[72px]`, `sm:top-20`) : si la hauteur de l'en-tête change,
  changer aussi ces valeurs. Il porte le titre de la section, le compteur et la
  fiche à sa hauteur naturelle (ne pas l'étirer : elle se remplit de blanc) ; sous
  800 px de haut (variant `tall:`), le titre passe avant la partie épinglée.
  Sous `sm`, le bloc collant n'a que la hauteur de son contenu (plafonnée à
  l'écran par `max-h`) : centré dans tout l'écran, il laissait un grand blanc
  au-dessus du titre et après la fiche. À partir de `sm`, il reste plein écran.
  L'accroche et le bouton concluent la section après la dernière fiche. Les repères sont décalés de 8rem, le `scroll-padding-top` de
  la page : changer l'un impose de changer l'autre.
- **`react-router-dom` est figé en 6.x** : `vite-react-ssg` déclare `^6.14.1` en peer.
  Ne pas monter en v7 sans vérifier que l'outil le supporte.
- **Validateur PHP** (`App\Core\Validator`) : `min`/`max` comparent la valeur
  seulement avec la règle `numeric` ou `integer`, la longueur sinon. Avant le
  03/10/2026, un téléphone saisi sans espaces était comparé comme un nombre et
  refusé.
- **Identifiants en UUID v4** (03/10/2026, demande de l'utilisateur) : `CHAR(36)`
  ASCII, tirés par `App\Core\Uuid::v4()` dans `Model::create()`, jamais par la
  base (`UUID()` de MariaDB donne des v1, que l'API refuse). Exceptions :
  `analytics_events` (entier, journal interne) et `content_sections` (clé
  textuelle). Conséquences à garder en tête :
  - trier par `created_at` (puis `id` pour départager), jamais par `id` seul ;
  - lire un `{id}` d'adresse avec `$this->routeId($request)` (contrôleur de
    base), valider un identifiant reçu avec la règle `uuid` du validateur ;
  - les images du contenu sont des UUID dans le JSON des sections : c'est à
    leur forme d'UUID que `SectionController` et `ContentPublisher` les
    reconnaissent ;
  - la référence lisible d'un dossier (`VLC-2026-0042`) vient de sa colonne
    `number`, pas de l'identifiant ;
  - côté front, tous les `id` sont des `string`.
- **Évolution de la base** : `schema.sql` décrit toujours la structure
  complète (installation neuve). Une fois le site en ligne, tout changement
  de structure s'accompagne d'un script numéroté dans
  `api/database/migrations/` qui s'inscrit dans la table
  `schema_migrations` ; sa version s'ajoute aussi à l'`INSERT IGNORE` final
  de `schema.sql`. Règles complètes : `migrations/README.md`.
- Côté PHP, les colonnes modifiables passent obligatoirement par `$fillable`
  (`api/app/Core/Model.php`) : une charge JSON ne doit jamais pouvoir écrire une
  colonne non prévue. Même principe pour le contenu : `ContentValidator` ne garde
  que les champs du schéma.
- Réponses de l'API toujours en JSON, via `App\Core\Response`. **Seule
  exception** : les documents de l'espace client (`Response::file()`), affichés
  dans le navigateur s'ils sont PDF/JPEG/PNG/WebP, téléchargés sous un type
  neutre sinon (`nosniff`). Pas de CSP `sandbox` sur ces réponses : Chrome
  refuse alors d'afficher les PDF.
- **Erreurs d'appel dans le panel et l'espace client** : la session expirée
  (401) est traitée une seule fois, dans `src/admin/api.ts` et
  `src/client/api.ts` (`setUnauthorizedHandler`, enregistré par `AdminApp` /
  `ClientApp`). Une page ne teste jamais elle-même le 401 : elle affiche
  `errorMessage(caught, repli)`. Dates, nombres et poids se mettent en forme dans
  `src/lib/format.ts`, jamais dans un composant.
- **Espace client : tout part du client connecté.** `AuthMiddleware` (conservé
  pour ce chantier, désormais par cookie) pose `$request->attribute('client')` ;
  les contrôleurs `Controllers/Client/*` ne cherchent un dossier, une pièce ou un
  document qu'à partir de lui. Un identifiant d'un autre client répond 404,
  comme un identifiant inexistant. `Request::bearerToken()` reste en place, sans
  usage.
- **Éléments provisoires de l'espace client, chacun en un seul endroit** (à
  remplacer par ceux du client, sans toucher au front) : étapes et pièces par
  défaut dans `api/app/Dossiers/Process.php`, questions d'ouverture dans
  `api/app/Dossiers/Onboarding.php` (réponses en JSON dans `clients.profile` :
  aucune migration), adresse de l'équipe `MAIL_DOSSIERS_ADDRESS` (`.env`).
  Retirer une étape impose de renuméroter les dossiers qui s'y trouvent.
- **Messages et lectures** : horodatés au millième (`DATETIME(3)`), comme
  `dossiers.client_read_at` / `team_read_at` ; un message est « non lu » s'il
  vient de l'autre partie et qu'il est plus récent que la dernière lecture.
  Ouvrir le fil (`GET …/messages`) le marque comme lu ; ces mises à jour
  laissent `updated_at` intact, pour ne pas réordonner la liste des dossiers.
  Le fil se rafraîchit toutes les 30 s quand la page est visible
  (`useMessages`, `src/dossiers/MessageThread.tsx`, partagé avec le panel).
- **Envoi de documents** : 10 Mo par fichier (`DocumentStore::MAX_BYTES`),
  formats libres sauf programmes et pages web. PHP doit accepter un peu plus :
  `api/public/.user.ini` (PHP-FPM) et le bloc `mod_php` du `.htaccess` fixent
  12 Mo. Côté front, l'envoi passe par `XMLHttpRequest` pour afficher sa
  progression (`uploadDocument`, `src/client/api.ts`). Au plus 10 fichiers
  par pièce (`DocumentStore::MAX_FILES_PER_ITEM`) : c'est ce qui borne
  l'espace disque occupé par un compte.
- **Limites de débit** : `RateLimitMiddleware` (5 écritures / 10 min / IP, contact
  et connexion) ; une route aux besoins différents passe par une sous-classe qui
  redéfinit `MAX_ATTEMPTS` (`TrackRateLimitMiddleware` : 120 pour la mesure
  d'audience, `MessageRateLimitMiddleware` : 20, `UploadRateLimitMiddleware` :
  30 envois par pièce). Le compteur suit l'IP **et** l'adresse de la route.
  En plus, `App\Auth\LoginThrottle` bloque un compte 15 min après 10 échecs
  de connexion, quelle que soit l'IP, compté sur l'email saisi (qu'un compte
  existe ou non) ; pendant le blocage, même le bon mot de passe est refusé.
- **Déconnexion = toutes les sessions du compte** : elle incrémente
  `token_version` (`revokeSessions()`), seul moyen d'invalider un JWT avant
  son expiration. Un cookie volé ne survit donc pas à la déconnexion, mais
  se déconnecter sur le téléphone déconnecte aussi l'ordinateur.
- **Liens d'accès de l'espace client** : l'équipe qui renvoie une invitation
  annule les précédentes ; « mot de passe oublié » sur un compte pas encore
  activé en ajoute une sans annuler celle de l'équipe. Choisir son mot de
  passe annule tous les liens encore valables (`ClientToken::revokeAll`).
- **Politique de contenu (CSP) et HSTS** dans `frontend/public/.htaccess`,
  sur les pages `.html` seulement (pas sur l'API : les PDF ne s'afficheraient
  plus). Les scripts intégrés aux pages sont admis par empreinte SHA-256,
  calculée après chaque compilation par `scripts/csp.mjs` (appelé par
  `npm run build`) à la place des marqueurs `__CSP_…__` : ne jamais les
  retirer, la compilation échouerait. Toute nouvelle origine externe
  (police, image, script, API) doit être ajoutée à la CSP, sinon le
  navigateur la bloque sans erreur de compilation. HSTS va de pair avec la
  redirection HTTPS : à commenter avec elle tant que le SSL n'est pas actif.
  Vérifié le 06/10/2026 dans Chrome derrière Apache (XAMPP, port à part) :
  aucune violation sur le site, le panel et l'espace client, connectés ou non.
- **Routes du panel et de l'espace client** (`/admin/*`, `/client/*` de l'API) : `CsrfMiddleware` exige l'en-tête
  `X-Requested-With` sur toute écriture (posé par `src/lib/api.ts`), et
  `AdminAuthMiddleware` relit le compte à chaque requête (session en cookie
  HttpOnly `vlc_admin`, JWT invalidé par `admins.token_version`). Un middleware
  transmet des données par `$request->setAttribute()`, jamais par
  `setRouteParams()`, qui écraserait les `{id}` de l'URL.
- **Mesure d'audience maison** (`src/lib/analytics.ts` → `POST /api/track` →
  table `analytics_events`) : sans cookie, IP jamais stockée (empreinte à clé
  quotidienne, `app/Analytics/VisitorId.php`). Les sections suivies et les actions
  sont listées deux fois, dans `analytics.ts` et `TrackController.php` (le serveur
  ignore le reste) : un identifiant de section renommé doit l'être dans les deux,
  ainsi que dans `PAGE_SECTION_LABELS` (`src/admin/sections.ts`). Les visites d'un
  administrateur connecté ne sont pas comptées : pour tester le traceur, se
  déconnecter du panel.
- **Images** : redimensionnées dans le navigateur (`src/admin/lib/resizeImage.ts`,
  WebP en 480/960/1600/2400 px) ; le serveur vérifie sans rien recalculer, car GD
  n'est pas garanti sur le mutualisé.

## État d'avancement

**Fait**

- Site vitrine en page unique, pré-rendu, déployable tel quel : bannière, à propos
  (fondateurs), les 6 prestations, partenariat Collège Universel, témoignages, annonce espace client, contact.
- Fichiers de déploiement : `.htaccess` (URL propres, HTTPS, cache, en-têtes de
  sécurité), `robots.txt`, `sitemap.xml`.
- Socle de l'API PHP : routeur avec middlewares, validateur, PDO, journalisation,
  mailer, JWT, CORS, limitation de débit sur fichier.
- **Formulaire de contact** (03/10/2026) : `POST /api/contact` enregistre la
  demande dans `contact_requests`, puis l'envoie par email avec un lien vers le
  panel ; l'un des deux suffit pour répondre « envoyé » au visiteur. Champ piège
  `website` contre les robots (classés « indésirable », sans email). Dans le
  panel, rubrique « Demandes » (`/admin/demandes`) : badge des nouvelles, filtres,
  recherche, appel / WhatsApp / email en un clic, état, note interne,
  suppression. Ouvrir une demande « nouvelle » la passe « en cours ». Reste à
  essayer l'email en production avec `MAIL_TRANSPORT=mail`.
- **Panel d'administration du contenu** (02/10/2026) : connexion, tableau de bord,
  toutes les sections de la page (textes, prestations, témoignages, étapes du
  Collège Universel, destinations, coordonnées), médiathèque avec envoi de photos,
  changement de mot de passe. Tables `admins`, `media`, `content_sections`,
  `analytics_events`, `contact_requests`. Le tableau de bord (03/10/2026) affiche la fréquentation
  (visiteurs, pages vues, prises de contact, sections atteintes, provenance,
  appareils) et l'état technique. Aucune règle sur le mot de passe des
  administrateurs (demande du 02/10/2026), hormis non vide.
  Testé de bout en bout dans Chrome (bureau et mobile) : connexion, envoi d'image,
  modification visible sur le site, erreurs de validation, conflit de version.
- **Espace client, priorité 1 du cahier des charges** (03/10/2026), d'après les
  réponses **provisoires** de l'utilisateur : compte sur invitation ; étapes et
  questions d'ouverture fictives ; plusieurs versements ; formats libres,
  10 Mo, documents conservés sans limite de durée ; adresse email fictive.
  Côté client : invitation, mot de passe oublié, formulaire d'ouverture en deux
  étapes, puis quatre rubriques (Suivi, Documents, Paiements, Profil), barre
  d'onglets en bas au téléphone. Côté panel : rubrique « Dossiers clients »
  (liste filtrable dont « À vérifier », ouverture d'un dossier — aussi depuis une
  demande de contact —, lien d'invitation à copier ou envoyer par WhatsApp,
  étapes, pièces à valider ou refuser avec motif, liste ajustable, versements,
  note interne, suppression). Tables `clients`, `client_tokens`, `dossiers`,
  `checklist_items`, `documents`, `dossier_payments`. Testé de bout en bout
  (curl et Chrome, bureau et 390 px), y compris l'isolement entre deux clients.
  Direction visuelle : celle du site (marine, ocre, Poppins, quatre couleurs du
  logo), avec pour seul motif le tampon consulaire déjà validé, qui porte ici
  l'étape en cours.
- **Espace client, priorité 2** (03/10/2026) : emails automatiques
  (`app/Dossiers/Notifier.php` : documents reçus, étape franchie, pièce à
  refaire, nouveau message, et alertes à l'équipe ; dépôts en rafale espacés
  d'un quart d'heure), messagerie par dossier (table `dossier_messages`, onglet
  « Messages » du client, bloc « Messages » de la fiche du panel), vue
  d'ensemble en tête de « Dossiers clients » (refonte du 03/10/2026, choisie
  sur croquis par l'utilisateur : quatre indicateurs, dont trois filtrent la
  liste, puis un tableau triable devenu cartes au téléphone ; filtres par
  étape et par portée dans la barre d'outils) et
  badge du menu (dossiers avec pièce à vérifier ou message non lu). Les emails
  ne contiennent jamais un message ni un document : ils mènent à l'espace.

**Non fait — par ordre de priorité**

1. **Mise en ligne du panel et de l'espace client** : importer `schema.sql` et
   `seed.sql`, renseigner `JWT_SECRET` dans le `.env` de production, créer les
   comptes du client (`api/database/README.md`), rendre `api/public/uploads/` et
   `api/storage/` accessibles en écriture.
2. **Espace client, V2 du cahier des charges** (à lancer sur demande de
   l'utilisateur) : modèles de listes par visa et pays, rappels, SMS,
   historique, export, plusieurs dossiers par client, FAQ.
3. **Lancement de l'espace client** : le bouton « Espace client » de l'en-tête
   du site mène encore à la section d'annonce (`#espace-client`) ; le faire
   pointer vers `/espace-client` le jour du lancement.

## Points en suspens côté client

- **Espace client : réponses définitives attendues** (celles du 03/10/2026 sont
  provisoires) : libellés exacts des étapes, pièces par défaut, questions
  d'ouverture de dossier, adresse email de l'équipe (`MAIL_DOSSIERS_ADDRESS`,
  fictive pour l'instant). À faire valider aussi : le mot de passe client exige
  8 caractères (le panel, lui, n'a aucune règle à la demande du client), et la
  conservation sans limite des documents, qui devra figurer dans la politique de
  confidentialité.

- **Le logo mentionne « Production Agricole »**, une quatrième activité absente du
  cahier des charges et du site. À trancher : l'ajouter ou retirer la mention.
- **Collège Universel : autorisation écrite à obtenir.** Le contrat de référent
  exige l'accord préalable du collège pour utiliser son nom et son logo dans nos
  supports. La section `CollegePartner.tsx` cite le nom sans le logo (`TODO logo`).
  Elle ne fait aucune promesse d'admission ni de visa : le contrat interdit au
  référent d'engager le collège. Ne pas y ajouter la commission.
- **Adresse professionnelle à créer** : le site affiche `contact@visilioncorporate.com`,
  qui n'existe pas encore. Le PDF utilise `infovisilioncorporate@gmail.com`.
- **Texte du « Contrat de travail au Canada » à faire valider.** Prestation
  confirmée par le client le 26/09/2026 (voir l'historique), mais il n'en a pas
  fourni le texte : titre, accroche et description sont de notre rédaction. Le
  client peut désormais les corriger lui-même dans le panel (section Prestations).
- **Pages légales à rédiger** : mentions légales et politique de confidentialité
  (le formulaire collecte des données personnelles, désormais conservées en base
  jusqu'à leur suppression dans le panel : la durée de conservation est à fixer
  avec le client ; la mesure d'audience du site doit aussi y figurer, même sans
  cookie). Les liens désactivés de la
  maquette ont été retirés du pied de page en attendant les textes.
- **Contenus provisoires à remplacer** : portrait du couple (un seul, dans « À
  propos »), témoignages et leurs photos, villes du tableau des départs à confirmer.
  Tous se remplacent depuis le panel, sans intervention technique.
  La photo de la bannière (`public/images/hero-paris-*.webp`, voyageuse à Paris)
  vient d'Unsplash (Atikh Bana, licence Unsplash, usage commercial libre) : elle
  peut rester, ou être remplacée par une photo du client aux mêmes largeurs
  (960, 1920, 2400 px). Volontairement pas un couple, pour ne pas la confondre
  avec les fondateurs. Les chiffres « 98 % /
  +1 200 / 45+ » de la maquette ont été retirés : à réintroduire seulement avec des
  chiffres réels fournis par le client.

## Historique des décisions notables

- **Refonte visuelle refusée (16/09/2026).** Une direction artistique fondée sur les
  quatre couleurs du logo (bleu/rouge/vert/jaune structurels, titres en Fraunces,
  motif des quatre barres récurrent) a été livrée puis **annulée par le client**, qui
  ne l'a pas appréciée. Les raisons précises n'ont pas été recueillies. Le design
  actuel reste celui de la maquette validée : bleu marine `#00142f` + ocre `#b35b00`,
  Poppins. **Ne pas relancer de refonte large sans faire valider la direction d'abord.**
- **Nouvelle direction validée (21/09/2026).** Approche par étapes : un pilote
  (bannière centrée sur le couple + « À propos » avec le texte intégral du PDF) a
  été validé, puis étendu à toute la page à la demande de l'utilisateur, qui a
  exigé d'y intégrer les quatre couleurs. Base inchangée (marine + ocre, Poppins).
  **Le site ne présente que les 5 prestations de `docs/Services_Assistanat_Visa.pdf`**
  (demande explicite de l'utilisateur) : visa étudiant, résidence permanente, visa
  visiteur, visa d'affaires, visa sport — plus, depuis le 26/09, le contrat de
  travail au Canada (voir plus bas). Billetterie, courtage et import-export n'y
  figurent plus. Chaque prestation porte une couleur du logo (champ `color`,
  modifiable dans le panel), reprise dans les témoignages et le pied de page. Jetons
  `brand-*` dans `index.css`, classes dans `src/components/ui/brand.ts`.
  Photos du couple et des clients encore à fournir (emplacements marqués `TODO photo`).
- **Sixième prestation (26/09/2026) : contrat de travail au Canada** (résidence
  temporaire), ouverte pour l'instant aux métiers de la santé et de l'éducation
  préscolaire. Placée après la résidence permanente, couleur rouge. Si le client
  élargit les secteurs, l'accroche se met à jour dans le panel.
- **Panel d'administration (02/10/2026)**, à la demande de l'utilisateur, qui a
  écarté tout déploiement par GitHub (le client dépose les fichiers par FTP) et
  choisi MySQL. D'où le contenu chargé à l'exécution plutôt qu'une recompilation
  à chaque modification. Les tables, retirées le 16/09 à la demande du client,
  reviennent avec ce chantier.
- Les contrastes mesurés lors de cette tentative restent valables et utiles :
  sur fond clair, l'or `#E0A010` ne donne que **2,17** et ne peut pas porter de texte ;
  le rouge `#F70E3B` plafonne à **3,93** et ne convient pas au texte courant non plus.

## Dépôt

Le projet est versionné sur `https://github.com/Junior-Amian/vlc-website.git`,
branche `main`.

Ne sont pas versionnés : `node_modules`, `frontend/dist` (régénéré par
`npm run build`), `api/.env`, les journaux et le cache de `api/storage/`, les
images envoyées dans `api/public/uploads/` (sauf son `.htaccess`), ainsi
que `.claude/` et `template/`. **Après un clone, `api/.env` est à recréer** à
partir de `api/.env.example` : sans lui, l'API ne démarre pas.

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
| `docs/Espace_Client_Cahier_des_Charges.pdf` | Périmètre MVP de l'espace client (phase 2) |
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

```
api/         API PHP (MVC natif, sans dépendances)
frontend/    Application React (Vite + Tailwind 4)
docs/        Cahiers des charges et logo
template/    Maquette HTML d'origine et sa capture
```

## Commandes

```bash
cd frontend
npm run dev        # serveur de développement, port 5173
npm run build      # tsc --noEmit puis génération statique dans dist/
npm run typecheck  # vérification TypeScript seule
```

PHP et MySQL ne sont **pas dans le PATH**. Ils viennent de XAMPP :
`C:\xampp\php\php.exe` (PHP 8.2.12) et `C:\xampp\mysql\bin\` (MariaDB 10.4.32).

## Conventions

- **Tailwind 4 se configure en CSS**, pas en JavaScript. Les jetons vivent dans
  `frontend/src/styles/index.css` sous `@theme`. Il n'y a pas de `tailwind.config.js`,
  et il ne faut pas en créer.
- **Tailwind ignore silencieusement une classe inconnue.** Après tout renommage de
  jeton, vérifier que les utilitaires attendus sont bien émis dans `dist/assets/*.css` —
  la compilation ne signalera rien.
- **Le HTML de `index.html` ne porte ni `<title>` ni `<meta name="description">** :
  chaque page les fournit via `src/components/ui/Seo.tsx`. En coder un en dur produit
  une balise en double dans le HTML pré-rendu.
- **La police d'icônes est réduite aux icônes utilisées** (`icon_names=` dans
  `index.html`, par ordre alphabétique) : 9 Ko au lieu de 4 Mo. **Toute nouvelle
  icône Material Symbols doit y être ajoutée**, sinon elle s'affiche comme un mot
  (« arrow_forward »). La compilation ne signale rien.
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
  L'accroche et le bouton concluent la section après la dernière fiche. Les repères sont décalés de 8rem, le `scroll-padding-top` de
  la page : changer l'un impose de changer l'autre.
- **`react-router-dom` est figé en 6.x** : `vite-react-ssg` déclare `^6.14.1` en peer.
  Ne pas monter en v7 sans vérifier que l'outil le supporte.
- Côté PHP, les colonnes modifiables passent obligatoirement par `$fillable`
  (`api/app/Core/Model.php`) : une charge JSON ne doit jamais pouvoir écrire une
  colonne non prévue.
- Réponses de l'API toujours en JSON, via `App\Core\Response`.

## État d'avancement

**Fait**

- Site vitrine en page unique, pré-rendu, déployable tel quel : bannière, à propos
  (fondateurs), les 6 prestations, partenariat Collège Universel, témoignages, annonce espace client, contact.
- Fichiers de déploiement : `.htaccess` (URL propres, HTTPS, cache, en-têtes de
  sécurité), `robots.txt`, `sitemap.xml`.
- Socle de l'API PHP : routeur avec middlewares, validateur, PDO, journalisation,
  mailer, JWT, CORS, limitation de débit sur fichier.

**Non fait — par ordre de priorité**

1. **Le formulaire de contact n'a pas d'endpoint.** Il manque `api/public/index.php`
   (contrôleur frontal), `api/routes/api.php` et `ContactController`. En l'état
   l'envoi affiche « Impossible de joindre nos serveurs ». Aucune table n'est
   nécessaire si l'on se contente d'envoyer un email.

   Le front poste en `POST /api/contact` le corps JSON suivant — c'est le contrat
   à respecter côté PHP (voir `frontend/src/lib/api.ts`) :

   ```json
   {
     "full_name": "string",
     "email": "string",
     "phone": "string",
     "message": "string",
     "consent": true
   }
   ```

   Réponse attendue : `{ "success": true }`, ou `{ "success": false, "message": "...",
   "errors": { "champ": ["motif"] } }` avec un code HTTP d'erreur. Les erreurs par
   champ sont affichées sous l'input correspondant.
2. **Aucune table de base de données** — retirées à la demande du client. Les modèles
   et le schéma sont à recréer le moment venu.
3. **Espace client et administration** (phase 2) : `AuthMiddleware` et `Jwt` sont
   écrits et prêts, mais non branchés.

## Points en suspens côté client

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
  fourni le texte : titre, accroche et description de `services.ts` sont de notre
  rédaction.
- **Pages légales à rédiger** : mentions légales et politique de confidentialité
  (le formulaire collecte des données personnelles). Les liens désactivés de la
  maquette ont été retirés du pied de page en attendant les textes.
- **Contenus provisoires à remplacer** : portrait du couple (un seul, dans « À
  propos »), témoignages et leurs photos, villes du tableau des départs à confirmer.
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
  figurent plus. Chaque prestation porte une couleur du logo (`color` dans
  `src/data/services.ts`), reprise dans les témoignages et le pied de page. Jetons
  `brand-*` dans `index.css`, classes dans `src/components/ui/brand.ts`.
  Photos du couple et des clients encore à fournir (emplacements marqués `TODO photo`).
- **Sixième prestation (26/09/2026) : contrat de travail au Canada** (résidence
  temporaire), ouverte pour l'instant aux métiers de la santé et de l'éducation
  préscolaire. Placée après la résidence permanente, couleur rouge. Si le client
  élargit les secteurs, mettre à jour l'accroche dans `services.ts`.
- Les contrastes mesurés lors de cette tentative restent valables et utiles :
  sur fond clair, l'or `#E0A010` ne donne que **2,17** et ne peut pas porter de texte ;
  le rouge `#F70E3B` plafonne à **3,93** et ne convient pas au texte courant non plus.

## Dépôt

Le projet est versionné sur `https://github.com/Junior-Amian/vlc-website.git`,
branche `main`.

Ne sont pas versionnés : `node_modules`, `frontend/dist` (régénéré par
`npm run build`), `api/.env`, les journaux et le cache de `api/storage/`, ainsi
que `.claude/` et `template/`. **Après un clone, `api/.env` est à recréer** à
partir de `api/.env.example` : sans lui, l'API ne démarre pas.

import { lazy, Suspense, useEffect, useState } from 'react';
import { Head } from 'vite-react-ssg';

/*
  Le panel n'est chargé que sur /admin : son code (formulaires, médiathèque)
  vit dans un fichier à part, que les visiteurs du site ne téléchargent
  jamais.
*/
const AdminApp = lazy(() => import('./AdminApp'));

/*
  Icônes du panel. La police du site (index.html) est réduite aux icônes de
  la vitrine ; le panel charge la sienne, qui la remplace sur ses pages :
  même famille, déclarée après, et c'est la dernière déclarée qui l'emporte.
  D'où son ajout en fin de <head> au montage : placée par <Head>, elle
  arrivait avant celle du site dans le HTML pré-rendu, et perdait.

  Elle doit contenir :
  - les icônes de l'interface du panel ;
  - toutes celles proposées dans les formulaires (ContentSchema::ICONS dans
    api/app/Content/ContentSchema.php).
*/
const ADMIN_ICONS = [
  // Interface du panel
  'add', 'arrow_back', 'arrow_downward', 'arrow_forward', 'arrow_upward', 'check', 'close',
  'dashboard', 'delete', 'error', 'expand_more', 'image', 'inbox', 'lock', 'logout', 'menu',
  'open_in_new', 'person', 'photo_library', 'progress_activity', 'search', 'upload',
  'visibility_off',
  // Dossiers clients (états des pièces : dossiers/status.ts)
  'check_circle', 'content_copy', 'description', 'edit', 'folder_open', 'hourglass_top', 'send',
  // Choix proposés dans les formulaires
  'account_balance', 'business_center', 'call', 'chat', 'favorite', 'flight', 'flight_land',
  'flight_takeoff', 'forum', 'gavel', 'home_work', 'location_on', 'luggage', 'mail',
  'notifications_active', 'payments', 'schedule', 'school', 'shield', 'sports_soccer', 'verified',
  'work',
];

// Google Fonts exige la liste triée par ordre alphabétique, sans doublon.
const ICON_FONT = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=${[
  ...new Set(ADMIN_ICONS),
]
  .sort()
  .join(',')}&display=block`;

function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface">
      <p role="status" className="text-sm text-on-surface-variant">
        Chargement du panel…
      </p>
    </main>
  );
}

/**
 * Point d'entrée de /admin.
 *
 * Le pré-rendu ne produit que l'écran de chargement : le panel dépend de la
 * session de l'administrateur, inconnue au moment de la compilation. Il
 * n'est monté qu'une fois dans le navigateur.
 */
export default function AdminEntry() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ICON_FONT;
    document.head.appendChild(link);

    setMounted(true);

    return () => link.remove();
  }, []);

  return (
    <>
      <Head>
        <title>Administration | VISILION CORPORATE</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {mounted ? (
        <Suspense fallback={<Loading />}>
          <AdminApp />
        </Suspense>
      ) : (
        <Loading />
      )}
    </>
  );
}

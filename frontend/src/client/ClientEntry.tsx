import { lazy, Suspense, useEffect, useState } from 'react';
import { Head } from 'vite-react-ssg';
import { ContentProvider } from '../content/ContentProvider';
import { LogoBar } from '../components/ui/controls';

/*
  L'espace client n'est chargé que sur /espace-client : les visiteurs du
  site ne téléchargent jamais son code.
*/
const ClientApp = lazy(() => import('./ClientApp'));

/*
  Icônes de l'espace client. Comme pour le panel (voir AdminEntry), la
  police est ajoutée en fin de <head> au montage, pour passer après celle
  du site. Toute icône utilisée dans src/client doit figurer ici, sinon elle
  s'affiche comme un mot.
*/
const CLIENT_ICONS = [
  'arrow_back', 'arrow_forward', 'call', 'chat', 'check', 'check_circle', 'close', 'delete',
  'description', 'edit', 'error', 'folder_open', 'home', 'hourglass_top', 'lock', 'logout', 'mail',
  'open_in_new', 'payments', 'person', 'progress_activity', 'schedule', 'send', 'upload', 'visibility',
  'visibility_off',
];

// Google Fonts exige la liste triée par ordre alphabétique, sans doublon.
const ICON_FONT = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=${[
  ...new Set(CLIENT_ICONS),
]
  .sort()
  .join(',')}&display=block`;

export function ClientLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface">
      <LogoBar className="h-1 w-16 animate-pulse" />
      <p role="status" className="text-sm text-on-surface-variant">
        Ouverture de votre espace…
      </p>
    </main>
  );
}

/**
 * Point d'entrée de /espace-client.
 *
 * Comme pour le panel, le pré-rendu ne produit que l'écran d'attente :
 * l'espace dépend de la session du client, inconnue à la compilation.
 * Le contenu du site (ContentProvider) fournit les coordonnées du
 * conseiller, modifiables dans le panel.
 */
export default function ClientEntry() {
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
        <title>Espace client | VISILION CORPORATE</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#00142f" />
      </Head>

      {mounted ? (
        <ContentProvider>
          <Suspense fallback={<ClientLoading />}>
            <ClientApp />
          </Suspense>
        </ContentProvider>
      ) : (
        <ClientLoading />
      )}
    </>
  );
}

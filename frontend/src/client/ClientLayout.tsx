import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import Icon from '../components/ui/Icon';
import { Avatar, LogoBar } from '../components/ui/controls';
import { asset } from '../lib/asset';
import { useClient } from './ClientContext';
import { itemsToDo } from '../dossiers/status';

type Badge = 'documents' | 'messages';

const TABS: { to: string; label: string; icon: string; end: boolean; badge?: Badge }[] = [
  { to: '/espace-client', label: 'Suivi', icon: 'home', end: true },
  { to: '/espace-client/documents', label: 'Documents', icon: 'folder_open', end: false, badge: 'documents' },
  { to: '/espace-client/messages', label: 'Messages', icon: 'chat', end: false, badge: 'messages' },
  { to: '/espace-client/paiements', label: 'Paiements', icon: 'payments', end: false },
  { to: '/espace-client/profil', label: 'Profil', icon: 'person', end: false },
];

/** Ce que le badge annonce aux lecteurs d'écran. */
const BADGE_LABEL: Record<Badge, [string, string]> = {
  documents: ['pièce à fournir', 'pièces à fournir'],
  messages: ['message non lu', 'messages non lus'],
};

/*
  Lien du menu latéral : même vocabulaire que le panel (AdminLayout). La
  rubrique en cours porte un trait ocre à gauche et un fond à peine
  éclairci ; on la repère sans qu'elle crie. 44 px au doigt, 40 à la souris.
*/
const sideLinkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex min-h-11 pointer-fine:min-h-10 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors duration-150 before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:transition-colors ${
    isActive
      ? 'bg-white/[0.08] font-semibold text-white before:bg-secondary-container'
      : 'font-medium text-on-primary-variant before:bg-transparent hover:bg-white/[0.04] hover:text-white'
  }`;

/**
 * Coquille de l'espace connecté.
 *
 * Au téléphone et sur tablette, où se trouvent la plupart des clients : un
 * en-tête léger et une barre d'onglets en bas, à portée de pouce, comme
 * dans les applications qu'ils utilisent déjà.
 *
 * Sur grand écran (lg), un menu latéral marine, fixe, sur le modèle du
 * panel : la marque, les rubriques avec leurs pastilles, puis le compte.
 * Volontairement sobre (demande du 10/10/2026) : le dossier et le
 * conseiller vivent dans les pages, pas dans le menu. Le contenu prend toute
 * la largeur restante (refonte du 10/10/2026 : en-tête et colonne de
 * 1024 px laissaient la moitié de l'écran vide).
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  const { client, dossier, unreadMessages, logout } = useClient();
  const { pathname } = useLocation();
  const badges: Record<Badge, number> = {
    documents: dossier ? itemsToDo(dossier).length : 0,
    messages: unreadMessages,
  };

  const current = TABS.find((tab) => (tab.end ? pathname.replace(/\/$/, '') === tab.to : pathname.startsWith(tab.to)));
  const previousPath = useRef(pathname);

  /*
    Chaque rubrique s'ouvre en haut de page, pas à la hauteur de la
    précédente. Le focus passe à son titre : sans cela, un lecteur d'écran
    reste sur l'onglet cliqué et n'annonce pas la nouvelle page (audit du
    10/10/2026). Pas au premier affichage, où rien n'a changé ; la
    comparaison au chemin précédent tient aussi le double montage du mode
    strict de React.
  */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    if (previousPath.current === pathname) {
      return;
    }

    previousPath.current = pathname;
    const heading = document.querySelector<HTMLElement>('#contenu-client h1');

    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Un titre d'onglet par rubrique (WCAG 2.4.2). */}
      <Head>
        <title>{`${current?.label ?? 'Votre espace'} · Espace client | VISILION CORPORATE`}</title>
      </Head>

      <a
        href="#contenu-client"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lifted"
      >
        Aller au contenu
      </a>

      {/* Grand écran : menu latéral, collé à l'écran pendant que le contenu défile. */}
      <aside className="hidden bg-primary lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex flex-col gap-4 px-5 pb-5 pt-6">
          <a href={asset('/')} className="flex min-h-11 items-center gap-3 rounded-xl" aria-label="VISILION CORPORATE, retour au site">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1">
              <img src={asset('/logo-96.jpeg')} alt="" width={40} height={40} className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-bold leading-tight text-white">VISILION</span>
              <span className="block text-xs text-on-primary-muted">Espace client</span>
            </span>
          </a>
          <LogoBar className="h-1" />
        </div>

        <nav aria-label="Rubriques de votre espace" className="sidebar-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={sideLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon
                    name={tab.icon}
                    size={20}
                    filled={isActive}
                    className={`shrink-0 transition-colors ${isActive ? 'text-secondary-container' : 'text-on-primary-muted group-hover:text-on-primary-soft'}`}
                  />
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge && badges[tab.badge] > 0 && (
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                      {badges[tab.badge]}
                      <span className="sr-only"> {badges[tab.badge] > 1 ? BADGE_LABEL[tab.badge][1] : BADGE_LABEL[tab.badge][0]}</span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1.5">
            <NavLink
              to="/espace-client/profil"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]"
            >
              <Avatar name={client.fullName} className="h-9 w-9 text-sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{client.fullName}</span>
                <span className="block truncate text-xs text-on-primary-muted">Mon profil</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={logout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-primary-muted transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Téléphone et tablette : en-tête léger. Le menu latéral le remplace sur grand écran. */}
        <header className="sticky top-0 z-30 border-b border-surface-container bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <a href={asset('/')} className="flex min-h-11 items-center gap-2.5 rounded-lg" aria-label="VISILION CORPORATE, retour au site">
              <img src={asset('/logo-96.jpeg')} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-bold leading-none text-primary">VISILION</span>
                <LogoBar className="h-[3px] w-14" />
              </span>
            </a>

            <NavLink to="/espace-client/profil" className="flex items-center rounded-full p-1" aria-label={`Votre profil, ${client.fullName}`}>
              <Avatar name={client.fullName} className="h-9 w-9 text-xs" />
            </NavLink>
          </div>
        </header>

        <main
          id="contenu-client"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 outline-none sm:px-6 sm:pt-8 lg:max-w-[88rem] lg:px-10 lg:pb-12 lg:pt-10 xl:px-12"
        >
          {children}
        </main>
      </div>

      {/*
        Fond plein, sans flou : avec celui de l'en-tête, deux flous
        recalculés à chaque image de défilement pesaient sur les téléphones
        d'entrée de gamme (audit du 10/10/2026). À 95 % d'opacité, le flou
        ne se voyait de toute façon presque pas.

        Libellés en 10 px sous 360 px de large, comme les barres d'onglets
        d'iOS : à 320 px, chaque onglet fait 64 px et « Documents », en
        12 px, en demandait 71 ; les libellés se touchaient.
      */}
      <nav
        aria-label="Rubriques de votre espace"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-semibold min-[360px]:text-xs transition-colors ${
                    isActive ? 'text-secondary-ink' : 'text-on-surface-variant'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                        isActive ? 'bg-secondary-fixed' : ''
                      }`}
                    >
                      <Icon name={tab.icon} size={22} filled={isActive} />
                      {tab.badge && badges[tab.badge] > 0 && (
                        <span className="absolute -top-0.5 right-1">
                          <TabBadge count={badges[tab.badge]} kind={tab.badge} />
                        </span>
                      )}
                    </span>
                    {tab.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Pièces à fournir (onglet Documents) ou messages non lus (onglet Messages). */
function TabBadge({ count, kind }: { count: number; kind: Badge }) {
  const [one, many] = BADGE_LABEL[kind];

  return (
    <span className="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-brand-red-ink px-1 text-[0.6875rem] font-bold leading-none text-white">
      {count}
      <span className="sr-only"> {count > 1 ? many : one}</span>
    </span>
  );
}

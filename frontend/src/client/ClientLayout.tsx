import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

/**
 * Coquille de l'espace connecté.
 *
 * Au téléphone, où se trouvent la plupart des clients : une barre
 * d'onglets en bas, à portée de pouce, comme dans les applications qu'ils
 * utilisent déjà. Sur grand écran, les mêmes onglets passent dans
 * l'en-tête. Cinq rubriques au plus : au-delà, la barre ne tient plus.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  const { client, dossier, unreadMessages } = useClient();
  const { pathname } = useLocation();
  const badges: Record<Badge, number> = {
    documents: dossier ? itemsToDo(dossier).length : 0,
    messages: unreadMessages,
  };

  // Chaque rubrique s'ouvre en haut de page, pas à la hauteur de la précédente.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-surface">
      <a
        href="#contenu-client"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 border-b border-surface-container bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href={asset('/')} className="flex items-center gap-2.5 rounded-lg" aria-label="VISILION CORPORATE, retour au site">
            <img src={asset('/logo.jpeg')} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-bold leading-none text-primary">VISILION</span>
              <LogoBar className="h-[3px] w-14" />
            </span>
          </a>

          <nav aria-label="Rubriques de votre espace" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-surface-container-low p-1">
              {TABS.map((tab) => (
                <li key={tab.to}>
                  <NavLink
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `relative inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                        isActive ? 'bg-white text-primary shadow-ambient' : 'text-on-surface-variant hover:text-primary'
                      }`
                    }
                  >
                    {tab.label}
                    {tab.badge && badges[tab.badge] > 0 && <TabBadge count={badges[tab.badge]} kind={tab.badge} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <NavLink
            to="/espace-client/profil"
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 lg:pr-3"
            aria-label={`Votre profil, ${client.fullName}`}
          >
            <Avatar name={client.fullName} className="h-9 w-9 text-xs" />
            <span className="hidden max-w-[12rem] truncate text-sm font-semibold text-primary lg:block">{client.fullName}</span>
          </NavLink>
        </div>
      </header>

      <main
        id="contenu-client"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 outline-none sm:px-6 sm:pt-8 lg:pb-16"
      >
        {children}
      </main>

      <nav
        aria-label="Rubriques de votre espace"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
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

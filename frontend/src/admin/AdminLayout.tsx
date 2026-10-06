import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { asset } from '../lib/asset';
import { useAdmin } from './AdminContext';
import { sectionIcon } from './sections';
import { Avatar, LogoBar } from './ui';

const LEAVE_WARNING = 'Des modifications ne sont pas enregistrées. Quitter cette page sans les enregistrer ?';

/*
  Lien du menu. La rubrique en cours porte un trait ocre sur la gauche, la
  couleur d'action du site, et un fond à peine éclairci : on la repère d'un
  coup d'œil sans qu'elle crie.
*/
// 44 px au doigt, 40 px à la souris (pointer-fine), où la place compte plus.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex min-h-11 pointer-fine:min-h-10 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:transition-colors ${
    isActive
      ? 'bg-white/[0.08] font-semibold text-white before:bg-secondary-container'
      : 'font-medium text-on-primary-variant before:bg-transparent hover:bg-white/[0.04] hover:text-white'
  }`;

const iconClass = (isActive: boolean) =>
  `shrink-0 transition-colors ${isActive ? 'text-secondary-container' : 'text-on-primary-muted group-hover:text-on-primary-soft'}`;

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-1.5 text-xs font-semibold text-on-primary-muted">{label}</p>
      {children}
    </div>
  );
}

/**
 * Coquille du panel : menu latéral marine (en tiroir sous lg), contenu à
 * droite sur fond clair.
 *
 * Changer de rubrique avec des modifications non enregistrées demande
 * confirmation, de même que fermer l'onglet (beforeunload).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, schema, dirty, logout, newRequests, dossierAlerts } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Le tiroir n'existe que sous lg. Ouvert sur une tablette qu'on tourne en
  // paysage, il disparaîtrait en laissant la page inerte : on le ferme.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const onChange = () => wide.matches && setMenuOpen(false);
    wide.addEventListener('change', onChange);

    return () => wide.removeEventListener('change', onChange);
  }, []);

  /** Ferme le tiroir et rend le focus au bouton qui l'a ouvert. */
  const closeMenu = () => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);

    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /*
    Tiroir ouvert : le focus entre dans le menu, la page derrière ne défile
    plus et devient inerte (voir <main inert>), si bien que la touche Tab
    reste dans le tiroir et l'en-tête. Échap le referme.
  */
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const guard = (event: MouseEvent) => {
    if (dirty && !window.confirm(LEAVE_WARNING)) {
      event.preventDefault();
    }
  };

  const content = schema.sections.filter((section) => section.group === 'content');
  const settings = schema.sections.filter((section) => section.group === 'settings');

  const sectionLink = (key: string, label: string) => (
    <NavLink key={key} to={`/admin/sections/${key}`} onClick={guard} className={linkClass}>
      {({ isActive }) => (
        <>
          <Icon name={sectionIcon(key)} size={20} className={iconClass(isActive)} />
          {label}
        </>
      )}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1">
            <img src={asset('/logo.jpeg')} alt="" width={44} height={44} className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-bold leading-tight text-white">VISILION</p>
            <p className="text-xs text-on-primary-muted">Administration du site</p>
          </div>
        </div>
        <LogoBar className="h-1" />
      </div>

      <nav aria-label="Rubriques du panel" className="sidebar-scroll flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        {/* Le travail quotidien, groupé en tête : tableau de bord, demandes, dossiers. */}
        <div className="flex flex-col gap-1">
          <NavLink to="/admin" end onClick={guard} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon name="dashboard" size={20} className={iconClass(isActive)} />
                Tableau de bord
              </>
            )}
          </NavLink>

          <NavLink to="/admin/demandes" onClick={guard} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon name="inbox" size={20} className={iconClass(isActive)} />
                <span className="flex-1">Demandes</span>
                {newRequests > 0 && (
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                    {newRequests}
                    <span className="sr-only"> nouvelle{newRequests > 1 ? 's' : ''}</span>
                  </span>
                )}
              </>
            )}
          </NavLink>

          <NavLink to="/admin/dossiers" onClick={guard} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon name="folder_open" size={20} className={iconClass(isActive)} />
                <span className="flex-1">Dossiers clients</span>
                {dossierAlerts > 0 && (
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                    {dossierAlerts}
                    <span className="sr-only"> à traiter (pièce à vérifier ou message non lu)</span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        </div>

        <NavGroup label="Contenu de la page">
          {content.map((section) => sectionLink(section.key, section.label))}
        </NavGroup>

        <NavGroup label="Réglages">
          {settings.map((section) => sectionLink(section.key, section.label))}
          <NavLink to="/admin/medias" onClick={guard} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon name="photo_library" size={20} className={iconClass(isActive)} />
                Médiathèque
              </>
            )}
          </NavLink>
        </NavGroup>
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/10 p-3">
        <a href={asset('/')} target="_blank" rel="noopener noreferrer" className={linkClass({ isActive: false })}>
          <Icon name="open_in_new" size={20} className={iconClass(false)} />
          Voir le site
          <span className="sr-only"> (nouvel onglet)</span>
        </a>

        <div className="mt-1 flex items-center gap-1 rounded-xl bg-white/[0.04] p-1.5">
          <NavLink
            to="/admin/compte"
            onClick={guard}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]"
          >
            <Avatar name={admin.name} className="h-9 w-9 text-sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{admin.name}</span>
              <span className="block truncate text-xs text-on-primary-muted">Mon compte</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => (!dirty || window.confirm(LEAVE_WARNING)) && logout()}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-primary-muted transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="logout" size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface-container-low lg:grid lg:grid-cols-[16.5rem_1fr]">
      {/*
        Lien d'évitement : au clavier, il épargne la quinzaine de liens du
        menu à chaque page. Invisible tant qu'il n'a pas le focus.
      */}
      <a
        href="#contenu-admin"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lifted"
      >
        Aller au contenu
      </a>

      {/* Barre du haut, mobile et tablette. */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-primary px-4 lg:hidden">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-0.5">
            <img src={asset('/logo.jpeg')} alt="" width={36} height={36} className="h-full w-full object-contain" />
          </span>
          <span className="text-sm font-bold text-white">Administration</span>
        </span>
        {/* Sur mobile, le menu est replié : le compte des nouvelles demandes reste visible. */}
        {newRequests > 0 && (
          <span className="ml-auto rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold text-primary">
            {newRequests} nouvelle{newRequests > 1 ? 's' : ''} demande{newRequests > 1 ? 's' : ''}
          </span>
        )}
        {/* shrink-0 : à côté du badge, le bouton gardait 38 px de large au lieu de 44. */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          aria-expanded={menuOpen}
          aria-controls="menu-admin"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10"
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 top-16 z-20 lg:hidden">
          {/* Voile cliquable : hors du parcours clavier, qui ferme par Échap ou le bouton. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeMenu}
            className="absolute inset-0 bg-primary/50"
          />
          <aside
            ref={drawerRef}
            id="menu-admin"
            aria-label="Menu du panel"
            className="animate-sheet-in relative h-full w-[min(20rem,85vw)] bg-primary shadow-2xl"
          >
            {sidebar}
          </aside>
        </div>
      )}

      {/* Menu latéral, grand écran. */}
      <aside aria-label="Menu du panel" className="sticky top-0 hidden h-dvh bg-primary lg:block">
        {sidebar}
      </aside>

      <main
        id="contenu-admin"
        tabIndex={-1}
        inert={menuOpen}
        className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 outline-none sm:px-8 sm:pt-10"
      >
        {children}
      </main>
    </div>
  );
}

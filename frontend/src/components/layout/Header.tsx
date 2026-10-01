import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { asset } from '../../lib/asset';
import { site, whatsappLink } from '../../data/site';

/**
 * Suit la section visible pour mettre en évidence le lien du menu
 * correspondant. IntersectionObserver plutôt qu'un écouteur de défilement :
 * aucun calcul à chaque frame. La bande d'observation est le milieu de
 * l'écran, ce qui évite que deux sections soient actives à la fois.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const SECTION_IDS = site.nav.map((item) => item.href.slice(1));

export default function Header() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Empêche le défilement de l'arrière-plan quand le menu mobile est ouvert,
  // sinon la page glisse sous le panneau sur iOS. Échap le referme et rend
  // le focus au bouton qui l'a ouvert.
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
    <header className="header-elevate fixed inset-x-0 top-0 z-50 w-full border-b border-surface-container bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:h-20 sm:px-8 short:h-14">
        <a href="#" className="group flex shrink-0 items-center" onClick={closeMenu}>
          <img
            src={asset('/logo.jpeg')}
            alt={`${site.name}, retour en haut de page`}
            width={120}
            height={56}
            className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105 sm:h-14 short:h-11"
          />
        </a>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {site.nav.map((item) => {
            const isActive = activeSection === item.href.slice(1);

            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {item.label}
                {/* Trait ocre sous le lien de la section en cours de lecture. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-secondary transition-transform duration-300 ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={site.contact.phoneHref}
            className="hidden items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-secondary xl:inline-flex"
          >
            <Icon name="call" size={18} className="text-secondary" />
            {site.contact.phoneDisplay}
          </a>

          {/*
            Mène à l'annonce de l'espace client (phase 2), pas à une page de
            connexion : il n'existe pas encore. Icône seule entre lg et xl,
            où la place manque ; sous lg, le lien vit dans le menu mobile.
          */}
          <a
            href="#espace-client"
            aria-label="Espace client"
            className="group hidden h-11 items-center gap-2.5 whitespace-nowrap rounded-xl border border-primary/15 bg-primary/[0.04] p-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-white active:scale-[0.98] lg:inline-flex xl:pr-4"
          >
            {/* Pastille marine : le bouton reste lisible réduit à son icône. */}
            <span className="flex aspect-square h-full items-center justify-center rounded-lg bg-primary text-white transition-colors duration-200 group-hover:bg-white/15">
              <Icon name="person" size={18} />
            </span>
            <span className="hidden xl:inline">Espace client</span>
          </a>

          {/*
            Un seul « Démarrer ma procédure » à l'écran : sous lg, c'est la
            barre d'action du bas qui le porte (MobileActionBar), sauf sur un
            écran peu haut, où elle s'efface et où l'en-tête le reprend.
            min-h-11 : 44 px, confortable au doigt sur les écrans tactiles.
          */}
          <a
            href="#contact"
            className="hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-on-secondary-fixed active:scale-[0.98] lg:inline-flex short:inline-flex"
          >
            <span>Démarrer ma procédure</span>
            <Icon name="arrow_forward" size={18} className="arrow-nudge" />
          </a>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-mobile"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-surface-container text-primary transition-colors hover:bg-surface-container-low lg:hidden"
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </div>
    </header>

      {/*
        Menu mobile : panneau plein écran sous l'en-tête.

        Rendu À CÔTÉ de <header>, jamais dedans : le flou de l'en-tête
        (backdrop-filter) fait de lui le bloc de référence de tout descendant
        `fixed`. Placé à l'intérieur, le panneau était calé sur les 72 px de
        l'en-tête au lieu de l'écran, et son contenu devenait invisible.
        z-[45] : sous l'en-tête (z-50), au-dessus de la barre d'action (z-40).
      */}
      {isMenuOpen && (
        <div
          id="menu-mobile"
          className="animate-sheet-in fixed inset-x-0 bottom-0 top-[72px] z-[45] flex flex-col overflow-y-auto overscroll-contain bg-white px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:top-20 sm:px-8 lg:hidden short:top-14"
        >
          <nav aria-label="Navigation mobile" className="flex flex-col">
            {site.nav.map((item) => {
              const isActive = activeSection === item.href.slice(1);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={isActive ? 'location' : undefined}
                  className={`flex items-center justify-between border-b border-surface-container py-4 text-lg font-semibold ${
                    isActive ? 'text-secondary' : 'text-primary'
                  }`}
                >
                  {item.label}
                  <Icon name="chevron_right" size={22} className="text-on-surface-variant" />
                </a>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <a
              href="#contact"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-4 text-base font-semibold text-white"
            >
              <span>Démarrer ma procédure</span>
              <Icon name="arrow_forward" size={20} className="arrow-nudge" />
            </a>

            <a
              href="#espace-client"
              onClick={closeMenu}
              className="flex items-center justify-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] py-2.5 text-base font-semibold text-primary"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Icon name="person" size={18} />
              </span>
              Espace client
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={site.contact.phoneHref}
                className="flex items-center justify-center gap-2 rounded-xl border border-surface-container-high py-3.5 text-sm font-semibold text-primary"
              >
                <Icon name="call" size={20} className="text-secondary" />
                Appeler
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-surface-container-high py-3.5 text-sm font-semibold text-primary"
              >
                <Icon name="chat" size={20} className="text-brand-green" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

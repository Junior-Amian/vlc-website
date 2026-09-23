import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import { site, whatsappLink } from '../../data/site';

/*
  Zones où la barre s'efface : la bannière (elle a ses propres boutons), la
  section contact (le formulaire et les coordonnées y sont déjà) et le pied
  de page. Identifiants posés sur ces sections.
*/
const HIDE_ON = ['accueil', 'contact', 'pied-de-page'];

/**
 * Barre d'action fixe en bas d'écran, sur mobile et tablette : appeler,
 * écrire sur WhatsApp ou démarrer une procédure, à tout moment de la
 * lecture. En Côte d'Ivoire, l'appel et WhatsApp sont souvent le premier
 * réflexe, avant le formulaire.
 *
 * IntersectionObserver plutôt qu'un écouteur de défilement. La marge haute
 * de -40% fait disparaître la bannière du calcul dès que son bas passe le
 * haut de l'écran, et fait apparaître le contact dès qu'il pointe en bas.
 * Masquée, la barre est `inert` : ses liens sortent de l'ordre de
 * tabulation. La marge basse respecte l'encoche des iPhone (viewport-fit).
 */
export default function MobileActionBar() {
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const zones = HIDE_ON.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    const inView = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            inView.add(entry.target.id);
          } else {
            inView.delete(entry.target.id);
          }
        }
        setVisible(inView.size === 0);
      },
      { rootMargin: '-40% 0px 0px 0px' },
    );

    zones.forEach((zone) => observer.observe(zone));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      inert={!isVisible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-surface-container bg-white/95 shadow-[0_-8px_24px_-12px_rgb(0_20_47/0.25)] backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-2 px-4 pt-3">
        <a
          href={site.contact.phoneHref}
          aria-label={`Appeler VISILION au ${site.contact.phoneDisplay}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-container-high text-secondary active:scale-95"
        >
          <Icon name="call" size={22} />
        </a>

        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Écrire à VISILION sur WhatsApp"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-container-high text-brand-green active:scale-95"
        >
          <Icon name="chat" size={22} />
        </a>

        <a
          href="#contact"
          className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-4 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <span>Démarrer ma procédure</span>
          <Icon name="arrow_forward" size={18} className="arrow-nudge" />
        </a>
      </div>
    </div>
  );
}

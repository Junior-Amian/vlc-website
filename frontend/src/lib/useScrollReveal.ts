import { useEffect } from 'react';

declare global {
  interface Window {
    /** Signale au filet de sécurité d'index.html que les apparitions sont gérées. */
    __vlcRevealReady?: boolean;
  }
}

/**
 * Fait apparaître les éléments .reveal quand ils entrent à l'écran, en leur
 * ajoutant la classe .is-visible (animation dans styles/index.css).
 *
 * Un seul IntersectionObserver pour toute la page, et chaque élément n'est
 * animé qu'une fois. Seuil à 0 : un élément à peine visible (la carte
 * suivante d'un carrousel, par exemple) s'affiche aussi. La marge basse de
 * -8% déclenche l'apparition un peu après l'entrée, pour qu'on la voie.
 *
 * `key` relance l'observation quand le contenu de la page change (navigation).
 */
export function useScrollReveal(key: string): void {
  useEffect(() => {
    window.__vlcRevealReady = true;

    // Si le filet de sécurité a déjà tout rendu visible (application lente),
    // on ne masque pas à nouveau le contenu : pas d'animation, tant pis.
    if (!document.documentElement.classList.contains('js')) {
      return;
    }

    const elements = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [key]);
}

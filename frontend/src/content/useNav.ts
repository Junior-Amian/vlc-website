import { site } from '../data/site';
import { useContent } from './ContentProvider';

/**
 * Liens du menu, sans ceux des sections absentes de la page : la section
 * des témoignages disparaît quand aucun n'est publié dans le panel.
 */
export function useNav() {
  const { testimonials } = useContent();

  return site.nav.filter((item) => item.href !== '#temoignages' || testimonials.items.length > 0);
}

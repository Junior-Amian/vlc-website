import { useEffect, useState } from 'react';

/**
 * Suit une requête média (`(min-width: 1280px)`…) et se met à jour quand
 * l'écran change de format.
 *
 * Réservé aux espaces chargés seulement dans le navigateur (panel, espace
 * client) : au pré-rendu, il n'y a pas d'écran, et la valeur vaut `false`.
 * À n'employer que lorsque deux présentations n'ont pas la même structure ;
 * pour un simple changement de mise en page, les classes de Tailwind
 * suffisent.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);

    onChange();
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

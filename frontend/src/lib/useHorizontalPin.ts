import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/*
  La mesure doit précéder la peinture, sinon la section est peinte une image
  avec sa hauteur naturelle avant de s'allonger. useLayoutEffect n'existe pas
  au rendu serveur (vite-react-ssg) et y émettrait un avertissement : côté
  serveur, où rien n'est jamais épinglé, useEffect fait aussi bien l'affaire.
*/
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Épingle une galerie horizontale le temps qu'on la traverse : la section
 * reste collée à l'écran et le défilement vertical fait avancer la piste de
 * cartes vers la gauche, au pixel près (1 px de molette = 1 px de piste).
 *
 * Progressif par construction. `pinned` vaut `false` au rendu serveur et au
 * premier rendu client : le HTML pré-rendu est donc la version simple, une
 * liste qui se fait défiler au doigt. L'épinglage ne s'active qu'après
 * montage, et seulement si l'écran est large et que le visiteur n'a pas
 * demandé de réduire les animations. Aucune hydratation ne diverge.
 *
 * La position est lissée (interpolation à 14 % par image) : la piste rattrape
 * la molette en ~150 ms au lieu de la suivre sèchement. C'est ce décalage
 * court qui donne la sensation de glissé.
 *
 * Écritures hors du cycle React : la transformation est posée directement sur
 * le nœud dans la boucle d'animation, et l'avancement est publié en variable
 * CSS `--progress` sur la section. Seul `activeIndex` passe par un état, et
 * il ne change que cinq fois sur toute la traversée.
 */

/** Part du retard rattrapée à chaque image ; plus bas = plus glissant. */
const EASING = 0.14;

/** En deçà, on considère la piste arrivée et on arrête la boucle. */
const SETTLED_PX = 0.1;

export function useHorizontalPin(count: number) {
  /** La section entière, porteuse de la variable CSS --progress. */
  const rootRef = useRef<HTMLElement>(null);
  /** Le bloc haut qui réserve la distance de défilement. */
  const pinRef = useRef<HTMLDivElement>(null);
  /**
   * La fenêtre par laquelle on voit la piste. Elle n'occupe pas toute la
   * largeur : la colonne de titre lui prend sa gauche, et c'est sa largeur à
   * elle, pas celle de l'écran, qui détermine ce qui dépasse.
   */
  const viewportRef = useRef<HTMLDivElement>(null);
  /** La piste déplacée horizontalement. */
  const trackRef = useRef<HTMLUListElement>(null);

  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [entered, setEntered] = useState(false);

  // Valeurs de travail : elles changent à chaque image et n'ont rien à faire
  // dans un état React.
  const distance = useRef(0);
  const offsetTop = useRef(0);
  const target = useRef(0);
  const current = useRef(0);
  const frame = useRef(0);

  // Épinglage réservé au grand écran, et jamais sous réduction des animations :
  // détourner le défilement de quelqu'un qui demande moins de mouvement serait
  // exactement le contraire de ce qu'il demande.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    const decide = () => setPinned(wide.matches && !still.matches);

    decide();
    wide.addEventListener('change', decide);
    still.addEventListener('change', decide);

    return () => {
      wide.removeEventListener('change', decide);
      still.removeEventListener('change', decide);
    };
  }, []);

  /*
    Arrivée de la section à l'écran, pour déclencher l'entrée en cascade des
    fiches. Observé sur le bloc extérieur, présent dans les deux
    présentations : l'entrée a donc lieu aussi sur mobile.

    L'animation est un ajout, jamais un préalable à la visibilité : tant que
    ceci n'a pas basculé, les fiches sont simplement affichées. Si
    l'observation n'aboutit jamais, on perd l'effet, pas le contenu — c'est
    l'inverse du piège de `reveal`, qui masque d'abord et révèle ensuite.
  */
  useEffect(() => {
    const pin = pinRef.current;

    if (!pin || entered) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(pin);

    return () => observer.disconnect();
  }, [entered]);

  useMeasureEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;

    if (!pinned || !root || !pin || !viewport || !track) {
      // Retour à la galerie simple : on rend la piste à sa position naturelle.
      if (track) track.style.transform = '';
      if (root) root.style.removeProperty('--progress');
      setHeight(0);
      setActiveIndex(0);
      return;
    }

    const render = () => {
      track.style.transform = `translate3d(${-current.current}px, 0, 0)`;
    };

    const animate = () => {
      const delta = target.current - current.current;

      if (Math.abs(delta) < SETTLED_PX) {
        current.current = target.current;
        render();
        frame.current = 0;
        return;
      }

      current.current += delta * EASING;
      render();
      frame.current = requestAnimationFrame(animate);
    };

    // requestAnimationFrame ne rend jamais 0 : la valeur sert de « à l'arrêt ».
    const start = () => {
      if (frame.current === 0) frame.current = requestAnimationFrame(animate);
    };

    const update = () => {
      // Relu à chaque fois plutôt que mis en cache : un bloc au-dessus qui
      // change de hauteur (police qui arrive, image qui se pose) déplacerait
      // le point de départ, et l'épinglage commencerait au mauvais endroit.
      // Une lecture de rectangle par événement de défilement ne coûte rien,
      // la transformation étant écrite plus tard, dans la boucle d'animation.
      offsetTop.current = pin.getBoundingClientRect().top + window.scrollY;

      const progress =
        distance.current === 0
          ? 0
          : Math.min(1, Math.max(0, (window.scrollY - offsetTop.current) / distance.current));

      target.current = progress * distance.current;
      root.style.setProperty('--progress', progress.toFixed(4));
      setActiveIndex(Math.round(progress * (count - 1)));
      start();
    };

    const measure = () => {
      // La distance à parcourir, c'est ce qui dépasse de la fenêtre. On
      // réserve autant de hauteur de défilement, d'où le rapport 1:1.
      distance.current = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setHeight(window.innerHeight + distance.current);
      update();
    };

    measure();

    // La piste et sa fenêtre sont observées, pas le bloc épinglé : c'est nous
    // qui fixons sa hauteur, et chaque mesure la ferait notifier à nouveau.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(viewport);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      current.current = 0;
      target.current = 0;
      track.style.transform = '';
      root.style.removeProperty('--progress');
    };
  }, [pinned, count]);

  /**
   * Amène une carte à l'écran depuis son identifiant d'ancre. Une fois la
   * galerie épinglée, une ancre ne suffit plus : la carte visée est bien dans
   * le flux, mais décalée horizontalement par une transformation que le
   * navigateur ne sait pas rattraper. On convertit donc sa position
   * horizontale en position de défilement vertical.
   *
   * Renvoie `false` si l'ancre ne désigne pas une carte : l'appelant laisse
   * alors le navigateur faire son travail habituel.
   */
  const scrollToCard = useCallback(
    (id: string) => {
      const track = trackRef.current;

      if (!pinned || !track || distance.current === 0) return false;

      const card = track.querySelector<HTMLElement>(`#${CSS.escape(id)}`);

      if (!card) return false;

      // La piste est décalée du même retrait que le conteneur du titre : une
      // carte est « en place » quand son bord gauche arrive à ce retrait.
      const inset = Number.parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
      const wanted = Math.min(distance.current, Math.max(0, card.offsetLeft - inset));

      window.scrollTo({ top: offsetTop.current + wanted, behavior: 'smooth' });

      return true;
    },
    [pinned],
  );

  return {
    rootRef,
    pinRef,
    viewportRef,
    trackRef,
    pinned,
    height,
    activeIndex,
    entered,
    scrollToCard,
  };
}

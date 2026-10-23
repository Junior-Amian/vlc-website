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
 * cartes vers la gauche, cran par cran. La hauteur réservée suit le rapport
 * 1:1 (une fiche d'avance = sa largeur de défilement).
 *
 * Progressif par construction. `mode` vaut `'off'` au rendu serveur et au
 * premier rendu client : le HTML pré-rendu est donc la version simple, une
 * liste qui se fait défiler au doigt. L'épinglage ne s'active qu'après
 * montage, et jamais si le visiteur a demandé de réduire les animations.
 * Aucune hydratation ne diverge. Deux présentations épinglées :
 *
 * - `wide` (grand écran) : titre à gauche, deux fiches en face ;
 * - `narrow` (mobile et tablette, à condition que l'écran fasse au moins
 *   640 px de haut pour loger une fiche entière) : titre au-dessus, une
 *   fiche pleine largeur au téléphone, deux sur tablette.
 *
 * Dans les deux cas, la piste avance d'une seule fiche à la fois et ne
 * s'arrête jamais entre deux (voir `update`). Un aimantage léger
 * (scroll-snap « proximity ») pose en plus la page sur un cran quand on
 * s'arrête près de lui, voir `step` et `stops`. Le nombre de fiches visibles
 * n'est écrit nulle part ici : il découle de la largeur des fiches
 * (Services.tsx), que le hook mesure.
 *
 * Écran trop bas (téléphone à l'horizontale) : pas d'épinglage, la liste
 * simple reste en place.
 *
 * Le passage d'un cran au suivant est lissé (interpolation à 14 % par
 * image) : la piste glisse jusqu'à la fiche suivante au lieu d'y sauter.
 *
 * Écritures hors du cycle React : la transformation est posée directement sur
 * le nœud dans la boucle d'animation, et l'avancement est publié en variable
 * CSS `--progress` sur la section. Seul `activeIndex` passe par un état, et
 * il ne change qu'une fois par fiche sur toute la traversée.
 */

/** Part du retard rattrapée à chaque image ; plus bas = plus glissant. */
const EASING = 0.14;

/** En deçà, on considère la piste arrivée et on arrête la boucle. */
const SETTLED_PX = 0.1;

/**
 * Sur mobile, la barre d'adresse qui se replie au défilement change la
 * hauteur de la fenêtre et déclenche `resize`. Tant que la largeur ne bouge
 * pas et que l'écart reste de cet ordre, on ne remesure pas : la section
 * changerait de hauteur sous le doigt et ferait sauter la page.
 */
const URL_BAR_PX = 160;

export type PinMode = 'off' | 'wide' | 'narrow';

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

  const [mode, setMode] = useState<PinMode>('off');
  const pinned = mode !== 'off';
  const [height, setHeight] = useState(0);
  /**
   * Défilement vertical qui fait avancer la piste d'une fiche : sa largeur
   * plus l'écart, au pixel près puisque le rapport est de 1:1.
   */
  const [step, setStep] = useState(0);
  /**
   * Positions d'arrêt de la piste : une par fiche, moins celles déjà visibles
   * au départ (six fiches vues deux par deux : cinq arrêts).
   */
  const [stops, setStops] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [entered, setEntered] = useState(false);

  // Valeurs de travail : elles changent à chaque image et n'ont rien à faire
  // dans un état React.
  const distance = useRef(0);
  const offsetTop = useRef(0);
  const target = useRef(0);
  const current = useRef(0);
  const frame = useRef(0);
  /**
   * La fiche tient-elle en hauteur en mode `narrow` ? La hauteur d'écran ne
   * suffit pas à le prédire : plus l'écran est étroit, plus la fiche est
   * haute. On essaie, on mesure (voir `measure`), et on renonce si elle
   * déborde. Remis à `true` à chaque changement de format d'écran.
   */
  const narrowFits = useRef(true);
  /** `top` du bloc collant, lu dans la page : 0 sur grand écran, l'en-tête sur mobile. */
  const stickyTopRef = useRef(0);
  const [stickyTop, setStickyTop] = useState(0);

  // Jamais d'épinglage sous réduction des animations : détourner le
  // défilement de quelqu'un qui demande moins de mouvement serait exactement
  // le contraire de ce qu'il demande.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const tall = window.matchMedia('(min-height: 640px)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const queries = [wide, tall, still];

    const decide = () =>
      setMode(
        still.matches
          ? 'off'
          : wide.matches
            ? 'wide'
            : tall.matches && narrowFits.current
              ? 'narrow'
              : 'off',
      );

    const onChange = () => {
      narrowFits.current = true;
      decide();
    };

    decide();
    queries.forEach((query) => query.addEventListener('change', onChange));

    return () => queries.forEach((query) => query.removeEventListener('change', onChange));
  }, []);

  /*
    Aimantage des fiches : les repères (voir Services.tsx) portent
    `scroll-snap-align`, mais l'aimantage ne vaut que si la page le déclare.
    « proximity » et non « mandatory » : on n'est attiré que si l'on s'arrête
    près d'une fiche, le reste de la page défile librement.
  */
  useEffect(() => {
    if (!pinned) return;

    const html = document.documentElement;
    html.style.scrollSnapType = 'y proximity';

    return () => {
      html.style.scrollSnapType = '';
    };
  }, [pinned]);

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
      setStep(0);
      setStops(1);
      setActiveIndex(0);
      return;
    }

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

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

    /** Pas d'une fiche à la suivante, en pixels de piste (0 : fiche unique). */
    let cardStep = 0;
    /** Rang du dernier cran, où la piste est au bout de sa course. */
    let lastStop = 0;

    const update = () => {
      // Relu à chaque fois plutôt que mis en cache : un bloc au-dessus qui
      // change de hauteur (police qui arrive, image qui se pose) déplacerait
      // le point de départ, et l'épinglage commencerait au mauvais endroit.
      // Une lecture de rectangle par événement de défilement ne coûte rien,
      // la transformation étant écrite plus tard, dans la boucle d'animation.
      // L'épinglage commence quand le bloc atteint le `top` du sticky (0 sur
      // grand écran, sous l'en-tête sur mobile), pas le haut de l'écran.
      offsetTop.current = pin.getBoundingClientRect().top + window.scrollY - stickyTopRef.current;

      const progress =
        distance.current === 0
          ? 0
          : Math.min(1, Math.max(0, (window.scrollY - offsetTop.current) / distance.current));

      // La piste ne s'arrête que sur un cran entier : elle passe à la fiche
      // suivante à mi-chemin du défilement qui y mène, et la boucle
      // d'animation l'y fait glisser. Une fiche n'est jamais laissée coupée,
      // ce que l'aimantage seul ne garantit pas (il ne joue qu'à proximité
      // d'un repère). La barre d'avancement, elle, suit le défilement.
      const travelled = progress * distance.current;
      const index = cardStep > 0 ? Math.min(lastStop, Math.round(travelled / cardStep)) : 0;

      target.current =
        cardStep === 0 ? travelled : index === lastStop ? distance.current : index * cardStep;
      root.style.setProperty('--progress', progress.toFixed(4));
      // Rang de la première fiche visible.
      setActiveIndex(index);
      start();
    };

    const measure = () => {
      // Le bloc collant : sa position (`top`) et sa hauteur réelles, plutôt
      // que « tout l'écran » — sur mobile, il se colle sous l'en-tête.
      const stage = pin.querySelector<HTMLElement>(':scope > .sticky');

      // Mobile : si titre, compteur et fiche ne tiennent pas ensemble dans
      // l'écran épinglé, on revient à la galerie au doigt plutôt que de
      // couper la fiche. Trois signes de débordement : l'écran épinglé plus
      // haut que lui-même, la piste plus haute que sa fenêtre, ou une fiche
      // plus haute que sa boîte.
      if (mode === 'narrow') {
        const cards = Array.from(track.querySelectorAll<HTMLElement>('article'));
        const overflows =
          (stage !== null && stage.scrollHeight > stage.clientHeight + 1) ||
          track.offsetHeight > viewport.clientHeight + 1 ||
          cards.some((card) => card.scrollHeight > card.clientHeight + 1);

        if (overflows) {
          narrowFits.current = false;
          setMode('off');
          return;
        }
      }

      stickyTopRef.current = stage ? Number.parseFloat(getComputedStyle(stage).top) || 0 : 0;
      setStickyTop(stickyTopRef.current);

      // La distance à parcourir, c'est ce qui dépasse de la fenêtre. On
      // réserve autant de hauteur de défilement, d'où le rapport 1:1.
      distance.current = Math.max(0, track.scrollWidth - viewport.clientWidth);

      // Le pas se lit entre deux fiches voisines plutôt que de se déduire du
      // nombre de fiches visibles : une ou deux selon l'écran, c'est leur
      // largeur qui en décide.
      const items = track.children;
      cardStep =
        items.length > 1
          ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft
          : 0;

      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      setHeight((stage?.offsetHeight ?? window.innerHeight) + distance.current);
      lastStop = cardStep > 0 ? Math.round(distance.current / cardStep) : 0;

      setStep(cardStep);
      setStops(lastStop + 1);
      update();
    };

    const onResize = () => {
      const urlBarOnly =
        window.innerWidth === lastWidth &&
        Math.abs(window.innerHeight - lastHeight) < URL_BAR_PX;

      if (urlBarOnly) update();
      else measure();
    };

    measure();

    // La piste et sa fenêtre sont observées, pas le bloc épinglé : c'est nous
    // qui fixons sa hauteur, et chaque mesure la ferait notifier à nouveau.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(viewport);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      current.current = 0;
      target.current = 0;
      track.style.transform = '';
      root.style.removeProperty('--progress');
    };
    // `mode` et non `pinned` : passer de `wide` à `narrow` change la piste
    // entière, il faut tout remesurer.
  }, [mode, count]);

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
      // Position mesurée à l'écran, pas `offsetLeft` : l'animation d'entrée
      // laisse une transformation sur le <li> de chaque carte, qui devient
      // alors son parent de référence (offsetLeft valait 0 pour toutes).
      // Le décalage de la piste s'applique aux deux mesures et s'annule.
      const left = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
      const wanted = Math.min(distance.current, Math.max(0, left - inset));

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
    mode,
    pinned,
    height,
    step,
    stops,
    /** Fiches visibles à la fois, pour le compteur (« 01 – 02 / 06 »). */
    visible: Math.max(1, count - stops + 1),
    stickyTop,
    activeIndex,
    entered,
    scrollToCard,
  };
}

import { useEffect, useState, type FocusEvent } from 'react';
import Icon from '../ui/Icon';
import { Container } from '../ui/Section';
import { brand } from '../ui/brand';
import { useHorizontalPin, type PinMode } from '../../lib/useHorizontalPin';
import { useContent } from '../../content/ContentProvider';
import type { Service } from '../../content/types';
import ServiceConditions, { hasConditions } from './ServiceConditions';

/** Nombre écrit en toutes lettres dans la consigne de la galerie (« les six prestations »). */
const NUMBER_WORDS = [
  'zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six',
  'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
];

/**
 * Une prestation, sous forme de fiche.
 *
 * Parti pris : pas de bandeau ni de pastilles colorées, qui alourdissaient
 * la série de six. La couleur du logo n'apparaît qu'à trois endroits, du
 * plus petit au plus lisible — l'icône, un filet sous le titre, la ligne des
 * destinations — et c'est le seul repère de couleur. Tout le reste tient sur
 * la hiérarchie typographique et une ombre discrète.
 *
 * Tout le texte du client est visible : rien n'est replié, donc rien
 * n'échappe au HTML pré-rendu ni aux moteurs de recherche.
 *
 * Un seul élément focalisable, le bouton des conditions d'admissibilité
 * (absent si la prestation n'en a pas). Une fois la galerie épinglée, le
 * navigateur ne sait pas ramener à l'écran un bouton parti sur la droite :
 * `onFocus` s'en charge (voir revealCard dans Services). L'appel à l'action
 * de la section reste unique, placé avec le titre.
 *
 * Attention à la liste de `transition-[…]` : Tailwind 4 applique
 * `hover:-translate-y-1.5` par la propriété indépendante `translate`, que
 * `transition-property: transform` ne couvre pas. Y nommer `transform` fait
 * sauter la carte au lieu de la faire monter.
 */
/*
  Un format de fiche par présentation de la galerie (voir Services).

  - `off` (galerie au doigt) : largeur fixe, la fiche suivante dépasse.
  - `wide` (grand écran épinglé) : deux fiches exactement remplissent la
    fenêtre de la galerie. 100cqw est la largeur de cette fenêtre (déclarée
    `@container`), pas celle de l'écran, dont la colonne de titre prend la
    gauche ; 1.5rem = l'écart `gap-6` de la piste.
  - `narrow` (mobile épinglé) : à sa hauteur naturelle (étirée sur tout
    l'écran, elle se remplissait de blanc). Au téléphone, une fiche pleine
    largeur, avec des textes qui suivent un peu la hauteur d'écran (svh),
    bornés : jamais sous 16 px, et plafonnés pour que titre, compteur et
    fiche tiennent ensemble à l'écran. À partir de sm, deux fiches : 4.5rem =
    les deux retraits de 1.5rem de la piste et son écart `sm:gap-6`. Ces
    valeurs sont celles de .services-track-narrow dans index.css (30rem,
    1rem, 1.5rem).
*/
const CARD_STYLE = {
  off: {
    card: 'w-[17.5rem] gap-4 p-6 sm:w-[19.5rem] lg:w-[22rem] lg:p-7',
    title: 'text-xl',
    tagline: 'text-base lg:text-[0.9375rem]',
    text: 'text-base leading-relaxed lg:text-[0.9375rem] lg:leading-[1.7]',
  },
  wide: {
    card: 'w-[calc((100cqw-1.5rem)/2)] gap-4 p-7 xl:p-8',
    title: 'text-xl xl:text-2xl',
    tagline: 'text-[0.9375rem] xl:text-base',
    text: 'text-[0.9375rem] leading-[1.7] xl:text-base',
  },
  narrow: {
    card: 'w-[min(calc(100cqw-2rem),30rem)] gap-4 px-6 py-7 sm:w-[calc((100cqw-4.5rem)/2)] sm:p-7',
    title: 'text-[clamp(1.25rem,2.8svh,1.5rem)]',
    tagline: 'text-[clamp(1rem,1.9svh,1.0625rem)]',
    text: 'text-[clamp(1rem,1.9svh,1.0625rem)] leading-relaxed',
  },
} satisfies Record<PinMode, Record<string, string>>;

function ServiceCard({
  service,
  index,
  format,
  onConditions,
  onFocus,
}: {
  service: Service;
  index: number;
  format: PinMode;
  /** Ouvre la fenêtre des conditions ; absent si la prestation n'en a pas. */
  onConditions?: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
}) {
  const colors = brand[service.color];
  const style = CARD_STYLE[format];
  const hasDestinations = service.destinations.length > 0;

  return (
    <article
      id={service.slug}
      onFocus={onFocus}
      className={`group flex h-full shrink-0 snap-start scroll-mt-28 flex-col rounded-panel border border-surface-container bg-white shadow-ambient transition-[translate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-surface-container-high hover:shadow-lifted ${style.card}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.soft} ${colors.text}`}
        >
          <Icon name={service.icon} size={24} />
        </span>

        {/* Numérotation : elle situe dans la série sans peser. */}
        <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-on-surface-variant">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className={`font-extrabold leading-tight tracking-tight text-primary ${style.title}`}>
          {service.title}
        </h3>

        {/*
          Le filet s'allonge au survol : le seul mouvement de la carte.
          Mis à l'échelle plutôt qu'élargi — animer une largeur force un
          recalcul de mise en page à chaque image, une transformation non.
        */}
        <span
          aria-hidden="true"
          className={`h-0.5 w-16 origin-left scale-x-[0.5625] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 ${colors.solid}`}
        />

        <p className={`font-semibold leading-snug text-on-surface ${style.tagline}`}>
          {service.tagline}
        </p>
      </div>

      {/*
        16 px sur mobile — en deçà, iOS agrandit de lui-même au premier
        appui. 15 px à partir de lg, avec un interlignage plus généreux :
        la fiche doit tenir dans un écran épinglé peu haut.
      */}
      <p className={`text-on-surface-variant ${style.text}`}>
        {service.description}
      </p>

      {(hasDestinations || onConditions) && (
        <div className="mt-auto flex flex-col gap-4 border-t border-surface-container pt-4">
          {hasDestinations && (
            <ul className="flex flex-wrap items-center" aria-label={`Destinations : ${service.title}`}>
              {service.destinations.map((destination, position) => (
                <li
                  key={destination}
                  className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}
                >
                  {position > 0 && (
                    <span aria-hidden="true" className="px-2 text-on-surface-variant/40">
                      ·
                    </span>
                  )}
                  {destination}
                </li>
              ))}
            </ul>
          )}

          {onConditions && (
            <button
              type="button"
              onClick={onConditions}
              aria-haspopup="dialog"
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 text-left text-sm font-semibold text-primary transition-colors hover:bg-surface-container"
            >
              <span>
                Conditions d'admissibilité
                <span className="sr-only"> : {service.title}</span>
              </span>
              <Icon name="chevron_right" size={20} className="shrink-0 text-secondary" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Les prestations de la section « Prestations » du panel (à l'origine, les
 * cinq de docs/Services_Assistanat_Visa.pdf et le contrat de travail au
 * Canada), seuls services présentés sur le site. Chacune porte une couleur
 * du logo, reprise dans les témoignages et le pied de page.
 *
 * Trois présentations pour une seule liste de fiches (voir
 * lib/useHorizontalPin.ts) :
 *
 * - `off` (sans JavaScript, animations réduites, écran trop bas) : le titre
 *   au-dessus, puis une galerie qui se fait défiler au doigt ;
 * - `wide` (grand écran) : la section s'épingle, le titre tient la colonne
 *   de gauche et deux fiches lui font face, poussées par le défilement
 *   vertical ;
 * - `narrow` (mobile et tablette) : même mécanique, mais le titre reste
 *   au-dessus ; une fiche pleine largeur au téléphone, deux sur tablette.
 *
 * Épinglée, la galerie avance d'une fiche à la fois : des repères invisibles
 * aimantent le défilement sur chaque cran.
 *
 * C'est la première qui est pré-rendue : le contenu est lisible et navigable
 * même si le script ne s'exécute jamais.
 *
 * Pas d'apparition `reveal` dans les versions épinglées : elles n'existent
 * pas encore quand useScrollReveal recense les éléments à observer, et
 * resteraient donc invisibles.
 */
export default function Services() {
  const { services: section } = useContent();
  const services = section.items;

  const {
    rootRef,
    pinRef,
    viewportRef,
    trackRef,
    mode,
    pinned,
    height,
    step,
    stops,
    visible,
    stickyTop,
    activeIndex,
    entered,
    scrollToCard,
  } = useHorizontalPin(services.length);

  // Prestation dont la fenêtre des conditions est ouverte.
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  /*
    Le bouton d'une fiche épinglée hors de l'écran reçoit le focus au
    clavier : on fait avancer la galerie jusqu'à elle. Le navigateur a pu
    faire défiler la fenêtre de la galerie pour montrer le bouton, alors que
    la piste ne se déplace que par transformation : on annule ce défilement.
    Rien au clic (`:focus-visible`), ni pour une fiche déjà entière à
    l'écran : le focus rendu au bouton à la fermeture ne déplace rien.

    À l'image suivante seulement : le navigateur fait défiler vers l'élément
    juste après l'événement `focus`, ce qui annulait le défilement doux de
    scrollToCard.
  */
  const revealCard = (event: FocusEvent<HTMLElement>, slug: string) => {
    const viewport = viewportRef.current;
    const card = event.currentTarget;

    if (!pinned || !viewport || !(event.target as HTMLElement).matches(':focus-visible')) return;

    requestAnimationFrame(() => {
      viewport.scrollLeft = 0;

      const box = card.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();

      if (box.left < view.left - 1 || box.right > view.right + 1) scrollToCard(slug);
    });
  };

  // Le pied de page pointe vers chaque prestation (#visa-etudiant…). Une fois
  // la galerie épinglée, l'ancre native ne suffit plus : on la rattrape.
  useEffect(() => {
    if (!pinned) return;

    const follow = () => {
      const id = window.location.hash.slice(1);
      if (id) scrollToCard(id);
    };

    follow();
    window.addEventListener('hashchange', follow);

    return () => window.removeEventListener('hashchange', follow);
  }, [pinned, scrollToCard]);

  const title = section.title;

  const intro = (
    <p className="text-base leading-relaxed text-on-surface-variant">{section.intro}</p>
  );

  const cta = (
    <a
      href="#contact"
      className="mt-1 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
    >
      <span>Démarrer ma procédure</span>
      <Icon name="arrow_forward" size={18} className="arrow-nudge" />
    </a>
  );

  const heading = (
    <>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
        {title}
      </h2>
      {intro}
      {cta}
    </>
  );

  /*
    Avancement dans la série. La largeur de la barre est pilotée par la
    variable CSS --progress, écrite hors de React pour ne pas provoquer un
    rendu à chaque image.
  */
  const rank = (index: number) => String(index + 1).padStart(2, '0');

  const progress = (
    <div aria-hidden="true" className="flex w-full items-center gap-4">
      {/*
        Les rangs à l'écran en gras (« 01 – 02 » quand deux fiches sont
        visibles), le total en graisse normale : la hiérarchie passe par la
        graisse, pas par une couleur pâlie qui tombait sous le contraste
        lisible (1,85).
      */}
      <span className="whitespace-nowrap text-xs font-bold tabular-nums tracking-[0.2em] text-primary">
        {rank(activeIndex)}
        {visible > 1 && ` – ${rank(activeIndex + visible - 1)}`}
        <span className="font-normal text-on-surface-variant">
          {' / '}
          {String(services.length).padStart(2, '0')}
        </span>
      </span>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <span className="services-progress block h-full rounded-full bg-secondary" />
      </span>
    </div>
  );

  /*
    Entrée en cascade à l'arrivée de la section, 50 ms d'écart par fiche.
    L'animation est portée par le <li> et non par la fiche, qui a déjà ses
    propres transitions de survol : c'est la règle d'enveloppement suivie
    partout ailleurs pour `reveal`. Elle évite d'empiler une animation
    remplie (`both`) et une transition sur le même élément.

    Même jeton d'animation que la bannière, pour que la page garde un seul
    rythme. Sous réduction des animations, la règle globale d'index.css
    ramène la durée à 0,01 ms : l'entrée devient instantanée.
  */
  const cards = services.map((service, index) => (
    <li
      key={service.slug}
      className={entered ? 'flex animate-rise' : 'flex'}
      style={entered ? { animationDelay: `${index * 50}ms` } : undefined}
    >
      <ServiceCard
        service={service}
        index={index}
        format={mode}
        onConditions={hasConditions(service) ? () => setOpenSlug(service.slug) : undefined}
        onFocus={(event) => revealCard(event, service.slug)}
      />
    </li>
  ));

  return (
    <section ref={rootRef} id="services" className="bg-surface-container-low">
      {/*
        Galerie au doigt : titre au-dessus, centré tant qu'il est seul sur sa
        ligne. Épinglée, le titre vit dans l'écran épinglé (colonne de gauche
        sur grand écran, au-dessus de la fiche sur mobile).
      */}
      {mode === 'off' && (
        <Container className="pt-14 sm:pt-24">
          <div className="reveal mx-auto flex max-w-2xl flex-col items-center gap-5 text-center lg:mx-0 lg:items-start lg:text-left">
            {heading}

            {/*
              Une galerie qui se fait glisser doit le dire : le débord de la
              fiche suivante ne suffit pas comme indice.
            */}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant">
              <Icon name="chevron_right" size={18} className="text-secondary" />
              {services.length > 1
                ? `Glissez pour parcourir les ${NUMBER_WORDS[services.length] ?? services.length} prestations`
                : 'Notre prestation'}
            </p>
          </div>
        </Container>
      )}

      {/*
        Mobile épinglé sur un écran de moins de 800 px de haut : le titre ne
        tient pas avec la fiche dans l'écran épinglé, il passe donc juste
        avant. Un seul des deux titres est affiché à la fois (`tall:`).
      */}
      {mode === 'narrow' && (
        <Container className="pt-10 sm:pt-16 tall:hidden">
          <h2 className="mx-auto max-w-md text-center text-2xl font-extrabold leading-tight tracking-tight text-primary">
            {title}
          </h2>
        </Container>
      )}

      {/*
        La hauteur n'est posée qu'une fois mesurée : tant qu'elle vaut 0, le
        bloc garde sa hauteur naturelle (celle de la galerie) plutôt que de
        s'aplatir.
      */}
      <div ref={pinRef} className="relative" style={pinned && height > 0 ? { height } : undefined}>
        {/*
          Repères d'aimantage : un par position d'arrêt, espacés du
          défilement qui fait avancer d'une fiche. Décalés de 8rem, soit le
          scroll-padding-top de la page (index.css), sans quoi l'aimantage
          s'arrêterait 8rem trop tôt, et remontés de `stickyTop` : sur mobile,
          l'épinglage commence quand le bloc arrive sous l'en-tête, pas en
          haut de l'écran.
        */}
        {pinned &&
          step > 0 &&
          Array.from({ length: stops }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 h-px w-px snap-start"
              style={{ top: `calc(${index * step - stickyTop}px + 8rem)` }}
            />
          ))}

        {mode === 'wide' && (
          <div className="sticky top-0 h-dvh overflow-hidden pt-20">
            {/*
              Le retrait à gauche aligne le titre sur le reste de la page ;
              à droite, rien ne referme la rangée, pour que les fiches
              sortent par le bord de l'écran.
            */}
            <div className="services-inset flex h-full w-full items-center gap-10 xl:gap-14">
              <div className="flex w-[21rem] shrink-0 flex-col items-start gap-5 xl:w-[24rem]">
                {heading}
                <div className="mt-4 w-full">{progress}</div>
              </div>

              {/*
                Pas de fondu sur le bord droit : deux fiches entières
                remplissent la fenêtre, il couvrirait du texte de la seconde.
                Le compteur et sa barre disent ce qu'il reste.
              */}
              <div
                ref={viewportRef}
                role="region"
                aria-label="Nos prestations visa"
                className="@container min-w-0 flex-1 overflow-hidden"
              >
                <ul
                  ref={trackRef}
                  className="relative flex w-max items-stretch gap-6 py-6 will-change-transform"
                >
                  {cards}
                </ul>
              </div>
            </div>
          </div>
        )}

        {mode === 'narrow' && (
          /*
            Collé juste sous l'en-tête (72 px, 80 à partir de sm), haut de
            tout le reste de l'écran (svh : stable quand la barre d'adresse du
            mobile se replie). Le hook lit ce `top` pour caler l'épinglage.

            Comme sur grand écran, l'écran épinglé porte le titre de la
            section avec la fiche : c'est lui qui occupe la hauteur, plutôt
            qu'une fiche étirée et à moitié vide. Titre, compteur et fiche
            forment un bloc centré ; shrink-0 pour qu'aucun ne se tasse, et
            que le hook voie un débordement s'il y en a un.

            Sous sm (téléphone), le bloc n'occupe que la hauteur de son
            contenu, plafonnée à l'écran : centré dans tout l'écran, il
            laissait un grand blanc au-dessus du titre et après la fiche.
            L'accroche qui conclut la section suit donc la fiche de près.
          */
          <div className="sticky top-[72px] flex max-h-[calc(100svh-72px)] flex-col justify-center gap-4 max-sm:pb-2 max-sm:pt-5 sm:top-20 sm:h-[calc(100svh-5rem)] sm:max-h-none sm:gap-6">
            <div className="mx-auto flex w-full max-w-[30rem] shrink-0 flex-col gap-3 px-4 text-center">
              <h2 className="hidden text-[clamp(1.375rem,3svh,1.75rem)] font-extrabold leading-tight tracking-tight text-primary max-sm:pt-5 sm:text-4xl tall:block">
                {title}
              </h2>
              {progress}
            </div>

            <div
              ref={viewportRef}
              role="region"
              aria-label="Nos prestations visa"
              className="@container shrink-0 overflow-hidden"
            >
              <ul
                ref={trackRef}
                // Au téléphone, items-center : la fiche seule garde sa
                // hauteur, sans blanc ajouté pour s'aligner sur la plus haute.
                // Deux côte à côte (sm) doivent en revanche s'aligner.
                className="services-track-narrow relative flex w-max items-center gap-4 py-2 will-change-transform sm:items-stretch sm:gap-6"
              >
                {cards}
              </ul>
            </div>
          </div>
        )}

        {mode === 'off' && (
          <div
            className="services-scroller overflow-x-auto overscroll-x-contain"
            // Les fiches sans conditions n'ont rien de focalisable : la zone
            // défilante doit être atteignable au clavier pour rester
            // utilisable aux flèches.
            tabIndex={0}
            role="region"
            aria-label="Nos prestations visa"
          >
            <ul className="services-track relative flex w-max snap-x snap-mandatory items-stretch gap-5 py-10">
              {cards}
            </ul>
          </div>
        )}
      </div>

      {/*
        Mobile épinglé : l'accroche et le bouton, qui n'ont pas leur place
        dans l'écran épinglé, concluent la section une fois la dernière
        fiche passée.
      */}
      {mode === 'narrow' && (
        <Container className="pb-14 pt-6 sm:pb-24">
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
            {intro}
            {cta}
          </div>
        </Container>
      )}

      {/* Bas de section : en mode épinglé, l'écran entier fait déjà la marge. */}
      {mode === 'off' && <div className="h-6 sm:h-20" />}

      {services.filter(hasConditions).map((service) => (
        <ServiceConditions
          key={service.slug}
          service={service}
          note={section.conditionsNote}
          open={openSlug === service.slug}
          onClose={() => setOpenSlug(null)}
        />
      ))}
    </section>
  );
}

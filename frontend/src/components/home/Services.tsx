import { useEffect } from 'react';
import Icon from '../ui/Icon';
import { Container } from '../ui/Section';
import { brand } from '../ui/brand';
import { useHorizontalPin } from '../../lib/useHorizontalPin';
import { services, type Service } from '../../data/services';

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
 * Aucun élément focalisable à l'intérieur, volontairement : une fois la
 * galerie épinglée, le navigateur ne sait pas ramener à l'écran un lien parti
 * sur la droite. La section a un seul appel à l'action, placé avec le titre.
 *
 * Attention à la liste de `transition-[…]` : Tailwind 4 applique
 * `hover:-translate-y-1.5` par la propriété indépendante `translate`, que
 * `transition-property: transform` ne couvre pas. Y nommer `transform` fait
 * sauter la carte au lieu de la faire monter.
 */
/*
  Deux formats de fiche.

  - `gallery` : galerie au doigt et grand écran épinglé.
  - `full` (mobile épinglé) : la fiche occupe toute la largeur, à sa hauteur
    naturelle (étirée sur tout l'écran, elle se remplissait de blanc). Marges
    intérieures plus larges que dans la galerie, et textes qui suivent un peu
    la hauteur d'écran (svh), bornés : jamais sous 16 px, et plafonnés pour
    que titre, compteur et fiche tiennent ensemble à l'écran. Largeur : mêmes
    valeurs que .services-track-narrow dans index.css (30rem, 1rem).
*/
const CARD_STYLE = {
  gallery: {
    card: 'w-[17.5rem] gap-4 p-6 sm:w-[19.5rem] lg:w-[22rem] lg:p-7',
    title: 'text-xl',
    tagline: 'text-base lg:text-[0.9375rem]',
    text: 'text-base leading-relaxed lg:text-[0.9375rem] lg:leading-[1.7]',
  },
  full: {
    card: 'w-[min(calc(100vw-2rem),30rem)] gap-4 px-6 py-7 sm:gap-5 sm:p-10',
    title: 'text-[clamp(1.25rem,2.8svh,1.5rem)] sm:text-[1.75rem]',
    tagline: 'text-[clamp(1rem,1.9svh,1.0625rem)] sm:text-lg',
    text: 'text-[clamp(1rem,1.9svh,1.0625rem)] leading-relaxed sm:text-lg',
  },
};

function ServiceCard({
  service,
  index,
  format,
}: {
  service: Service;
  index: number;
  format: keyof typeof CARD_STYLE;
}) {
  const colors = brand[service.color];
  const style = CARD_STYLE[format];

  return (
    <article
      id={service.slug}
      className={`group flex h-full shrink-0 snap-start scroll-mt-28 flex-col rounded-panel border border-surface-container bg-white shadow-ambient transition-[translate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-surface-container-high hover:shadow-lifted ${style.card}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.soft} ${colors.text}`}
        >
          <Icon name={service.icon} size={24} />
        </span>

        {/* Numérotation : elle situe dans la série sans peser. */}
        <span className="text-xs font-bold tabular-nums tracking-[0.2em] text-on-surface-variant/50">
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

      {service.destinations && (
        <ul
          className="mt-auto flex flex-wrap items-center border-t border-surface-container pt-4"
          aria-label={`Destinations : ${service.title}`}
        >
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
    </article>
  );
}

/**
 * Les six prestations de data/services.ts (les cinq de
 * docs/Services_Assistanat_Visa.pdf et le contrat de travail au Canada),
 * seuls services présentés sur le site. Chacune porte une couleur du logo,
 * reprise dans les témoignages et le pied de page.
 *
 * Trois présentations pour une seule liste de fiches (voir
 * lib/useHorizontalPin.ts) :
 *
 * - `off` (sans JavaScript, animations réduites, écran trop bas) : le titre
 *   au-dessus, puis une galerie qui se fait défiler au doigt ;
 * - `wide` (grand écran) : la section s'épingle, le titre tient la colonne
 *   de gauche et les fiches défilent en face de lui, poussées par le
 *   défilement vertical ;
 * - `narrow` (mobile et tablette) : même mécanique, mais le titre reste
 *   au-dessus, hors de la partie épinglée, et chaque fiche occupe toute la
 *   largeur. Des repères invisibles aimantent le défilement sur chaque fiche.
 *
 * C'est la première qui est pré-rendue : le contenu est lisible et navigable
 * même si le script ne s'exécute jamais.
 *
 * Pas d'apparition `reveal` dans les versions épinglées : elles n'existent
 * pas encore quand useScrollReveal recense les éléments à observer, et
 * resteraient donc invisibles.
 */
export default function Services() {
  const {
    rootRef,
    pinRef,
    viewportRef,
    trackRef,
    mode,
    pinned,
    height,
    step,
    stickyTop,
    activeIndex,
    entered,
    scrollToCard,
  } = useHorizontalPin(services.length);

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

  const title = 'Six procédures, un même accompagnement.';

  const intro = (
    <p className="text-base leading-relaxed text-on-surface-variant">
      Quel que soit votre projet, nous montons votre dossier avec rigueur et vous préparons à
      chaque étape, jusqu'à la réponse du consulat.
    </p>
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
  const progress = (
    <div aria-hidden="true" className="flex w-full items-center gap-4">
      <span className="text-xs font-bold tabular-nums tracking-[0.2em] text-on-surface-variant">
        {String(activeIndex + 1).padStart(2, '0')}
        <span className="text-on-surface-variant/40">
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
        format={mode === 'narrow' ? 'full' : 'gallery'}
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
              Glissez pour parcourir les six prestations
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
          Repères d'aimantage (mobile épinglé) : un par fiche, espacés du
          défilement qui fait passer à la suivante. Décalés de 8rem, soit le
          scroll-padding-top de la page (index.css), sans quoi l'aimantage
          s'arrêterait 8rem trop tôt, et remontés de `stickyTop` : l'épinglage
          commence quand le bloc arrive sous l'en-tête, pas en haut de l'écran.
        */}
        {mode === 'narrow' &&
          step > 0 &&
          services.map((service, index) => (
            <span
              key={service.slug}
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
                Le fondu du bord droit annonce qu'il reste des fiches. Il
                s'efface à mesure qu'on avance (voir .services-viewport dans
                index.css) : arrivé au bout, la dernière fiche est nette.
              */}
              <div
                ref={viewportRef}
                role="region"
                aria-label="Nos prestations visa"
                className="services-viewport min-w-0 flex-1 overflow-hidden"
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
              className="shrink-0 overflow-hidden"
            >
              <ul
                ref={trackRef}
                // items-center et non items-stretch : chaque fiche garde sa
                // hauteur, sans blanc ajouté pour s'aligner sur la plus haute.
                className="services-track-narrow relative flex w-max items-center gap-4 py-2 will-change-transform"
              >
                {cards}
              </ul>
            </div>
          </div>
        )}

        {mode === 'off' && (
          <div
            className="services-scroller overflow-x-auto overscroll-x-contain"
            // Sans élément focalisable à l'intérieur, une zone défilante doit
            // être atteignable au clavier pour rester utilisable aux flèches.
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
    </section>
  );
}

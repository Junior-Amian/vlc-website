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
 * la série de cinq. La couleur du logo n'apparaît qu'à trois endroits, du
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
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const colors = brand[service.color];

  return (
    <article
      id={service.slug}
      className="group flex h-full w-[17.5rem] shrink-0 snap-start scroll-mt-28 flex-col gap-4 rounded-panel border border-surface-container bg-white p-6 shadow-ambient transition-[translate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-surface-container-high hover:shadow-lifted sm:w-[19.5rem] lg:w-[22rem] lg:p-7"
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
        <h3 className="text-xl font-extrabold leading-tight tracking-tight text-primary">
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

        <p className="text-base font-semibold leading-snug text-on-surface lg:text-[0.9375rem]">
          {service.tagline}
        </p>
      </div>

      {/*
        16 px sur mobile — en deçà, iOS agrandit de lui-même au premier
        appui. 15 px à partir de lg, avec un interlignage plus généreux :
        la fiche doit tenir dans un écran épinglé peu haut.
      */}
      <p className="text-base leading-relaxed text-on-surface-variant lg:text-[0.9375rem] lg:leading-[1.7]">
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
 * Les cinq prestations de docs/Services_Assistanat_Visa.pdf, seuls services
 * présentés sur le site. Chacune porte une couleur du logo, reprise dans les
 * témoignages et le pied de page.
 *
 * Deux présentations pour une seule liste de fiches :
 *
 * - par défaut (mobile, sans JavaScript, animations réduites) : le titre au-
 *   dessus, puis une galerie qui se fait défiler au doigt, carte par carte ;
 * - sur grand écran : la section s'épingle, le titre tient la colonne de
 *   gauche et les fiches défilent en face de lui, poussées par le défilement
 *   vertical (voir lib/useHorizontalPin.ts).
 *
 * C'est la première qui est pré-rendue : le contenu est lisible et navigable
 * même si le script ne s'exécute jamais.
 *
 * Pas d'apparition `reveal` sur la version épinglée : elle n'existe pas
 * encore quand useScrollReveal recense les éléments à observer, et resterait
 * donc invisible.
 */
export default function Services() {
  const {
    rootRef,
    pinRef,
    viewportRef,
    trackRef,
    pinned,
    height,
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

  const heading = (
    <>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
        Cinq visas, un même accompagnement.
      </h2>
      <p className="text-base leading-relaxed text-on-surface-variant">
        Quel que soit votre projet, nous montons votre dossier avec rigueur et vous préparons à
        chaque étape, jusqu'à la réponse du consulat.
      </p>
      <a
        href="#contact"
        className="mt-1 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
      >
        <span>Démarrer ma procédure</span>
        <Icon name="arrow_forward" size={18} className="arrow-nudge" />
      </a>
    </>
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
      <ServiceCard service={service} index={index} />
    </li>
  ));

  return (
    <section ref={rootRef} id="services" className="bg-surface-container-low">
      {/* Titre au-dessus : uniquement quand la galerie n'est pas épinglée. */}
      {!pinned && (
        <Container className="pt-20 sm:pt-24">
          <div className="reveal flex max-w-2xl flex-col items-start gap-5">
            {heading}

            {/*
              Une galerie qui se fait glisser doit le dire : le débord de la
              fiche suivante ne suffit pas comme indice. Masquée sur grand
              écran, où la barre d'avancement joue ce rôle.
            */}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant">
              <Icon name="chevron_right" size={18} className="text-secondary" />
              Glissez pour parcourir les cinq prestations
            </p>
          </div>
        </Container>
      )}

      {/*
        La hauteur n'est posée qu'une fois mesurée : tant qu'elle vaut 0, le
        bloc garde sa hauteur naturelle (celle de la galerie) plutôt que de
        s'aplatir.
      */}
      <div ref={pinRef} className="relative" style={pinned && height > 0 ? { height } : undefined}>
        {pinned ? (
          <div className="sticky top-0 h-dvh overflow-hidden pt-20">
            {/*
              Le retrait à gauche aligne le titre sur le reste de la page ;
              à droite, rien ne referme la rangée, pour que les fiches
              sortent par le bord de l'écran.
            */}
            <div className="services-inset flex h-full w-full items-center gap-10 xl:gap-14">
              <div className="flex w-[21rem] shrink-0 flex-col items-start gap-5 xl:w-[24rem]">
                {heading}

                {/*
                  Avancement dans la série. La largeur de la barre est
                  pilotée par la variable CSS --progress, écrite hors de
                  React pour ne pas provoquer un rendu à chaque image.
                */}
                <div aria-hidden="true" className="mt-4 flex w-full items-center gap-4">
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
        ) : (
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

      {/* Bas de section : en mode épinglé, l'écran entier fait déjà la marge. */}
      {!pinned && <div className="h-16 sm:h-20" />}
    </section>
  );
}

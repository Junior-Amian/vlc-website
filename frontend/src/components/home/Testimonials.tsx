import type { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import Section from '../ui/Section';
import { brand } from '../ui/brand';
import { testimonials, type Testimonial } from '../../data/testimonials';
import { findService } from '../../data/services';

/*
  Sur grand écran, les cartes sont posées « sur la table » : légère
  inclinaison et décalage vertical différents pour chacune, qui cassent la
  rangée de trois cartes identiques. Elles se redressent au survol. Sous
  1024px, tout est à plat, en carrousel.
*/
const TILT = ['lg:-rotate-2', 'lg:translate-y-10 lg:rotate-1', 'lg:translate-y-3 lg:-rotate-1'];

/*
  TODO photo : photo du client (carrée, au moins 200 × 200 px), avec son
  accord écrit. Remplacer ce bloc par une <img loading="lazy"> ronde.
*/
function PassengerPhoto() {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary/40"
    >
      <Icon name="photo_camera" size={20} />
    </span>
  );
}

function Airport({ code, city, align }: { code: string; city: string; align: 'left' | 'right' }) {
  return (
    <span className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="text-3xl font-extrabold leading-none tracking-tight text-white">{code}</span>
      <span className="mt-1.5 text-xs text-slate-300">{city}</span>
    </span>
  );
}

/** Un témoignage présenté comme une carte d'embarquement Abidjan → destination. */
function BoardingPass({
  testimonial,
  tilt,
  index,
}: {
  testimonial: Testimonial;
  tilt: string;
  index: number;
}) {
  const service = findService(testimonial.service);
  const colors = brand[service?.color ?? 'green'];
  const { from, to } = testimonial;

  return (
    /*
      L'enveloppe porte l'apparition en cascade (--i) et la largeur dans le
      carrousel ; la carte garde ses propres transitions (inclinaison,
      survol), qui écraseraient sinon celles de l'apparition.
    */
    <div
      style={{ '--i': index } as CSSProperties}
      className="reveal w-[85%] max-w-sm shrink-0 snap-center sm:w-[60%] lg:w-auto lg:max-w-none"
    >
      <figure
        className={`overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-surface-container transition-[rotate,translate,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hover:-translate-y-2 lg:hover:rotate-0 ${tilt}`}
      >
        {/* Talon supérieur : le trajet. Le liseré reprend la couleur de la prestation. */}
        <div className="relative bg-primary px-6 pb-7 pt-5">
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${colors.solid}`} />

          <p className="mb-5 flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-white">VISILION</span>
            <span>Carte d'embarquement</span>
          </p>

          <p className="sr-only">
            Trajet : {from.city} vers {to.city}.
          </p>
          <div aria-hidden="true" className="flex items-end justify-between gap-3">
            <Airport code={from.code} city={from.city} align="left" />

            <span className="mb-6 flex flex-1 items-center gap-1.5 text-secondary-container">
              <span className="h-px flex-1 border-t border-dashed border-white/30" />
              <Icon name="flight" size={20} className="rotate-90" />
              <span className="h-px flex-1 border-t border-dashed border-white/30" />
            </span>

            <Airport code={to.code} city={to.city} align="right" />
          </div>
        </div>

        {/* Perforation : pointillés et deux encoches découpées dans les bords. */}
        <div aria-hidden="true" className="relative">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white ring-1 ring-surface-container" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-white ring-1 ring-surface-container" />
          <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-surface-container-high" />
        </div>

        {/* Talon inférieur : le récit du passager. */}
        <div className="flex flex-col gap-6 px-6 pb-6 pt-7">
          <blockquote className="text-base leading-relaxed text-on-surface">
            « {testimonial.quote} »
          </blockquote>

          <figcaption className="flex items-center justify-between gap-3 border-t border-surface-container pt-5">
            <span className="flex min-w-0 items-center gap-3">
              <PassengerPhoto />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-on-surface-variant">Passager</span>
                <span className="truncate text-sm font-bold text-primary">{testimonial.name}</span>
              </span>
            </span>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${colors.soft} ${colors.text}`}
            >
              {service?.title}
            </span>
          </figcaption>
        </div>
      </figure>
    </div>
  );
}

/**
 * Témoignages présentés comme des cartes d'embarquement : chaque client est
 * un passager parti d'Abidjan vers sa destination. Le motif reprend le nom
 * et la couleur de la prestation concernée (voir data/services.ts).
 */
export default function Testimonials() {
  return (
    <Section id="temoignages" className="overflow-hidden bg-white">
      <div className="reveal mx-auto mb-12 max-w-3xl text-center lg:mb-16">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
          Ils ont franchi les frontières avec nous.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
          Chaque visa obtenu est un voyage qui commence. Voici quelques-uns de ces départs.
        </p>
      </div>

      {/*
        Mobile et tablette : carrousel à faire glisser, la carte suivante
        dépasse pour signaler qu'il y a une suite (les trois cartes empilées
        faisaient environ 1 400px de défilement). Les marges négatives
        laissent les cartes aller jusqu'au bord de l'écran. Grand écran :
        grille de trois. Les cartes apparaissent l'une après l'autre ; dans
        le carrousel, celles hors écran apparaissent quand on les fait glisser.
      */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-10 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {testimonials.map((testimonial, index) => (
          <BoardingPass
            key={testimonial.name}
            testimonial={testimonial}
            tilt={TILT[index % TILT.length]}
            index={index}
          />
        ))}
      </div>
    </Section>
  );
}

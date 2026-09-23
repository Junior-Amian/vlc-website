import type { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import Section from '../ui/Section';

const VALUES = [
  {
    icon: 'favorite',
    title: 'Écoute & bienveillance',
    text: 'Votre situation comprise en profondeur, sans préjugé.',
  },
  {
    icon: 'gavel',
    title: 'Rigueur',
    text: 'Chaque dossier conforme aux exigences consulaires.',
  },
  {
    icon: 'flight_land',
    title: "Suivi jusqu'à l'arrivée",
    text: "Présents du dépôt du dossier jusqu'à votre installation.",
  },
];

/**
 * Section « À propos », placée juste après la bannière : le couple fondateur
 * est le fil rouge de la page.
 *
 * Le texte est celui fourni par le client dans docs/CREATION DE SITE .pdf,
 * repris intégralement. L'identifiant #fondateurs est conservé pour ne pas
 * casser les liens du menu.
 */
export default function Founders() {
  return (
    <Section id="fondateurs" className="bg-white">
      <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-12 lg:gap-20">
        {/* Sur mobile, le récit passe avant la photo. */}
        <figure className="reveal order-last lg:order-first lg:col-span-5 lg:sticky lg:top-28">
          {/*
            TODO photo : portrait du couple fondateur (cadré en 3:4 sur grand écran,
            4:3 sur mobile : garder les visages au centre ; au moins
            900 × 1200 px), idéalement en situation de voyage ou avec un
            client. C'est la seule photo du couple sur la page.
            Remplacer ce bloc par une <img loading="lazy"> avec width/height.
          */}
          <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-surface-container lg:aspect-[3/4]">
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface-container-high to-surface-container-low px-8 text-center">
              <Icon name="photo_camera" size={44} className="text-primary/40" />
              <p className="max-w-[16rem] text-sm leading-relaxed text-on-surface-variant">
                Emplacement réservé au portrait de Marc-Peniel &amp; Marie-Paule
              </p>
            </div>
          </div>
        </figure>

        <div className="reveal flex flex-col gap-6 lg:col-span-7">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
            {/* nowrap : évite la coupure des prénoms composés sur leur trait d'union. */}
            Nous sommes <span className="whitespace-nowrap">Marc-Peniel</span> et{' '}
            <span className="whitespace-nowrap">Marie-Paule.</span>
          </h2>

          <p className="text-lg font-medium leading-relaxed text-on-surface sm:text-xl">
            Un couple uni par une même passion : ouvrir les portes du monde à ceux qui rêvent
            d'ailleurs.
          </p>

          <div className="flex max-w-[65ch] flex-col gap-4 text-base leading-relaxed text-on-surface-variant">
            <p>
              Notre complémentarité fait notre force. Chacun apporte son regard, son expertise et
              sa rigueur, et c'est cette union qui nous permet d'accompagner chaque client avec
              précision et humanité, dossier après dossier.
            </p>
            <p>
              Ensemble, nous avons fait le choix de transformer notre engagement en une mission :
              celle de guider chaque personne, chaque famille, chaque projet vers une nouvelle vie
              à l'étranger : visa étudiant, résidence permanente, visa visiteur, d'affaires ou
              sportif.
            </p>
            <p>
              Ce qui nous anime va au-delà du professionnel. C'est la conviction profonde que
              derrière chaque dossier se cache un rêve, et que ce rêve mérite d'être porté avec
              sérieux, écoute et bienveillance.
            </p>
          </div>

          <p className="border-l-4 border-secondary pl-5 text-lg font-semibold italic leading-relaxed text-primary">
            Aujourd'hui, c'est ensemble, en couple, que nous continuons de faire voyager les
            autres.
          </p>

          {/* Valeurs : une simple liste, pas des cartes, pour ne pas répéter la grille des services. */}
          <ul className="mt-4 grid grid-cols-1 gap-6 border-t border-surface-container pt-8 sm:grid-cols-3">
            {VALUES.map((value, index) => (
              <li
                key={value.title}
                className="reveal flex flex-col gap-2"
                style={{ '--i': index + 1 } as CSSProperties}
              >
                <Icon name={value.icon} size={26} className="text-secondary" />
                <h3 className="text-sm font-bold text-primary">{value.title}</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">{value.text}</p>
              </li>
            ))}
          </ul>

          <a
            href="#contact"
            className="mt-2 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
          >
            <span>Démarrer ma procédure</span>
            <Icon name="arrow_forward" size={18} className="arrow-nudge" />
          </a>
        </div>
      </div>
    </Section>
  );
}

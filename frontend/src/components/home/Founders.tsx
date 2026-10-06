import type { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import Section from '../ui/Section';
import { useContent } from '../../content/ContentProvider';
import { imageProps } from '../../content/media';
import type { MediaImage } from '../../content/types';

/*
  Portrait du couple fondateur, choisi dans le panel (cadré en 3:4 sur grand
  écran, 4:3 sur mobile : visages au centre). C'est la seule photo du couple
  sur la page. Il est rendu deux fois (voir Founders) : loading="lazy" fait
  que seul l'exemplaire affiché charge l'image. Sans photo choisie, un
  emplacement réservé la remplace.
*/
function Portrait({ image }: { image: MediaImage | null }) {
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-surface-container lg:aspect-[3/4]">
      {image ? (
        <img
          {...imageProps(image, 960)}
          sizes="(min-width: 1024px) 40vw, 100vw"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface-container-high to-surface-container-low px-8 text-center">
          <Icon name="photo_camera" size={44} className="text-primary/40" />
          <p className="max-w-[16rem] text-sm leading-relaxed text-on-surface-variant">
            Emplacement réservé au portrait de Marc-Peniel &amp; Marie-Paule
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Section « À propos », placée juste après la bannière : le couple fondateur
 * est le fil rouge de la page.
 *
 * Le texte d'origine est celui fourni par le client dans
 * docs/CREATION DE SITE .pdf ; il se modifie dans le panel. L'identifiant
 * #fondateurs est conservé pour ne pas casser les liens du menu.
 */
export default function Founders() {
  const { about } = useContent();

  return (
    <Section id="fondateurs" className="bg-white">
      <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-12 lg:gap-20">
        {/*
          Tablette : le récit passe avant la photo. Sur téléphone, la photo
          est rendue dans la colonne de texte, juste après l'accroche (voir
          plus bas), et cet exemplaire-ci est masqué.
        */}
        <figure className="reveal order-last hidden sm:block lg:order-first lg:col-span-5 lg:sticky lg:top-28">
          <Portrait image={about.portrait} />
        </figure>

        <div className="reveal flex flex-col gap-6 lg:col-span-7">
          {/*
            Titre et accroche centrés tant que la section tient sur une
            colonne ; le récit reste aligné à gauche, plus lisible sur la
            longueur.
          */}
          {/*
            Deux lignes : « Nous sommes », puis les deux prénoms ensemble, jamais
            séparés (le couple est le sujet de la section). La ligne des prénoms
            ne passe jamais à la ligne : sa taille suit la largeur de l'écran
            (vw) sous lg, pour tenir dès 320 px.
          */}
          <h2 className="flex flex-col items-center font-extrabold leading-tight tracking-tight text-primary lg:items-start">
            <span className="text-2xl sm:text-3xl lg:text-4xl">{about.titleLead}</span>
            <span className="whitespace-nowrap text-[clamp(1.25rem,6.2vw,2.25rem)] lg:text-[1.875rem] xl:text-4xl">
              {about.names}
            </span>
          </h2>

          <p className="text-center text-lg font-medium leading-relaxed text-on-surface sm:text-xl lg:text-left">
            {about.lead}
          </p>

          {/* Téléphone uniquement : la photo suit l'accroche (demande du client). */}
          <figure className="sm:hidden">
            <Portrait image={about.portrait} />
          </figure>

          {/* Masqué sur mobile (à la demande du client) : l'accroche et la citation suffisent. */}
          {about.paragraphs.length > 0 && (
            <div className="hidden max-w-[65ch] flex-col gap-4 text-base leading-relaxed text-on-surface-variant sm:flex">
              {about.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}

          <p className="border-l-4 border-secondary pl-5 text-lg font-semibold italic leading-relaxed text-primary">
            {about.quote}
          </p>

          {/*
            Valeurs : une simple liste, pas des cartes, pour ne pas répéter la
            grille des services. Masquées sur mobile (à la demande du client) :
            empilées, elles allongeaient la section sans rien apporter que le
            récit ne dise déjà.
          */}
          {about.values.length > 0 && (
            <ul className="mt-4 hidden gap-6 border-t border-surface-container pt-8 sm:grid sm:grid-cols-3">
              {about.values.map((value, index) => (
                <li
                  key={`${value.title}-${index}`}
                  className="reveal flex flex-col gap-2"
                  style={{ '--i': index + 1 } as CSSProperties}
                >
                  <Icon name={value.icon} size={26} className="text-secondary" />
                  <h3 className="text-sm font-bold text-primary">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{value.text}</p>
                </li>
              ))}
            </ul>
          )}

          <a
            href="#contact"
            className="mt-2 inline-flex w-fit items-center gap-2 self-center whitespace-nowrap rounded-xl bg-secondary lg:self-start px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
          >
            <span>Démarrer ma procédure</span>
            <Icon name="arrow_forward" size={18} className="arrow-nudge" />
          </a>
        </div>
      </div>
    </Section>
  );
}

import type { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import Section from '../ui/Section';
import { useContent } from '../../content/ContentProvider';

/*
  Les étapes et leurs délais viennent à l'origine du contrat de référent
  (docs/Contrat_Referent_CU.pdf) : lettre d'acceptation sous 3 jours
  ouvrables, frais de demande non remboursables, commission versée une fois
  le CAQ et le permis d'études obtenus — d'où ces deux documents comme
  étapes. `issuer` nomme qui délivre le document : c'est l'information
  que les familles demandent le plus souvent. Tout se modifie dans le panel.
*/

/** Rayon du texte circulaire du tampon, dans le repère 200 × 200 du SVG. */
const STAMP_TEXT_RADIUS = 79;

/**
 * Le délai de la lettre d'acceptation, présenté comme un tampon consulaire :
 * c'est l'argument le plus fort du partenariat, et le vocabulaire du métier
 * plutôt qu'un chiffre clé générique.
 *
 * L'anneau de texte est un chemin circulaire ; `textLength` répartit les
 * lettres sur toute la circonférence, quelle que soit la police chargée. Le
 * tampon est signé VISILION et ne porte pas le nom du collège : il ne doit
 * pas passer pour un sceau officiel de l'établissement.
 *
 * Il « frappe » à l'arrivée de la section (voir .stamp dans index.css) :
 * le seul mouvement propre à cette section.
 */
function AcceptanceStamp({ value, unit }: { value: string; unit: string }) {
  const r = STAMP_TEXT_RADIUS;

  return (
    <div className="reveal stamp relative aspect-square w-60 sm:w-72 md:w-64 lg:w-80">
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-brand-yellow"
      >
        <defs>
          <path id="stamp-ring" d={`M 100,100 m -${r},0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`} />
        </defs>
        <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text fill="currentColor" fontSize="10.5" fontWeight="700">
          <textPath
            href="#stamp-ring"
            textLength={Math.floor(2 * Math.PI * r)}
            lengthAdjust="spacing"
          >
            LETTRE D'ACCEPTATION · DÉLAI DE DÉLIVRANCE · RÉFÉRENT VISILION ·
          </textPath>
        </text>
      </svg>

      <p className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[5.5rem] font-extrabold leading-[0.85] tracking-tight text-white sm:text-8xl lg:text-[6.5rem]">
          {value}
        </span>
        <span className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-yellow sm:text-sm md:text-xs lg:text-sm">
          {unit}
        </span>
      </p>
    </div>
  );
}

/**
 * Partenariat avec le Collège Universel (Gatineau, Québec), dont VISILION
 * est référent pour le recrutement d'étudiants internationaux.
 *
 * Placée juste après les prestations, la section doit s'en détacher : fond
 * marine plein cadre (celui de la bannière et du tableau des départs) au
 * lieu du fond clair des fiches, et parcours à l'horizontale au lieu de la
 * colonne titre / contenu. Le liseré bleu du haut reprend la couleur du visa
 * étudiant, comme le liseré des cartes d'embarquement.
 *
 * Tout le contenu est tiré du contrat. Aucune promesse d'admission ni de
 * visa : le contrat interdit au référent d'engager le collège.
 *
 * TODO logo : le contrat exige une autorisation préalable du collège pour
 * utiliser son nom et son logo dans nos supports. Ajouter le logo à côté
 * du titre une fois l'autorisation écrite obtenue.
 */
export default function CollegePartner() {
  const { college } = useContent();

  return (
    <Section id="college-universel" className="relative overflow-hidden bg-primary text-white">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand-blue" />

      {/* Côte à côte dès la tablette : empilé, le tampon repoussait le parcours d'un écran. */}
      <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-12 md:gap-10 lg:gap-16">
        <div className="reveal flex flex-col items-center gap-6 text-center md:col-span-7 md:items-start md:text-left">
          {/* Les deux derniers mots (« Collège Universel. ») ne se séparent jamais. */}
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {college.title.replace(/ (\S+)$/, ' $1')}
          </h2>

          <p className="max-w-[40rem] text-lg leading-relaxed text-on-primary-soft">{college.intro}</p>

          <div className="flex flex-col items-center gap-2 text-sm text-on-primary-variant sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 md:justify-start">
            <p className="flex items-center gap-2.5">
              <Icon name="location_on" size={18} className="shrink-0 text-brand-yellow" />
              {college.address}
            </p>
            <a
              href={college.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-fit items-center gap-2.5 font-semibold text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-brand-yellow"
            >
              <Icon name="open_in_new" size={18} className="shrink-0 text-brand-yellow" />
              {college.urlLabel}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        </div>

        <figure className="flex flex-col items-center gap-6 md:col-span-5">
          <AcceptanceStamp value={college.stampValue} unit={college.stampUnit} />
          <figcaption className="max-w-xs text-center text-sm leading-relaxed text-on-primary-variant">
            <strong className="font-semibold text-white">{college.captionStrong}</strong>{' '}
            {college.captionText}
          </figcaption>
        </figure>
      </div>

      {/*
        Le parcours : liste verticale sur mobile, frise horizontale sur grand
        écran. Le trait de liaison part de chaque pastille vers la suivante ;
        la dernière étape n'en a pas.
      */}
      <ol
        aria-label="Votre parcours jusqu'à la rentrée"
        className="mt-16 grid grid-cols-1 border-t border-white/10 pt-12 lg:mt-20 lg:grid-cols-4 lg:gap-8 lg:pt-14"
      >
        {college.steps.map((step, index) => {
          const isHighlight = Boolean(step.delay);
          const isLast = index === college.steps.length - 1;

          return (
            <li
              key={`${step.title}-${index}`}
              className="reveal relative flex gap-5 pb-10 last:pb-0 lg:flex-col lg:pb-0"
              style={{ '--i': index } as CSSProperties}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[19px] top-12 w-0.5 bg-white/15 lg:-right-4 lg:bottom-auto lg:left-14 lg:top-[19px] lg:h-0.5 lg:w-auto"
                />
              )}

              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums ${
                  isHighlight
                    ? 'border-brand-yellow bg-brand-yellow text-primary'
                    : 'border-white/30 text-white'
                }`}
              >
                {index + 1}
              </span>

              <div className="flex flex-col gap-2.5 pt-1.5 lg:pt-0">
                <h3 className="text-lg font-extrabold leading-snug tracking-tight text-white">
                  <span className="sr-only">Étape {index + 1} : </span>
                  {step.title}
                </h3>

                {step.delay && (
                  <p className="text-sm font-bold text-brand-yellow">{step.delay}</p>
                )}

                <p className="max-w-[60ch] text-base leading-relaxed text-on-primary-variant lg:text-[0.9375rem]">
                  {step.text}
                </p>

                <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">
                  {step.issuer}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="reveal mt-16 flex flex-col gap-8 rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8 lg:mt-20 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-yellow">
            <Icon name="account_balance" size={22} />
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-bold leading-snug text-white">{college.feesTitle}</p>
            <p className="max-w-[60ch] text-sm leading-relaxed text-on-primary-variant">
              {college.feesText}
            </p>
          </div>
        </div>

        <a
          href="#contact"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-6 py-3.5 sm:w-fit text-sm font-semibold text-white shadow-lg shadow-black/30 transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
        >
          <span>{college.ctaLabel}</span>
          <Icon name="arrow_forward" size={18} className="arrow-nudge" />
        </a>
      </div>

      <p className="mx-auto mt-6 max-w-[70ch] text-center text-sm leading-relaxed text-on-primary-variant md:mx-0 md:text-left">
        {college.disclaimer}
      </p>
    </Section>
  );
}

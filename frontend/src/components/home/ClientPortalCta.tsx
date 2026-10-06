import Icon from '../ui/Icon';
import Section from '../ui/Section';
import { useContent } from '../../content/ContentProvider';

/*
  Annonce de l'espace client (phase 2).

  Les boutons de connexion de la maquette ont été remplacés par une mention
  « bientôt disponible » : proposer un accès qui n'existe pas encore
  dégraderait la confiance, qui est justement l'argument de cette section.
*/
export default function ClientPortalCta() {
  const { portal } = useContent();

  return (
    <Section id="espace-client" className="bg-white pt-0! sm:pt-0! lg:pt-0!">
      <div className="reveal relative overflow-hidden rounded-3xl bg-primary p-8 text-white shadow-2xl shadow-primary/25 sm:p-12 lg:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full border border-white/10"
        />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Centré sur une colonne ; la liste garde ses lignes alignées à gauche. */}
          <div className="flex flex-col items-center gap-5 text-center lg:col-span-8 lg:items-start lg:text-left">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-brand-yellow">
              <Icon name="schedule" size={16} />
              {portal.badge}
            </span>

            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              {portal.title}
            </h2>

            <p className="max-w-2xl text-sm leading-relaxed text-on-primary-variant sm:text-base">
              {portal.text}
            </p>

            <ul className="grid max-w-full grid-cols-1 gap-3.5 pt-2 text-left sm:grid-cols-2">
              {portal.features.map((feature, index) => (
                <li key={`${feature.text}-${index}`} className="flex items-center gap-2.5 text-sm text-on-primary-soft">
                  <Icon name={feature.icon} size={18} className="shrink-0 text-brand-yellow" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
              <p className="text-center text-sm leading-relaxed text-on-primary-soft lg:text-left">
                {portal.aside}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

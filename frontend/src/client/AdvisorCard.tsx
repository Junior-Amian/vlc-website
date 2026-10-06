import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useContent } from '../content/ContentProvider';
import { phoneHref, whatsappLink } from '../data/site';
import { bigButton } from './ui';

/**
 * Le conseiller, joignable d'un geste. Numéros tirés du contenu du site
 * (section « Coordonnées » du panel) : un changement de numéro s'applique
 * ici aussi. Le message WhatsApp porte la référence du dossier, pour que
 * l'équipe le retrouve sans poser la question.
 */
export default function AdvisorCard({ reference }: { reference: string | null }) {
  const { company } = useContent();
  const message = reference
    ? `Bonjour VISILION, j'ai une question sur mon dossier ${reference}.`
    : "Bonjour VISILION, j'ai une question sur mon espace client.";

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-primary p-5 text-white sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">Une question ?</h2>
        <p className="text-sm leading-relaxed text-on-primary-soft">
          Votre conseiller vous répond par WhatsApp ou par téléphone.
        </p>
      </div>
      {/* Côte à côte sur tablette ; empilés dans la colonne étroite du grand écran. */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
        <a
          href={whatsappLink(company.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${bigButton.primary} w-full`}
        >
          <Icon name="chat" size={20} />
          WhatsApp
        </a>
        <a
          href={phoneHref(company.phoneIntl)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-base font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.98]"
        >
          <Icon name="call" size={20} />
          {company.phoneDisplay}
        </a>
      </div>
      {reference && (
        <Link
          to="/espace-client/messages"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-on-primary-soft underline-offset-4 hover:text-white hover:underline"
        >
          Ou écrivez-lui depuis vos messages
          <Icon name="arrow_forward" size={18} />
        </Link>
      )}
    </section>
  );
}

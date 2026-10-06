import type { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import { phoneHref, whatsappLink } from '../../data/site';
import { useContent } from '../../content/ContentProvider';

/**
 * Bloc d'invitation, à côté du formulaire : un message d'accueil et les
 * trois voies de contact direct, pour qui préfère ne pas remplir le
 * formulaire. En Côte d'Ivoire, l'appel et WhatsApp passent souvent avant
 * l'email, d'où leur ordre.
 */
export default function ContactDetails() {
  const { contact, company } = useContent();

  const channels = [
    {
      icon: 'call',
      iconBox: 'bg-secondary-fixed text-on-secondary-fixed',
      label: 'Appelez-nous',
      value: company.phoneDisplay,
      href: phoneHref(company.phoneIntl),
      external: false,
    },
    {
      icon: 'chat',
      iconBox: 'bg-brand-green-soft text-brand-green',
      label: 'WhatsApp',
      value: 'Écrire sur WhatsApp',
      href: whatsappLink(company.whatsapp),
      external: true,
    },
    {
      icon: 'mail',
      iconBox: 'bg-brand-blue-soft text-brand-blue',
      label: 'Email',
      value: company.email,
      href: `mailto:${company.email}`,
      external: false,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Centré tant que les coordonnées et le formulaire sont empilés. */}
      <div className="reveal text-center lg:text-left">
        <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-secondary-ink">
          {contact.eyebrow}
        </span>

        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
          {contact.title}
        </h2>

        <p className="mx-auto mt-4 max-w-[46ch] text-base leading-relaxed text-on-surface-variant lg:mx-0">
          {contact.text}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {channels.map((channel, index) => (
          <li
            key={channel.label}
            className="reveal"
            style={{ '--i': index + 1 } as CSSProperties}
          >
            <a
              href={channel.href}
              {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group flex items-center gap-4 rounded-2xl border border-surface-container bg-white p-4 transition-all hover:border-surface-container-high hover:shadow-ambient"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${channel.iconBox}`}
              >
                <Icon name={channel.icon} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-on-surface-variant">{channel.label}</span>
                {/*
                  L'adresse email est longue : un cran plus petite sur mobile, et la
                  flèche décorative y est masquée, pour qu'elle tienne sur une ligne.
                  Sur les écrans les plus étroits, elle passe à la ligne avant
                  l'arobase (<wbr>) plutôt qu'en plein mot.
                */}
                <span
                  className={`block font-bold text-primary [overflow-wrap:anywhere] ${
                    channel.icon === 'mail' ? 'text-sm sm:text-base' : 'text-base'
                  }`}
                >
                  {channel.icon === 'mail' ? (
                    <>
                      {channel.value.split('@')[0]}
                      <wbr />@{channel.value.split('@')[1]}
                    </>
                  ) : (
                    channel.value
                  )}
                </span>
              </span>
              {/*
                `hidden` est posé sur l'enveloppe et non sur l'icône : la feuille
                de Google Fonts déclare `display: inline-block` hors des couches
                de Tailwind, ce qui l'emporte sur les utilitaires d'affichage.
              */}
              <span className="hidden shrink-0 sm:block">
                <Icon
                  name="arrow_forward"
                  size={20}
                  className="text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-secondary"
                />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

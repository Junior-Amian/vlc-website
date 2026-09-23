import Icon from '../ui/Icon';
import { asset } from '../../lib/asset';
import { brand, LOGO_ORDER } from '../ui/brand';
import { site, whatsappLink } from '../../data/site';
import { services } from '../../data/services';

const HEADING_CLASS = 'text-sm font-bold text-primary';
// min-h-11 : cibles tactiles de 44px, confortables au doigt sur mobile.
const LINK_CLASS = 'inline-flex min-h-11 items-center transition-colors hover:text-secondary lg:min-h-9';

/*
  Les liens « Mentions légales » et « Politique de confidentialité » de la
  maquette ont été retirés : ils étaient désactivés faute de pages, et un
  lien inerte donne une impression de site inachevé. À rétablir dès que les
  textes existent (le formulaire collecte des données personnelles, une
  politique de confidentialité sera nécessaire avant la mise en ligne).
*/
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="pied-de-page" className="w-full bg-white">
      {/* Signature : les quatre barres de couleur du logo, dans le même ordre. */}
      <div aria-hidden="true" className="grid h-1.5 grid-cols-4">
        {LOGO_ORDER.map((color) => (
          <span key={color} className={brand[color].solid} />
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 pb-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Marque */}
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4 lg:pr-8">
            <img
              src={asset('/logo.jpeg')}
              alt={site.name}
              width={96}
              height={96}
              loading="lazy"
              className="-ml-2 h-24 w-auto self-start object-contain"
            />
            <p className="text-sm font-semibold italic text-secondary">« {site.slogan} »</p>
            <p className="max-w-[36ch] text-sm leading-relaxed text-on-surface-variant">
              Marc-Peniel et Marie-Paule vous accompagnent depuis Abidjan dans toutes vos
              démarches de visa.
            </p>
          </div>

          {/* Services : le carré reprend la couleur de chaque prestation dans la page. */}
          <nav aria-label="Nos services" className="flex flex-col gap-4 lg:col-span-3">
            <h2 className={HEADING_CLASS}>Nos services</h2>
            <ul className="flex flex-col text-sm text-on-surface-variant">
              {services.map((service) => (
                <li key={service.slug}>
                  <a href={`#${service.slug}`} className={`gap-2.5 ${LINK_CLASS}`}>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${brand[service.color].solid}`}
                    />
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Plan du site" className="flex flex-col gap-4 lg:col-span-2">
            <h2 className={HEADING_CLASS}>Navigation</h2>
            <ul className="flex flex-col text-sm text-on-surface-variant">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4 lg:col-span-3">
            <h2 className={HEADING_CLASS}>Nous contacter</h2>
            <ul className="flex flex-col text-sm text-on-surface-variant">
              <li>
                <a href={site.contact.phoneHref} className={`gap-2.5 ${LINK_CLASS}`}>
                  <Icon name="call" size={18} className="shrink-0 text-secondary" />
                  {site.contact.phoneIntl}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`gap-2.5 ${LINK_CLASS}`}
                >
                  <Icon name="chat" size={18} className="shrink-0 text-brand-green" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${site.contact.email}`} className={`gap-2.5 ${LINK_CLASS}`}>
                  <Icon name="mail" size={18} className="shrink-0 text-secondary" />
                  <span className="break-all">{site.contact.email}</span>
                </a>
              </li>
              <li className="flex min-h-11 items-center gap-2.5 lg:min-h-9">
                <Icon name="location_on" size={18} className="shrink-0 text-secondary" />
                {site.contact.city}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-surface-container py-6 text-sm text-on-surface-variant sm:flex-row">
          <p>
            © {year} {site.name}. Tous droits réservés.
          </p>
          <a href="#" className={`gap-1.5 font-medium ${LINK_CLASS}`}>
            Haut de page
            <Icon name="arrow_upward" size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}

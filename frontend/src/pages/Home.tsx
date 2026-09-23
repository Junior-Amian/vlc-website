import type { CSSProperties } from 'react';
import Seo from '../components/ui/Seo';
import Hero from '../components/home/Hero';
import DeparturesBoard from '../components/home/DeparturesBoard';
import Founders from '../components/home/Founders';
import Services from '../components/home/Services';
import Testimonials from '../components/home/Testimonials';
import ClientPortalCta from '../components/home/ClientPortalCta';
import ContactForm from '../components/home/ContactForm';
import ContactDetails from '../components/home/ContactDetails';
import Section from '../components/ui/Section';
import { site } from '../data/site';

/**
 * Page unique du site.
 *
 * Toutes les rubriques sont empilées ici et la navigation se fait par ancres.
 * Chaque section porte l'identifiant utilisé par le menu (#fondateurs,
 * #services, #temoignages, #contact) ; le décalage sous l'en-tête fixe est
 * géré par `scroll-padding-top` dans styles/index.css.
 */
export default function Home() {
  return (
    <>
      <Seo
        title={`${site.name} | Assistanat visa à Abidjan`}
        description={site.description}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: site.name,
          slogan: site.slogan,
          description: site.description,
          telephone: site.contact.phoneIntl,
          email: site.contact.email,
          areaServed: "Côte d'Ivoire",
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Abidjan',
            addressCountry: 'CI',
          },
        }}
      />

      <Hero />
      <DeparturesBoard />
      <Founders />

      <Services />
      <Testimonials />
      <ClientPortalCta />

      <Section
        id="contact"
        className="border-t border-surface-container bg-surface-container-low"
      >
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <ContactDetails />
          </div>

          <div className="reveal lg:col-span-7" style={{ '--i': 2 } as CSSProperties}>
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}

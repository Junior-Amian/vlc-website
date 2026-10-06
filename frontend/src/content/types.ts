import type { BrandColor } from '../components/ui/brand';

/*
  Contenu modifiable du site, tel que l'API le publie (GET /api/content).

  Reflet de api/app/Content/ContentSchema.php : un champ ajouté ou renommé
  là-bas doit l'être ici aussi. Les éléments masqués dans le panel ne sont
  jamais publiés, d'où l'absence de `published` dans ces types.
*/

/** Image de la médiathèque, disponible en plusieurs largeurs. */
export type MediaImage = {
  id: string;
  alt: string;
  width: number;
  height: number;
  /** Du plus étroit au plus large ; `src` est relatif à la racine de l'API. */
  variants: { w: number; src: string }[];
};

export type Airport = { code: string; city: string };

export type Service = {
  /** Ancre de la prestation dans la page. */
  slug: string;
  title: string;
  icon: string;
  /** Couleur du logo qui repère la prestation partout sur le site. */
  color: BrandColor;
  /** Une phrase, toujours visible. */
  tagline: string;
  description: string;
  destinations: string[];
};

export type Testimonial = {
  name: string;
  /** Prestation concernée (slug) : donne le motif et la couleur. */
  service: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  quote: string;
  photo: MediaImage | null;
};

export type SiteContent = {
  hero: {
    title: string;
    text: string;
    /** null : la photo par défaut de public/images. */
    image: MediaImage | null;
  };
  departures: {
    label: string;
    airports: Airport[];
  };
  about: {
    titleLead: string;
    names: string;
    lead: string;
    paragraphs: string[];
    quote: string;
    values: { icon: string; title: string; text: string }[];
    portrait: MediaImage | null;
  };
  services: {
    title: string;
    intro: string;
    items: Service[];
  };
  college: {
    title: string;
    intro: string;
    address: string;
    url: string;
    urlLabel: string;
    stampValue: string;
    stampUnit: string;
    captionStrong: string;
    captionText: string;
    /** Une étape avec un délai est mise en évidence. */
    steps: { title: string; delay: string; text: string; issuer: string }[];
    feesTitle: string;
    feesText: string;
    ctaLabel: string;
    disclaimer: string;
  };
  testimonials: {
    title: string;
    intro: string;
    items: Testimonial[];
  };
  portal: {
    badge: string;
    title: string;
    text: string;
    features: { icon: string; text: string }[];
    aside: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    text: string;
  };
  company: {
    slogan: string;
    /** Description de la page pour les moteurs de recherche. */
    description: string;
    phoneDisplay: string;
    phoneIntl: string;
    /** Numéro international, chiffres seuls (2250151463051). */
    whatsapp: string;
    email: string;
    city: string;
    footerText: string;
  };
};

/**
 * Informations d'entreprise centralisées.
 *
 * Tout ce qui est susceptible de changer (téléphone, email, adresse) est ici
 * pour n'avoir qu'un seul fichier à modifier.
 */
export const site = {
  name: 'VISILION CORPORATE',
  shortName: 'VISILION',
  slogan: 'Notre vision, votre satisfaction',
  baseUrl: 'https://visilioncorporate.com',

  description:
    "Cabinet d'assistanat visa à Abidjan : visa étudiant, résidence permanente, visa visiteur, visa d'affaires et visa sport. Votre dossier préparé de A à Z, entretien compris.",

  contact: {
    phoneDisplay: '01 51 46 30 51',
    phoneIntl: '+225 01 51 46 30 51',
    phoneHref: 'tel:+2250151463051',
    whatsapp: '2250151463051',
    // NOTE : adresse professionnelle à créer (le PDF mentionne encore
    // infovisilioncorporate@gmail.com comme adresse de travail).
    email: 'contact@visilioncorporate.com',
    city: "Abidjan, Côte d'Ivoire",
    partners: 'Représentations partenaires : Canada, France & Turquie',
    hours: 'Lundi au vendredi : 08h30 – 18h00 • Samedi : 09h00 – 14h00',
  },

  stats: [
    { value: '98%', label: 'Taux de satisfaction', hint: 'Accompagnement méticuleux' },
    { value: '+1 200', label: 'Dossiers réussis', hint: 'Étudiants, familles & cadres' },
    { value: '45+', label: 'Destinations', hint: 'Canada, Schengen, Asie, Golfe' },
    { value: '100%', label: 'Suivi personnalisé', hint: 'Conseiller dédié sans intermédiaire' },
  ],

  /*
    Navigation par ancres : le site est sur une page unique. Chaque `href`
    doit correspondre à l'`id` d'une section de pages/Home.tsx.
  */
  nav: [
    { label: 'À propos', href: '#fondateurs' },
    { label: 'Services', href: '#services' },
    { label: 'Témoignages', href: '#temoignages' },
    { label: 'Contact', href: '#contact' },
  ],
} as const;

/** Message prérempli par défaut à l'ouverture de WhatsApp. */
const WHATSAPP_GREETING = 'Bonjour VISILION, je souhaite des informations sur ';

export function whatsappLink(message: string = WHATSAPP_GREETING): string {
  return `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * Informations fixes du site.
 *
 * Coordonnées, slogan et description se modifient dans le panel
 * d'administration (section « Coordonnées ») : voir content/types.ts.
 * Restent ici les données liées au code, qu'un changement de texte ne doit
 * pas pouvoir casser.
 */
export const site = {
  name: 'VISILION CORPORATE',
  baseUrl: 'https://visilioncorporate.com',

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

/** @param number Numéro international, chiffres seuls (2250151463051). */
export function whatsappLink(number: string, message: string = WHATSAPP_GREETING): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Lien d'appel à partir du numéro international (+225 01 51 46 30 51). */
export function phoneHref(phoneIntl: string): string {
  return `tel:${phoneIntl.replace(/[^+\d]/g, '')}`;
}

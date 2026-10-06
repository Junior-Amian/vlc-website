/*
  Repères des sections dans le panel : l'icône du menu et l'ancre de la
  section sur le site (lien « Voir sur le site »).

  Les icônes doivent figurer dans ADMIN_ICONS (AdminEntry.tsx). Une section
  absente d'ici garde une icône neutre et mène au haut de la page.
*/
const SECTION_META: Record<string, { icon: string; anchor: string }> = {
  hero: { icon: 'image', anchor: 'accueil' },
  departures: { icon: 'flight_takeoff', anchor: 'accueil' },
  about: { icon: 'favorite', anchor: 'fondateurs' },
  services: { icon: 'business_center', anchor: 'services' },
  college: { icon: 'school', anchor: 'college-universel' },
  testimonials: { icon: 'forum', anchor: 'temoignages' },
  portal: { icon: 'shield', anchor: 'espace-client' },
  contact: { icon: 'mail', anchor: 'contact' },
  company: { icon: 'call', anchor: 'pied-de-page' },
};

export function sectionIcon(key: string): string {
  return SECTION_META[key]?.icon ?? 'dashboard';
}

export function sectionAnchor(key: string): string {
  return SECTION_META[key]?.anchor ?? 'accueil';
}

/** Libellés des sections suivies par la mesure d'audience (identifiants de la page). */
export const PAGE_SECTION_LABELS: Record<string, string> = {
  accueil: 'Bannière',
  fondateurs: 'À propos',
  services: 'Prestations',
  'college-universel': 'Collège Universel',
  temoignages: 'Témoignages',
  'espace-client': 'Espace client',
  contact: 'Contact',
};

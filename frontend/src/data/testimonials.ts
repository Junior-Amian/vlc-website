type Airport = {
  /** Code IATA réel de l'aéroport. */
  code: string;
  city: string;
};

export type Testimonial = {
  name: string;
  /** Prestation concernée (slug de data/services.ts) : donne le motif et la couleur. */
  service: string;
  from: Airport;
  to: Airport;
  quote: string;
};

const ABIDJAN: Airport = { code: 'ABJ', city: 'Abidjan' };

/*
  NOTE : témoignages provisoires, inspirés de la maquette. Le cahier des
  charges prévoit une séance photo avec de vrais clients : ces textes sont à
  remplacer avant la mise en ligne, avec l'accord écrit des personnes
  concernées pour leur nom et leur photo.
*/
export const testimonials: Testimonial[] = [
  {
    name: 'Kevin K.',
    service: 'visa-visiteur',
    from: ABIDJAN,
    to: { code: 'YUL', city: 'Montréal' },
    quote:
      'Après un refus avec une autre structure, ils ont repris mon dossier avec méthode. Visa obtenu pour rejoindre ma famille.',
  },
  {
    name: 'Aïcha T.',
    service: 'visa-etudiant',
    from: ABIDJAN,
    to: { code: 'LYS', city: 'Lyon' },
    quote:
      "De l'inscription en master jusqu'au visa, ils m'ont préparée avec patience à chaque étape, entretien compris.",
  },
  {
    name: 'Stéphane B.',
    service: 'visa-affaires',
    from: ABIDJAN,
    to: { code: 'IST', city: 'Istanbul' },
    quote:
      "Un salon professionnel à Istanbul et peu de temps devant moi : dossier solide, visa obtenu sans difficulté.",
  },
];

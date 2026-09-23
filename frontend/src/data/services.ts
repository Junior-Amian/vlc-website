import type { BrandColor } from '../components/ui/brand';

export type Service = {
  /** Ancre de la prestation dans la page. */
  slug: string;
  icon: string;
  /** Couleur du logo qui repère la prestation partout sur le site. */
  color: BrandColor;
  title: string;
  /** Une phrase, toujours visible. */
  tagline: string;
  /** Texte complet du client, affiché quand on déplie la prestation. */
  description: string;
  destinations?: string[];
};

/*
  Les cinq prestations de docs/Services_Assistanat_Visa.pdf, dans le même
  ordre : ce sont les seuls services présentés sur le site. La description
  reprend le texte du client ; les destinations viennent du cahier des
  charges (docs/CREATION DE SITE .pdf).
*/
export const services: Service[] = [
  {
    slug: 'visa-etudiant',
    icon: 'school',
    color: 'blue',
    title: 'Visa étudiant',
    tagline: "Du choix de l'école jusqu'à l'entretien, nous vous suivons de A à Z.",
    description:
      "Vous rêvez d'étudier à l'étranger ? Nous vous accompagnons de A à Z : choix de l'établissement, constitution du dossier, lettre de motivation et préparation à l'entretien. Notre expertise maximise vos chances d'obtenir votre visa et de démarrer votre parcours académique sereinement.",
    destinations: ['Canada', 'Europe'],
  },
  {
    slug: 'residence-permanente',
    icon: 'home_work',
    color: 'green',
    title: 'Résidence permanente',
    tagline: "Le bon programme d'immigration, et un suivi jusqu'à votre statut.",
    description:
      "Vous souhaitez vous installer durablement dans un nouveau pays ? Nous évaluons votre profil, identifions le programme le plus adapté à votre situation et vous guidons à chaque étape de la procédure d'immigration jusqu'à l'obtention de votre statut de résident permanent.",
    destinations: ['Canada'],
  },
  {
    slug: 'visa-visiteur',
    icon: 'luggage',
    color: 'yellow',
    title: 'Visa visiteur',
    tagline: 'Tourisme, famille ou événement : un dossier traité sans complications.',
    description:
      'Tourisme, visite familiale ou événement particulier ? Nous préparons votre dossier avec rigueur pour vous garantir un traitement rapide et sans complications, et vous conseillons sur les justificatifs essentiels pour convaincre les autorités consulaires.',
    destinations: ['Espace Schengen', 'Canada', 'Partout dans le monde'],
  },
  {
    slug: 'visa-affaires',
    icon: 'business_center',
    color: 'red',
    title: "Visa d'affaires",
    tagline: 'Rencontres, salons, missions : un dossier à la hauteur de vos enjeux.',
    description:
      "Déplacements professionnels, rencontres commerciales ou participation à un salon ? Nous facilitons vos démarches pour un visa d'affaires, en assurant un montage de dossier solide qui répond aux exigences spécifiques du monde professionnel.",
    destinations: ['Turquie', 'Chine'],
  },
  {
    slug: 'visa-sport',
    icon: 'sports_soccer',
    color: 'blue',
    title: 'Visa sport',
    tagline: 'Compétitions et stages : un suivi adapté aux délais serrés.',
    description:
      "Athlète, entraîneur ou membre d'une délégation sportive ? Nous vous accompagnons dans l'obtention de votre visa pour compétitions, stages ou événements sportifs internationaux, avec un suivi adapté aux délais souvent serrés de ce type de déplacement.",
  },
];

export function findService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

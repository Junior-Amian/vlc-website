/**
 * Les quatre couleurs du logo et leurs classes Tailwind.
 *
 * Les classes sont écrites en entier (jamais composées dynamiquement) :
 * Tailwind ne génère que celles qu'il trouve telles quelles dans le code.
 * Jetons définis dans styles/index.css.
 */
export type BrandColor = 'green' | 'blue' | 'red' | 'yellow';

type BrandClasses = {
  /** Texte lisible sur fond clair (contraste ≥ 4,5). */
  text: string;
  /** Aplat plein, pour les éléments sans texte (barres, pastilles). */
  solid: string;
  /** Fond teinté léger. */
  soft: string;
  border: string;
};

export const brand: Record<BrandColor, BrandClasses> = {
  green: {
    text: 'text-brand-green',
    solid: 'bg-brand-green',
    soft: 'bg-brand-green-soft',
    border: 'border-brand-green',
  },
  blue: {
    text: 'text-brand-blue',
    solid: 'bg-brand-blue',
    soft: 'bg-brand-blue-soft',
    border: 'border-brand-blue',
  },
  red: {
    text: 'text-brand-red-ink',
    solid: 'bg-brand-red',
    soft: 'bg-brand-red-soft',
    border: 'border-brand-red',
  },
  yellow: {
    text: 'text-brand-yellow-ink',
    solid: 'bg-brand-yellow',
    soft: 'bg-brand-yellow-soft',
    border: 'border-brand-yellow',
  },
};

/** Ordre des couleurs sur le logo, pour la barre signature. */
export const LOGO_ORDER: BrandColor[] = ['blue', 'red', 'green', 'yellow'];

import { API_BASE } from '../lib/api';
import type { MediaImage } from './types';

/** Adresse d'un fichier de la médiathèque (chemin relatif à la racine de l'API). */
export function mediaUrl(src: string): string {
  return `${API_BASE}/${src.replace(/^\//, '')}`;
}

/**
 * Attributs d'une <img> responsive : toutes les largeurs dans srcSet, et en
 * src la plus petite qui atteint `preferred` px (repli des navigateurs qui
 * ignorent srcSet).
 */
export function imageProps(image: MediaImage, preferred = 960) {
  const variants = image.variants;
  const fallback = variants.find((variant) => variant.w >= preferred) ?? variants[variants.length - 1];

  return {
    src: fallback ? mediaUrl(fallback.src) : '',
    srcSet: variants.map((variant) => `${mediaUrl(variant.src)} ${variant.w}w`).join(', '),
    width: image.width,
    height: image.height,
    alt: image.alt,
  };
}

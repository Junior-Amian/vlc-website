/*
  Préparation des images avant envoi, dans le navigateur de l'administrateur.

  L'hébergement mutualisé ne garantit pas la bibliothèque GD : le serveur ne
  redimensionne rien et se contente de vérifier ce qu'il reçoit
  (api/app/Controllers/Admin/MediaController.php). C'est donc ici que chaque
  photo est déclinée en plusieurs largeurs, pour que les téléphones ne
  téléchargent jamais l'image de 2400 px.

  Effet secondaire voulu : le réencodage par <canvas> supprime les
  métadonnées EXIF, dont la position GPS des photos prises au téléphone.
*/

/** Largeurs produites (dans la limite de la largeur d'origine). */
const WIDTHS = [480, 960, 1600, 2400];

/** Au-delà, l'image est réduite : rien sur le site ne s'affiche plus large. */
const MAX_WIDTH = 2400;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export type ResizedImage = {
  width: number;
  height: number;
  variants: { width: number; blob: Blob }[];
};

export class ImageError extends Error {}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function resizeImage(file: File): Promise<ResizedImage> {
  if (!ACCEPTED.includes(file.type)) {
    throw new ImageError('Format non pris en charge : choisissez une photo JPEG, PNG ou WebP.');
  }

  let bitmap: ImageBitmap;

  try {
    // from-image : une photo de téléphone prise à la verticale reste droite.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError("Cette image n'a pas pu être lue. Est-elle endommagée ?");
  }

  const ratio = bitmap.height / bitmap.width;
  const largest = Math.min(bitmap.width, MAX_WIDTH);
  const widths = [...WIDTHS.filter((width) => width < largest), largest];

  const variants: ResizedImage['variants'] = [];

  for (const width of widths) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width * ratio);

    const context = canvas.getContext('2d');

    if (!context) {
      throw new ImageError("Votre navigateur ne permet pas de préparer l'image.");
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP, nettement plus léger ; Safari ne sait pas l'encoder et renvoie
    // alors du PNG : on se rabat sur du JPEG.
    let blob = await encode(canvas, 'image/webp', 0.82);

    if (!blob || blob.type !== 'image/webp') {
      blob = await encode(canvas, 'image/jpeg', 0.85);
    }

    if (!blob) {
      throw new ImageError("L'image n'a pas pu être préparée pour l'envoi.");
    }

    variants.push({ width, blob });
  }

  bitmap.close();

  return { width: largest, height: Math.round(largest * ratio), variants };
}

export function toUploadForm(file: File, image: ResizedImage, alt: string): FormData {
  const form = new FormData();
  const base = file.name.replace(/\.[^.]+$/, '');

  for (const variant of image.variants) {
    const extension = variant.blob.type === 'image/webp' ? 'webp' : 'jpg';
    form.append('variants[]', variant.blob, `${base}-${variant.width}.${extension}`);
    form.append('widths[]', String(variant.width));
  }

  form.append('alt', alt);
  form.append('name', file.name);

  return form;
}

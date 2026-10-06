import type { FieldDef, SectionData } from '../types';

/*
  Manipulation des valeurs de formulaire, à partir du schéma.

  Chaque élément d'une liste (prestation, témoignage…) reçoit une clé
  `_key`, propre au navigateur : React s'en sert pour suivre l'élément quand
  on le déplace ou le supprime. Le serveur ne garde que les champs du
  schéma ; inutile de la retirer avant l'envoi.
*/

export const KEY = '_key';

let counter = 0;

export function newKey(): string {
  counter += 1;

  return `k${Date.now().toString(36)}${counter}`;
}

/** Valeur d'un champ vierge : nouvelle section ou nouvel élément de liste. */
export function emptyValue(field: FieldDef): unknown {
  switch (field.type) {
    case 'boolean':
      return field.default ?? true;
    case 'image':
      return null;
    case 'list':
    case 'items':
      return [];
    default:
      return typeof field.default === 'string' ? field.default : '';
  }
}

export function emptyObject(fields: FieldDef[]): SectionData {
  const object: SectionData = { [KEY]: newKey() };

  for (const field of fields) {
    object[field.key] = emptyValue(field);
  }

  return object;
}

/**
 * Complète les données reçues de l'API : champs manquants (section jamais
 * enregistrée, champ ajouté au schéma depuis) et clés des éléments de liste.
 */
export function prepare(fields: FieldDef[], data: unknown): SectionData {
  const source = typeof data === 'object' && data !== null ? (data as SectionData) : {};
  const object: SectionData = {};

  for (const field of fields) {
    const value = source[field.key];

    if (field.type === 'items') {
      object[field.key] = (Array.isArray(value) ? value : []).map((item) => ({
        ...prepare(field.fields ?? [], item),
        [KEY]: newKey(),
      }));
    } else if (field.type === 'list') {
      object[field.key] = Array.isArray(value) ? value : [];
    } else {
      object[field.key] = value === undefined ? emptyValue(field) : value;
    }
  }

  return object;
}

/** Ancre d'URL à partir d'un titre : « Visa d'affaires » → « visa-d-affaires ». */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
}

/** Le formulaire a-t-il changé depuis le dernier enregistrement ? */
export function isSame(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Des erreurs concernent-elles ce chemin ou ses sous-champs ? */
export function hasErrorsUnder(errors: Record<string, string[]>, path: string): boolean {
  return Object.keys(errors).some((key) => key === path || key.startsWith(`${path}.`));
}

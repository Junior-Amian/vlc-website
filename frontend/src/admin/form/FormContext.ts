import { createContext, useContext } from 'react';
import type { MediaImage } from '../../content/types';
import type { FieldErrors, Option } from '../types';

/** Ce dont tous les champs d'un formulaire de section ont besoin. */
export type FormContextValue = {
  errors: FieldErrors;
  /** Icônes proposées (celles de la police réduite du site). */
  icons: string[];
  /** Listes de choix dynamiques (optionsFrom), fournies par l'API. */
  options: Record<string, Option[]>;
  /** Images connues, pour afficher la vignette d'un identifiant. */
  media: Record<string, MediaImage>;
  rememberMedia: (image: MediaImage) => void;
};

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error('Champ de formulaire rendu hors de FormContext.');
  }

  return context;
}

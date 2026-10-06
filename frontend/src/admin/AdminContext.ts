import { createContext, useContext } from 'react';
import type { Admin, Schema } from './types';

export type AdminContextValue = {
  admin: Admin;
  schema: Schema;
  logout: () => void;
  /**
   * Signale des modifications non enregistrées : quitter la page ou changer
   * de rubrique demande alors confirmation.
   */
  setDirty: (dirty: boolean) => void;
  dirty: boolean;
  /** Demandes de contact que personne n'a encore ouvertes (badge du menu). */
  newRequests: number;
  /** Recompte les demandes, après une modification ou en tâche de fond. */
  refreshRequests: () => void;
  /** Dossiers avec une pièce à vérifier ou un message non lu (badge du menu). */
  dossierAlerts: number;
  /** Recompte ces dossiers, après une lecture ou une vérification. */
  refreshDossierAlerts: () => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error('useAdmin() appelé hors du panel.');
  }

  return context;
}

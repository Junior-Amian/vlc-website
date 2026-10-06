import { createContext, useContext } from 'react';
import type { ClientState } from './types';

export type ClientContextValue = ClientState & {
  /** Remplace l'état par celui que l'API vient de renvoyer. */
  update: (state: ClientState) => void;
  /** Les messages viennent d'être lus : le badge de l'onglet s'efface. */
  markMessagesRead: () => void;
  logout: () => void;
};

export const ClientContext = createContext<ClientContextValue | null>(null);

/** L'espace du client connecté. N'existe qu'à l'intérieur de la session. */
export function useClient(): ClientContextValue {
  const value = useContext(ClientContext);

  if (!value) {
    throw new Error('useClient() hors de la session client.');
  }

  return value;
}

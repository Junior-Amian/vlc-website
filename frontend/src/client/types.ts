/*
  Compte et état de l'espace client, tels que l'API les renvoie
  (Controllers/Client). Le dossier lui-même est décrit dans dossiers/types.ts,
  commun avec le panel.
*/

import type { Dossier } from '../dossiers/types';

export type Client = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  onboarded: boolean;
  profile: Record<string, string>;
};

/** Question du formulaire d'ouverture (api/app/Dossiers/Onboarding.php). */
export type OnboardingField = {
  key: string;
  group: number;
  type: 'string' | 'date' | 'select';
  label: string;
  required: boolean;
  max?: number;
  help?: string;
  uppercase?: boolean;
  autocomplete?: string;
  options?: { value: string; label: string }[];
};

export type OnboardingForm = {
  groups: { number: number; title: string; description: string; fields: OnboardingField[] }[];
};

/** Réponse de GET /api/client/me : tout ce que l'espace affiche. */
export type ClientState = {
  client: Client;
  dossier: Dossier | null;
  onboarding: OnboardingForm;
  maxUploadBytes: number;
  /** Messages de l'équipe pas encore lus par le client. */
  unreadMessages: number;
};

/** Lien d'invitation ou de mot de passe, vérifié avant d'afficher le formulaire. */
export type AccessInfo = { type: 'invite' | 'reset'; fullName: string; email: string };

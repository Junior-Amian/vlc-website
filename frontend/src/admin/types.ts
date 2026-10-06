import type { MediaImage } from '../content/types';
import type { Dossier, Step } from '../dossiers/types';

/*
  Schéma des sections, tel que l'API le décrit (GET /api/admin/schema,
  défini dans api/app/Content/ContentSchema.php). Les formulaires du panel
  sont construits à partir de lui : un champ ajouté côté PHP apparaît ici
  sans autre modification.
*/

export type Option = { value: string; label: string };

export type FieldType =
  | 'string'
  | 'text'
  | 'email'
  | 'url'
  | 'slug'
  | 'icon'
  | 'select'
  | 'boolean'
  | 'image'
  | 'list'
  | 'items';

export type FieldDef = {
  key: string;
  type: FieldType;
  label: string;
  required: boolean;
  help?: string;
  max?: number;
  default?: string | boolean;
  uppercase?: boolean;
  /** select */
  options?: Option[];
  optionsFrom?: 'services';
  /** list */
  of?: 'string' | 'text';
  /** list, items */
  minItems?: number;
  maxItems?: number;
  /** items */
  fields?: FieldDef[];
  itemLabel?: string;
  titleField?: string;
};

export type SectionDef = {
  key: string;
  label: string;
  group: 'content' | 'settings';
  description: string;
  fields: FieldDef[];
};

export type Schema = {
  sections: SectionDef[];
  icons: string[];
};

export type Admin = { id: string; name: string; email: string };

export type SectionData = Record<string, unknown>;

export type SectionPayload = {
  key: string;
  /** null : section jamais enregistrée. */
  data: SectionData | null;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Images référencées par la section, pour leurs vignettes. */
  media: Record<string, MediaImage>;
  options: Record<string, Option[]>;
};

export type MediaItem = MediaImage & {
  originalName: string;
  size: number;
  createdAt: string;
  /** Sections qui affichent l'image. */
  usedIn: string[];
};

/** Erreurs de validation, indexées par chemin (« items.2.title »). */
export type FieldErrors = Record<string, string[]>;

export type RequestStatus = 'new' | 'in_progress' | 'done' | 'spam';

/** Filtres de la liste des demandes (ContactRequest::FILTERS côté PHP). */
export type RequestFilter = 'open' | 'done' | 'spam' | 'all';

/** Demande envoyée par le formulaire de contact du site. */
export type ContactRequest = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  status: RequestStatus;
  /** Note interne, jamais montrée au visiteur. */
  note: string;
  emailSent: boolean;
  handledBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequestCounts = Record<RequestStatus, number>;

export type RequestPage = {
  items: ContactRequest[];
  total: number;
  page: number;
  perPage: number;
  counts: RequestCounts;
};

/*
  Dossiers de l'espace client (api/app/Dossiers/DossierView.php). Le panel
  reçoit le dossier du client, enrichi de la fiche du client et de la note
  interne.
*/

export type DossierFilter = 'open' | 'review' | 'messages' | 'closed' | 'all';

export type AdminDossier = Dossier & {
  /** Note interne, jamais montrée au client. */
  note: string;
  contactRequestId: string | null;
  /** Messages du client que l'équipe n'a pas encore lus. */
  unreadMessages: number;
  client: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    /** Mot de passe choisi : l'invitation a été acceptée. */
    active: boolean;
    lastLoginAt: string | null;
    onboardedAt: string | null;
    /** Invitation en attente : date limite du lien. */
    invitationExpiresAt: string | null;
    /** Réponses du formulaire d'ouverture, avec leur libellé. */
    profile: { label: string; value: string }[];
  };
};

/** Ligne de la liste des dossiers. */
export type DossierSummary = {
  id: string;
  reference: string;
  clientName: string;
  clientEmail: string;
  clientActive: boolean;
  service: { slug: string; label: string };
  country: string;
  step: number;
  itemsRequired: number;
  itemsValidated: number;
  itemsToReview: number;
  unreadMessages: number;
  total: number | null;
  paid: number;
  updatedAt: string;
};

/** Vue d'ensemble de tous les dossiers, quel que soit le filtre (Dossier::overview). */
export type DossierOverview = {
  counts: Record<DossierFilter, number>;
  /** Nombre de dossiers à chaque étape, par numéro d'étape. */
  byStep: Record<string, number>;
  pendingInvitations: number;
  /** Reste à encaisser sur les dossiers en cours, en FCFA. */
  outstanding: number;
};

export type DossierList = {
  items: DossierSummary[];
  overview: DossierOverview;
  steps: Step[];
};

export type DossierOptions = { services: Option[]; steps: Step[] };

/** Lien d'invitation : envoyé par email, et affiché pour un envoi par WhatsApp. */
export type Invitation = { url: string; emailSent: boolean; expiresAt: string };

/** Décompte nommé : section, canal de contact, provenance, appareil… */
export type Count = { name: string; count: number };

export type StatsTotals = {
  visitors: number;
  pageviews: number;
  contacts: number;
  /** Visiteurs ayant pris contact au moins une fois. */
  contactVisitors: number;
};

/** Réponse de GET /api/admin/stats (api/app/Controllers/Admin/StatsController.php). */
export type Stats = {
  days: number;
  from: string;
  to: string;
  current: StatsTotals;
  /** Même durée, juste avant la période affichée. */
  previous: StatsTotals;
  daily: { date: string; visitors: number; pageviews: number }[];
  /** Visiteurs ayant atteint chaque section, dans l'ordre de la page. */
  sections: Count[];
  actions: Count[];
  pages: Count[];
  /** name vide : accès direct ou provenance inconnue. */
  referrers: Count[];
  devices: Count[];
  /** Date de la dernière mesure enregistrée (base, UTC), ou null. */
  lastVisitAt: string | null;
};

import { API_BASE, ApiError, isUuid, pathId, request } from '../lib/api';
import { BACKGROUND_HEADERS } from '../lib/session';
import type { ItemStatus, Message } from '../dossiers/types';
import type {
  Admin,
  AdminDossier,
  ContactRequest,
  DossierFilter,
  DossierList,
  DossierOptions,
  Invitation,
  MediaItem,
  RequestCounts,
  RequestFilter,
  RequestPage,
  RequestStatus,
  Schema,
  SectionData,
  SectionPayload,
  Stats,
} from './types';

/*
  Appels de l'API réservés au panel. La session tient dans un cookie
  HttpOnly posé par l'API : rien à stocker ni à joindre côté navigateur.

  Une réponse 401 (session expirée) est traitée ici, une fois pour tout le
  panel : le gestionnaire enregistré par AdminApp renvoie vers la connexion.
  Les pages n'ont donc qu'à afficher le message des autres erreurs.

  Tout identifiant placé dans une adresse passe par pathId (lib/api.ts),
  qu'il vienne de l'adresse de la page ou d'une réponse de l'API.
*/

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function call<T>(path: string, init?: RequestInit) {
  return request<T>(path, init).catch((caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      unauthorizedHandler?.();
    }

    throw caught;
  });
}

/** Message à afficher pour une erreur d'appel, avec un repli pour l'imprévu. */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const adminApi = {
  login: (email: string, password: string) =>
    call<Admin>('/admin/login', json('POST', { email, password })),

  logout: () => call<null>('/admin/logout', { method: 'POST' }),

  me: () => call<Admin>('/admin/me'),

  changePassword: (current: string, password: string, confirmation: string) =>
    call<null>(
      '/admin/me/password',
      json('PUT', {
        current_password: current,
        password,
        password_confirmation: confirmation,
      }),
    ),

  stats: (days: number) => call<Stats>(`/admin/stats?days=${days}`),

  requests: (filter: RequestFilter, query: string, page: number) =>
    call<RequestPage>(
      `/admin/requests?${new URLSearchParams({ filter, q: query, page: String(page) }).toString()}`,
    ),

  // `background` : rafraîchissement automatique, qui ne prolonge pas la session (lib/session.ts).
  requestCounts: (background = false) =>
    call<RequestCounts>('/admin/requests/summary', background ? { headers: BACKGROUND_HEADERS } : undefined),

  /** Ouvrir une demande « nouvelle » la fait passer « en cours ». */
  contactRequest: async (id: string) => call<ContactRequest>(`/admin/requests/${pathId(id)}`),

  updateRequest: async (id: string, changes: { status?: RequestStatus; note?: string }) =>
    call<ContactRequest>(`/admin/requests/${pathId(id)}`, json('PATCH', changes)),

  deleteRequest: async (id: string) => call<null>(`/admin/requests/${pathId(id)}`, { method: 'DELETE' }),

  schema: () => call<Schema>('/admin/schema'),

  section: (key: string) => call<SectionPayload>(`/admin/sections/${encodeURIComponent(key)}`),

  saveSection: (key: string, data: SectionData, version: number) =>
    call<SectionPayload>(`/admin/sections/${encodeURIComponent(key)}`, json('PUT', { data, version })),

  media: () => call<MediaItem[]>('/admin/media'),

  uploadMedia: (form: FormData) => call<MediaItem>('/admin/media', { method: 'POST', body: form }),

  updateMedia: async (id: string, alt: string) => call<MediaItem>(`/admin/media/${pathId(id)}`, json('PATCH', { alt })),

  deleteMedia: async (id: string) => call<null>(`/admin/media/${pathId(id)}`, { method: 'DELETE' }),

  /** `step` : 0 pour toutes les étapes. */
  dossiers: (filter: DossierFilter, query: string, step = 0) =>
    call<DossierList>(`/admin/dossiers?${new URLSearchParams({ filter, q: query, step: String(step) }).toString()}`),

  /** Dossiers qui demandent l'attention de l'équipe : le badge du menu. */
  dossierAlerts: (background = false) =>
    call<{ attention: number }>('/admin/dossiers/alerts', background ? { headers: BACKGROUND_HEADERS } : undefined),

  /** Le fil d'un dossier ; le lire le marque comme lu pour l'équipe. */
  dossierMessages: async (id: string, background = false) =>
    call<Message[]>(`/admin/dossiers/${pathId(id)}/messages`, background ? { headers: BACKGROUND_HEADERS } : undefined),

  sendDossierMessage: async (id: string, body: string) =>
    call<Message[]>(`/admin/dossiers/${pathId(id)}/messages`, json('POST', { body })),

  dossierOptions: () => call<DossierOptions>('/admin/dossiers/options'),

  createDossier: (payload: Record<string, string | number | null>) =>
    call<{ dossier: AdminDossier; invitation: Invitation }>('/admin/dossiers', json('POST', payload)),

  dossier: async (id: string) => call<AdminDossier>(`/admin/dossiers/${pathId(id)}`),

  /** Seuls les champs envoyés changent. */
  updateDossier: async (id: string, changes: Record<string, string | number | null>) =>
    call<AdminDossier>(`/admin/dossiers/${pathId(id)}`, json('PATCH', changes)),

  deleteDossier: async (id: string) => call<null>(`/admin/dossiers/${pathId(id)}`, { method: 'DELETE' }),

  invite: async (id: string) => call<Invitation>(`/admin/dossiers/${pathId(id)}/invitation`, { method: 'POST' }),

  addItem: async (dossierId: string, item: { label: string; help: string; required: boolean }) =>
    call<AdminDossier>(`/admin/dossiers/${pathId(dossierId)}/items`, json('POST', item)),

  updateItem: async (
    id: string,
    changes: { label?: string; help?: string; required?: boolean; status?: ItemStatus; rejection_reason?: string },
  ) => call<AdminDossier>(`/admin/items/${pathId(id)}`, json('PATCH', changes)),

  deleteItem: async (id: string) => call<AdminDossier>(`/admin/items/${pathId(id)}`, { method: 'DELETE' }),

  reorderItems: async (dossierId: string, ids: string[]) =>
    call<AdminDossier>(`/admin/dossiers/${pathId(dossierId)}/items/order`, json('PUT', { ids })),

  addPayment: async (dossierId: string, payment: { amount: number; paid_on: string; label: string }) =>
    call<AdminDossier>(`/admin/dossiers/${pathId(dossierId)}/payments`, json('POST', payment)),

  deletePayment: async (id: string) => call<AdminDossier>(`/admin/payments/${pathId(id)}`, { method: 'DELETE' }),

  deleteDocument: async (id: string) => call<AdminDossier>(`/admin/documents/${pathId(id)}`, { method: 'DELETE' }),
};

/** Adresse d'un document déposé par un client, à ouvrir ou télécharger. */
export function adminDocumentUrl(id: string): string {
  return isUuid(id) ? `${API_BASE}/admin/documents/${id}` : '#';
}

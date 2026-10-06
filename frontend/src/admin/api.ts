import { API_BASE, ApiError, request } from '../lib/api';
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

  requestCounts: () => call<RequestCounts>('/admin/requests/summary'),

  /** Ouvrir une demande « nouvelle » la fait passer « en cours ». */
  contactRequest: (id: string) => call<ContactRequest>(`/admin/requests/${id}`),

  updateRequest: (id: string, changes: { status?: RequestStatus; note?: string }) =>
    call<ContactRequest>(`/admin/requests/${id}`, json('PATCH', changes)),

  deleteRequest: (id: string) => call<null>(`/admin/requests/${id}`, { method: 'DELETE' }),

  schema: () => call<Schema>('/admin/schema'),

  section: (key: string) => call<SectionPayload>(`/admin/sections/${encodeURIComponent(key)}`),

  saveSection: (key: string, data: SectionData, version: number) =>
    call<SectionPayload>(`/admin/sections/${encodeURIComponent(key)}`, json('PUT', { data, version })),

  media: () => call<MediaItem[]>('/admin/media'),

  uploadMedia: (form: FormData) => call<MediaItem>('/admin/media', { method: 'POST', body: form }),

  updateMedia: (id: string, alt: string) => call<MediaItem>(`/admin/media/${id}`, json('PATCH', { alt })),

  deleteMedia: (id: string) => call<null>(`/admin/media/${id}`, { method: 'DELETE' }),

  /** `step` : 0 pour toutes les étapes. */
  dossiers: (filter: DossierFilter, query: string, step = 0) =>
    call<DossierList>(`/admin/dossiers?${new URLSearchParams({ filter, q: query, step: String(step) }).toString()}`),

  /** Dossiers qui demandent l'attention de l'équipe : le badge du menu. */
  dossierAlerts: () => call<{ attention: number }>('/admin/dossiers/alerts'),

  /** Le fil d'un dossier ; le lire le marque comme lu pour l'équipe. */
  dossierMessages: (id: string) => call<Message[]>(`/admin/dossiers/${id}/messages`),

  sendDossierMessage: (id: string, body: string) =>
    call<Message[]>(`/admin/dossiers/${id}/messages`, json('POST', { body })),

  dossierOptions: () => call<DossierOptions>('/admin/dossiers/options'),

  createDossier: (payload: Record<string, string | number | null>) =>
    call<{ dossier: AdminDossier; invitation: Invitation }>('/admin/dossiers', json('POST', payload)),

  dossier: (id: string) => call<AdminDossier>(`/admin/dossiers/${id}`),

  /** Seuls les champs envoyés changent. */
  updateDossier: (id: string, changes: Record<string, string | number | null>) =>
    call<AdminDossier>(`/admin/dossiers/${id}`, json('PATCH', changes)),

  deleteDossier: (id: string) => call<null>(`/admin/dossiers/${id}`, { method: 'DELETE' }),

  invite: (id: string) => call<Invitation>(`/admin/dossiers/${id}/invitation`, { method: 'POST' }),

  addItem: (dossierId: string, item: { label: string; help: string; required: boolean }) =>
    call<AdminDossier>(`/admin/dossiers/${dossierId}/items`, json('POST', item)),

  updateItem: (
    id: string,
    changes: { label?: string; help?: string; required?: boolean; status?: ItemStatus; rejection_reason?: string },
  ) => call<AdminDossier>(`/admin/items/${id}`, json('PATCH', changes)),

  deleteItem: (id: string) => call<AdminDossier>(`/admin/items/${id}`, { method: 'DELETE' }),

  reorderItems: (dossierId: string, ids: string[]) =>
    call<AdminDossier>(`/admin/dossiers/${dossierId}/items/order`, json('PUT', { ids })),

  addPayment: (dossierId: string, payment: { amount: number; paid_on: string; label: string }) =>
    call<AdminDossier>(`/admin/dossiers/${dossierId}/payments`, json('POST', payment)),

  deletePayment: (id: string) => call<AdminDossier>(`/admin/payments/${id}`, { method: 'DELETE' }),

  deleteDocument: (id: string) => call<AdminDossier>(`/admin/documents/${id}`, { method: 'DELETE' }),
};

/** Adresse d'un document déposé par un client, à ouvrir ou télécharger. */
export function adminDocumentUrl(id: string): string {
  return `${API_BASE}/admin/documents/${id}`;
}

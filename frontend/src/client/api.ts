import { API_BASE, ApiError, request, type ApiFailure, type ApiSuccess } from '../lib/api';
import type { Message } from '../dossiers/types';
import type { AccessInfo, Client, ClientState } from './types';

/*
  Appels de l'API réservés à l'espace client. Comme pour le panel, la
  session tient dans un cookie HttpOnly posé par l'API, et un 401 en cours
  de séance est traité une fois pour tout l'espace (gestionnaire enregistré
  par ClientApp) : retour à la connexion.
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

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const clientApi = {
  login: (email: string, password: string) => request<Client>('/client/login', json('POST', { email, password })),

  logout: () => request<null>('/client/logout', { method: 'POST' }),

  forgotPassword: (email: string) => request<null>('/client/password/forgot', json('POST', { email })),

  checkAccess: (token: string) => request<AccessInfo>('/client/access/check', json('POST', { token })),

  setPassword: (token: string, password: string, confirmation: string) =>
    request<Client>(
      '/client/access',
      json('POST', { token, password, password_confirmation: confirmation }),
    ),

  me: () => call<ClientState>('/client/me'),

  saveProfile: (answers: Record<string, string>) => call<ClientState>('/client/me/profile', json('PUT', { answers })),

  deleteDocument: (id: string) => call<ClientState>(`/client/documents/${id}`, { method: 'DELETE' }),

  /** Le fil de messages ; le lire le marque comme lu. */
  messages: () => call<Message[]>('/client/messages'),

  sendMessage: (body: string) => call<Message[]>('/client/messages', json('POST', { body })),
};

/** Adresse d'un document, à ouvrir dans un nouvel onglet ou à télécharger. */
export function documentUrl(id: string): string {
  return `${API_BASE}/client/documents/${id}`;
}

/**
 * Envoi d'un document, avec sa progression.
 *
 * fetch() ne sait pas suivre un envoi : XMLHttpRequest, si. Sur un réseau
 * mobile, 10 Mo peuvent prendre une minute ; sans barre de progression, le
 * client croit l'écran figé et recommence.
 */
export function uploadDocument(
  itemId: string,
  file: File,
  onProgress: (ratio: number) => void,
): { promise: Promise<ApiSuccess<ClientState>>; abort: () => void } {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<ApiSuccess<ClientState>>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    // Même domaine : le cookie de session part de lui-même.
    xhr.open('POST', `${API_BASE}/client/items/${itemId}/documents`);
    xhr.setRequestHeader('Accept', 'application/json');
    // Exigé par l'API pour toute modification (CsrfMiddleware).
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      let payload: ApiSuccess<ClientState> | ApiFailure | null = null;

      try {
        payload = JSON.parse(xhr.responseText) as ApiSuccess<ClientState> | ApiFailure;
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        resolve(payload);
        return;
      }

      if (xhr.status === 401) {
        unauthorizedHandler?.();
      }

      // 413 : refusé par le serveur web avant même PHP (fichier trop lourd).
      const fallback = xhr.status === 413 ? 'Fichier trop lourd : 10 Mo au maximum.' : "L'envoi a échoué. Réessayez.";
      const failure = payload && !payload.success ? payload : null;
      const fileError = failure?.errors?.file?.[0];

      reject(new ApiError(fileError ?? failure?.message ?? fallback, xhr.status, failure?.errors ?? {}));
    };

    xhr.onerror = () =>
      reject(new ApiError("Connexion interrompue pendant l'envoi. Vérifiez votre réseau et réessayez.", 0));
    xhr.onabort = () => reject(new ApiError('Envoi annulé.', 0));

    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

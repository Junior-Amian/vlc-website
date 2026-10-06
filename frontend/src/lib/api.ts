/**
 * Client HTTP de l'API PHP.
 *
 * En développement, VITE_API_URL n'est pas défini et les appels partent sur
 * /api, que Vite relaie vers PHP (voir le proxy dans vite.config.ts).
 * En production, le front et l'API sont sur le même domaine : /api reste
 * donc correct et aucune variable n'est nécessaire.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type ApiSuccess<T> = { success: true; message?: string; data?: T };

export type ApiFailure = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  let response: Response;

  // Un envoi de fichiers (FormData) fixe lui-même son Content-Type, avec la
  // frontière entre les parties : le forcer en JSON le rendrait illisible.
  const isForm = init?.body instanceof FormData;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Le cookie de session du panel ne part que vers le même domaine.
      credentials: 'same-origin',
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        // Exigé par l'API pour toute modification du panel (CsrfMiddleware).
        'X-Requested-With': 'XMLHttpRequest',
        ...init?.headers,
      },
    });
  } catch {
    // Coupure réseau ou API injoignable : on ne laisse pas remonter une
    // TypeError brute jusqu'au composant.
    throw new ApiError(
      "Impossible de joindre nos serveurs. Vérifiez votre connexion ou contactez-nous par WhatsApp.",
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || payload === null || payload.success === false) {
    const failure = payload as ApiFailure | null;

    throw new ApiError(
      failure?.message ?? "Une erreur est survenue. Merci de réessayer.",
      response.status,
      failure?.errors ?? {},
    );
  }

  return payload;
}

export type ContactPayload = {
  full_name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  /** Champ piège anti-robots, toujours vide chez un humain (voir ContactForm). */
  website: string;
};

export function sendContactRequest(payload: ContactPayload) {
  return request<{ id: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

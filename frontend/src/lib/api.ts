import { markActivity } from './session';

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

/** Même forme que App\Core\Uuid côté API : UUID v4 en minuscules. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Identifiant placé dans une adresse de l'API (`/admin/dossiers/${pathId(id)}`).
 *
 * L'identifiant vient souvent de l'adresse de la page, que React Router
 * décode : « ..\documents\… » y deviendrait, une fois résolu par le
 * navigateur, un appel vers une autre route du panel, avec la session de
 * l'administrateur (audit de sécurité du 22/10/2026). Tout ce qui n'est pas
 * un UUID est donc refusé avant le moindre appel. Lève une ApiError : les
 * fonctions qui l'utilisent sont `async`, pour que l'erreur arrive en
 * promesse rejetée, comme celles du serveur.
 */
export function pathId(id: string): string {
  if (!isUuid(id)) {
    throw new ApiError('Cet élément est introuvable.', 404);
  }

  return id;
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

  // Seule une réponse JSON de l'API est lue. Un document déposé par un
  // client est servi sous son propre type : même s'il contient du JSON, il
  // ne doit jamais passer pour une réponse de l'API (audit du 22/10/2026).
  const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false;
  const payload = (isJson ? await response.json().catch(() => null) : null) as
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

  // Une requête de l'utilisateur a prolongé la session côté API ; un
  // rafraîchissement automatique (X-Background), non (voir lib/session.ts).
  if (!new Headers(init?.headers).has('X-Background')) {
    markActivity();
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

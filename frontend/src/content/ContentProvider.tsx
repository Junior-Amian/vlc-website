import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_BASE } from '../lib/api';
import baselineJson from './baseline.json';
import type { SiteContent } from './types';

declare global {
  interface Window {
    /**
     * Requête du contenu à jour, lancée par un script d'index.html dès
     * l'analyse de la page, en parallèle du chargement de l'application.
     */
    __vlcContent?: Promise<unknown>;
  }
}

/*
  Contenu intégré à la compilation : celui du HTML pré-rendu.

  Il fait foi sans JavaScript, pour les moteurs qui n'exécutent pas les
  scripts, et chaque fois que l'API ne répond pas (aperçu GitHub Pages,
  panne). Pour le rafraîchir avant une compilation : npm run content:pull.
*/
export const baseline = baselineJson as SiteContent;

type ContentState = {
  content: SiteContent;
  /** Augmente à chaque application d'un contenu reçu de l'API. */
  revision: number;
};

const ContentContext = createContext<ContentState>({ content: baseline, revision: 0 });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Superpose le contenu reçu au contenu compilé, champ par champ.
 *
 * Un champ absent de la réponse (section jamais enregistrée, champ ajouté au
 * site avant de l'être à l'API) garde sa valeur compilée : le site ne
 * reçoit jamais un objet incomplet. Les listes, elles, sont remplacées en
 * bloc.
 */
function merge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }

  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(base)) {
    if (key in override) {
      result[key] = merge((base as Record<string, unknown>)[key], override[key]);
    }
  }

  return result as T;
}

async function fetchLiveContent(): Promise<unknown> {
  // La requête anticipée d'index.html vise /api : inutile si l'API est ailleurs.
  const pending =
    window.__vlcContent && API_BASE === '/api'
      ? window.__vlcContent
      : fetch(`${API_BASE}/content`, { headers: { Accept: 'application/json' } })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null);

  const payload = await pending;

  return isPlainObject(payload) && payload.success === true ? payload.data : null;
}

/**
 * Fournit le contenu du site aux sections de la page.
 *
 * Le premier rendu utilise toujours le contenu compilé : c'est celui du HTML
 * pré-rendu, et React exige que l'hydratation retrouve exactement le même
 * balisage. Le contenu à jour (modifié dans le panel depuis la dernière
 * compilation) est appliqué juste après.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>({ content: baseline, revision: 0 });

  useEffect(() => {
    let cancelled = false;

    fetchLiveContent().then((live) => {
      if (!cancelled && isPlainObject(live)) {
        setState((current) => ({
          content: merge(baseline, live),
          revision: current.revision + 1,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <ContentContext.Provider value={state}>{children}</ContentContext.Provider>;
}

export function useContent(): SiteContent {
  return useContext(ContentContext).content;
}

/** Change quand le contenu à jour remplace le contenu compilé. */
export function useContentRevision(): number {
  return useContext(ContentContext).revision;
}

import { useEffect } from 'react';
import { API_BASE } from './api';

/*
  Mesure d'audience du site, sans cookie ni service tiers.

  Envoie à l'API (POST /api/track) :
  - une page vue à chaque chargement ;
  - chaque section de la page atteinte (une fois par visite de page) ;
  - chaque prise de contact : appel, WhatsApp, email, formulaire envoyé.

  Rien n'identifie le visiteur côté navigateur : c'est le serveur qui calcule
  une empreinte anonyme, renouvelée chaque jour (api/app/Analytics/VisitorId.php).
  Les navigateurs qui demandent à ne pas être suivis (Do Not Track, Global
  Privacy Control) n'envoient rien.
*/

/** Mêmes listes que TrackController.php : le serveur ignore tout le reste. */
const SECTIONS = ['accueil', 'fondateurs', 'services', 'college-universel', 'temoignages', 'espace-client', 'contact'];

export type ContactAction = 'call' | 'whatsapp' | 'email' | 'contact_form';

type TrackedEvent = { type: 'pageview' | 'section' | 'action'; name: string };

let queue: TrackedEvent[] = [];
let flushTimer: number | undefined;

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };

  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

function send(events: TrackedEvent[], referrer?: string): void {
  if (events.length === 0 || optedOut()) {
    return;
  }

  const body = JSON.stringify({ events, referrer });

  // sendBeacon survit à la fermeture de l'onglet ; fetch keepalive sinon.
  const sent =
    typeof navigator.sendBeacon === 'function' &&
    navigator.sendBeacon(`${API_BASE}/track`, new Blob([body], { type: 'application/json' }));

  if (!sent) {
    fetch(`${API_BASE}/track`, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);
  }
}

function flush(): void {
  window.clearTimeout(flushTimer);
  flushTimer = undefined;
  send(queue);
  queue = [];
}

/** Regroupe les événements : un envoi toutes les quelques secondes au plus. */
function enqueue(event: TrackedEvent): void {
  queue.push(event);

  if (flushTimer === undefined) {
    flushTimer = window.setTimeout(flush, 5000);
  }
}

/** Prise de contact : envoyée aussitôt, le visiteur peut quitter la page. */
export function trackAction(action: ContactAction): void {
  queue.push({ type: 'action', name: action });
  flush();
}

function actionFor(link: HTMLAnchorElement): ContactAction | null {
  const href = link.getAttribute('href') ?? '';

  if (href.startsWith('tel:')) return 'call';
  if (href.startsWith('mailto:')) return 'email';
  if (href.includes('wa.me/')) return 'whatsapp';

  return null;
}

/**
 * Active la mesure sur les pages publiques (appelé par la coquille du site,
 * jamais par le panel). `pathname` relance la page vue à chaque navigation.
 */
export function useAnalytics(pathname: string): void {
  useEffect(() => {
    send([{ type: 'pageview', name: pathname }], document.referrer || undefined);

    // Une section compte comme vue quand elle traverse le milieu de l'écran.
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;

          if (entry.isIntersecting && !seen.has(id)) {
            seen.add(id);
            enqueue({ type: 'section', name: id });
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );

    SECTIONS.map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
      .forEach((element) => observer.observe(element));

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a');
      const action = link ? actionFor(link) : null;

      if (action) {
        trackAction(action);
      }
    };

    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      observer.disconnect();
      flush();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [pathname]);
}

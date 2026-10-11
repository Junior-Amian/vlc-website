import { useEffect, useRef } from 'react';

/**
 * Durée d'une session sans activité, panel et espace client (demande du
 * 11/10/2026). Même valeur que le TTL de AdminSession et ClientSession côté
 * API : c'est l'API qui fait foi, ce minuteur ne sert qu'à ne pas laisser un
 * dossier affiché à l'écran une fois la session close (ordinateur partagé).
 */
export const SESSION_IDLE_MS = 20 * 60 * 1000;

/**
 * En-tête des rafraîchissements automatiques (fil de messages, compteurs du
 * panel) : l'API ne compte pas ces requêtes comme une activité et ne
 * prolonge pas la session (SessionCookie::refresh).
 */
export const BACKGROUND_HEADERS = { 'X-Background': '1' } as const;

/** Une saisie ou un clic sans requête depuis ce délai prolonge la session. */
const PING_AFTER_MS = 5 * 60 * 1000;

let lastActivity = Date.now();

/** Une requête réussie, faite par l'utilisateur : la session vient d'être prolongée. */
export function markActivity(): void {
  lastActivity = Date.now();
}

/**
 * Ferme l'écran après 20 minutes sans activité, et garde la session ouverte
 * tant que l'utilisateur travaille.
 *
 * - Une saisie ou un clic, si aucune requête n'est partie depuis 5 minutes,
 *   envoie `ping` : celui qui rédige un long message ou une section du panel
 *   n'est pas coupé en pleine saisie.
 * - Passé 20 minutes sans requête de l'utilisateur, `onExpire` ramène à
 *   l'écran de connexion (« Votre session a expiré »). Le minuteur tourne
 *   aussi onglet en arrière-plan : au retour, l'écran est déjà fermé.
 */
export function useIdleSession({ active, ping, onExpire }: { active: boolean; ping: () => Promise<unknown>; onExpire: () => void }): void {
  // Les fonctions changent à chaque rendu ; seule `active` relance l'effet.
  const pingRef = useRef(ping);
  const expireRef = useRef(onExpire);
  pingRef.current = ping;
  expireRef.current = onExpire;

  useEffect(() => {
    if (!active) {
      return;
    }

    markActivity();
    let pinging = false;

    const onInteract = () => {
      if (pinging || Date.now() - lastActivity < PING_AFTER_MS) {
        return;
      }

      pinging = true;
      pingRef.current()
        .catch(() => undefined)
        .finally(() => {
          pinging = false;
        });
    };

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= SESSION_IDLE_MS) {
        expireRef.current();
      }
    }, 15_000);

    window.addEventListener('keydown', onInteract, { passive: true });
    window.addEventListener('pointerdown', onInteract, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('pointerdown', onInteract);
    };
  }, [active]);
}

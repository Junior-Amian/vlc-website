type MarkProps = {
  /** Position, taille, rotation et couleur (via currentColor) à fournir par l'appelant. */
  className?: string;
};

/*
  Filigranes décoratifs pour la landing page : des traits très fins, en
  arrière-plan, jamais du texte ni du contenu. Toujours aria-hidden, jamais
  interactifs, et l'opacité (portée par la classe de couleur transmise par
  l'appelant, par exemple text-primary/5) doit rester faible pour ne pas
  concurrencer le texte au-dessus.

  Trois motifs distincts, utilisés chacun à un seul endroit, pour ne pas
  reproduire l'erreur de la refonte refusée (un motif unique martelé sur
  toute la page) : les anneaux pour le couple, la rose des vents et la
  trajectoire pour le voyage.
*/

/** Deux anneaux entrelacés : symbole d'union, pour la section du couple fondateur. */
export function RingsMark({ className = '' }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 120"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
    >
      <circle cx="72" cy="60" r="52" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="128" cy="60" r="52" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/** Rose des vents : cercle, graduations cardinales et pointeur nord, pour le voyage. */
export function CompassMark({ className = '' }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
    >
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="2" />
      <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 8" />
      <path
        d="M100 8 L100 28 M100 172 L100 192 M8 100 L28 100 M172 100 L192 100"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M100 34 L110 100 L100 92 L90 100 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Trajectoire aérienne en pointillés, avion à l'arrivée : pour un fond
 * sombre. L'avion reprend le tracé de celui de l'ancienne bannière
 * (avant son remplacement par une photo), pour rester dans l'esprit déjà
 * approuvé par le client.
 */
export function RouteMark({ className = '' }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 140"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M14 118 Q120 -10 226 46"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <circle cx="14" cy="118" r="5" fill="currentColor" />
      <g transform="translate(226 46) rotate(35)">
        <path
          d="M0,-12 L5,0 L16,4 L5,6 L3,14 L0,11 L-3,14 L-5,6 L-16,4 L-5,0 Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

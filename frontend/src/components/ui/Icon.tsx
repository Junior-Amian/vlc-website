type IconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  /** Taille en pixels ; par défaut la taille de police héritée. */
  size?: number;
};

/**
 * Icône Material Symbols.
 *
 * Purement décorative : masquée aux lecteurs d'écran, le sens doit toujours
 * être porté par le texte voisin.
 */
export default function Icon({ name, className = '', filled = false, size }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`}
      style={size ? { fontSize: `${size}px` } : undefined}
    >
      {name}
    </span>
  );
}

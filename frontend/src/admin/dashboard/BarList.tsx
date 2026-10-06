import { formatNumber, formatPercent } from '../../lib/format';

export type BarRow = {
  label: string;
  value: number;
  /** Texte secondaire à côté du chiffre (« 42 % »). */
  note?: string;
};

/**
 * Classement en barres horizontales, d'une seule teinte : la longueur porte
 * la grandeur, le chiffre est écrit au bout (dans la couleur du texte, jamais
 * dans celle de la barre). Barres fines, bout arrondi de 4 px, départ franc.
 *
 * `max` fixe l'échelle (le nombre de visiteurs pour une part de visiteurs) ;
 * à défaut, la plus grande valeur remplit la piste.
 */
export default function BarList({
  rows,
  max,
  empty = 'Rien à afficher sur cette période.',
}: {
  rows: BarRow[];
  max?: number;
  empty?: string;
}) {
  const scale = max ?? Math.max(0, ...rows.map((row) => row.value));

  if (rows.length === 0 || rows.every((row) => row.value === 0)) {
    return <p className="text-sm text-on-surface-variant">{empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => {
        const ratio = scale > 0 ? row.value / scale : 0;

        return (
          <li key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-on-surface">{row.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-primary">{formatNumber(row.value)}</span>
                {row.note && <span className="ml-1.5 text-on-surface-variant">{row.note}</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-r-[4px] bg-surface-container-low">
              <div
                className="h-full rounded-r-[4px] bg-brand-blue transition-[width] duration-500"
                style={{ width: `${Math.max(ratio > 0 ? 1.5 : 0, ratio * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Part d'un total, prête à servir de `note`. */
export function share(value: number, total: number): string | undefined {
  return total > 0 ? formatPercent(value / total) : undefined;
}

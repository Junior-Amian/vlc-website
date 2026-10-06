/* Mise en forme des chiffres et des dates, à la française (panel et espace client). */

const numberFormat = new Intl.NumberFormat('fr-FR');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** « 850 000 FCFA ». Les montants des dossiers sont en francs CFA, sans centimes. */
export function formatMoney(value: number): string {
  // Intl sépare les milliers par une espace fine insécable, que Poppins
  // dessine à peine (« 1200000 ») : une espace insécable ordinaire se lit mieux.
  return `${numberFormat.format(value).replace(/ /g, ' ')} FCFA`;
}

/** « 3 octobre 2026 », à partir d'une date (AAAA-MM-JJ) ou d'un horodatage de la base. */
export function formatLongDate(value: string): string {
  const date = parseDbDate(value.length === 10 ? `${value} 12:00:00` : value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan' });
}

export function formatPercent(ratio: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: ratio < 0.1 ? 1 : 0 }).format(ratio * 100)} %`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    // Jamais « 0 Ko » : un fichier non vide pèse au moins 1 Ko à l'affichage.
    return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} Ko`;
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} Mo`;
}

/** « 3 oct. », ou « vendredi 3 octobre » en version longue. */
export function formatDay(date: string, long = false): string {
  const value = new Date(`${date}T12:00:00Z`);

  return value.toLocaleDateString(
    'fr-FR',
    long
      ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' },
  );
}

/**
 * Date telle que la base la renvoie (« 2026-10-02 23:19:11 », en UTC,
 * l'heure d'Abidjan : voir Database.php), en objet Date.
 */
function parseDbDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

/** « 2 octobre à 23:19 », à partir d'une date de la base. */
export function formatDate(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = parseDbDate(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Abidjan',
      });
}

/** « il y a 5 minutes », à partir d'une date de la base. */
export function timeAgo(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = parseDbDate(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);

  if (Number.isNaN(seconds)) {
    return null;
  }

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const format = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }

  return "à l'instant";
}

/**
 * Évolution d'une période à l'autre. null : pas de point de comparaison
 * (période précédente vide).
 */
export function change(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  return (current - previous) / previous;
}

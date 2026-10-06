import type { RequestFilter, RequestStatus } from '../types';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Nouvelle',
  in_progress: 'En cours',
  done: 'Traitée',
  spam: 'Indésirable',
};

/** Pastille d'état : le libellé est toujours écrit, la couleur ne fait que l'appuyer. */
export const STATUS_BADGE: Record<RequestStatus, string> = {
  new: 'bg-secondary-fixed text-on-secondary-fixed',
  in_progress: 'bg-brand-blue-soft text-brand-blue',
  done: 'bg-brand-green-soft text-brand-green',
  spam: 'bg-surface-container text-on-surface-variant',
};

export const FILTERS: { value: RequestFilter; label: string }[] = [
  { value: 'open', label: 'À traiter' },
  { value: 'done', label: 'Traitées' },
  { value: 'spam', label: 'Indésirables' },
  { value: 'all', label: 'Toutes' },
];

/**
 * Numéro au format attendu par wa.me : indicatif compris, chiffres seuls.
 *
 * Les visiteurs ivoiriens écrivent souvent leur numéro sans indicatif
 * (« 07 07 12 34 56 ») : on ajoute alors celui de la Côte d'Ivoire (225),
 * en gardant le 0 initial, qui fait partie du numéro depuis 2021.
 */
export function whatsappNumber(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) return `225${digits}`;
  if (digits.length === 8) return `225${digits}`;

  return digits;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

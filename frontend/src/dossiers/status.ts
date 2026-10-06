import type { ChecklistItem, Dossier, ItemStatus } from './types';

/*
  État d'une pièce, tel que le client et le panel le lisent. Une couleur
  par état, toujours doublée d'une icône et d'un mot : jamais la couleur
  seule (daltonisme, écran au soleil).
*/
export const ITEM_STATUS: Record<ItemStatus, { label: string; icon: string; chip: string }> = {
  missing: {
    label: 'À fournir',
    icon: 'upload',
    chip: 'border-surface-container-high bg-surface-container-low text-on-surface-variant',
  },
  received: {
    label: 'En vérification',
    icon: 'hourglass_top',
    chip: 'border-brand-blue/15 bg-brand-blue-soft text-brand-blue',
  },
  validated: {
    label: 'Validée',
    icon: 'check_circle',
    chip: 'border-brand-green/20 bg-brand-green-soft text-brand-green',
  },
  rejected: {
    label: 'À refaire',
    icon: 'error',
    chip: 'border-brand-red/20 bg-brand-red-soft text-brand-red-ink',
  },
};

/** Pièces qui attendent une action du client. */
export function itemsToDo(dossier: Dossier): ChecklistItem[] {
  return dossier.checklist.filter((item) => item.status === 'rejected' || (item.status === 'missing' && item.required));
}

/** Avancement des pièces obligatoires : validées sur demandées. */
export function checklistProgress(dossier: Dossier): { validated: number; required: number } {
  const required = dossier.checklist.filter((item) => item.required);

  return {
    validated: required.filter((item) => item.status === 'validated').length,
    required: required.length,
  };
}

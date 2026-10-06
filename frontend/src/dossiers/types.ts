/*
  Dossier d'un client, tel que l'API le renvoie (api/app/Dossiers/DossierView.php).
  Forme commune à l'espace client et au panel : le panel la reçoit enrichie
  (voir AdminDossier dans admin/types.ts).
*/

export type Step = { number: number; label: string; description: string };

export type ItemStatus = 'missing' | 'received' | 'validated' | 'rejected';

export type DocumentFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  help: string;
  required: boolean;
  status: ItemStatus;
  rejectionReason: string | null;
  documents: DocumentFile[];
};

export type Payment = { id: string; amount: number; paidOn: string; label: string };

export type Finance = {
  /** null : montant pas encore fixé. */
  total: number | null;
  paid: number;
  balance: number | null;
  payments: Payment[];
};

export type Dossier = {
  id: string;
  reference: string;
  service: { slug: string; label: string };
  country: string;
  step: number;
  stepChangedAt: string;
  steps: Step[];
  checklist: ChecklistItem[];
  finance: Finance;
  createdAt: string;
  updatedAt: string;
};

/** Message du fil d'un dossier (api/app/Models/DossierMessage.php). */
export type Message = {
  id: string;
  author: 'client' | 'team';
  /** Prénom du membre de l'équipe ; null pour un message du client. */
  authorName: string | null;
  body: string;
  createdAt: string;
};

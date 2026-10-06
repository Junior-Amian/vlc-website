import { useState } from 'react';
import Icon from '../../components/ui/Icon';
import { whatsappLink } from '../../data/site';
import { formatDate } from '../../lib/format';
import { firstName, whatsappNumber } from '../requests/status';
import type { Invitation } from '../types';
import { buttonClass, Notice } from '../ui';

/**
 * Lien d'invitation tout juste créé : l'email part de lui-même, mais la
 * fonction mail() d'un mutualisé finit souvent en courrier indésirable. Le
 * lien s'affiche donc aussi, à copier ou à envoyer par WhatsApp.
 *
 * Il n'est montré qu'une fois : l'API n'en garde que l'empreinte. Pour un
 * nouveau lien, « Renvoyer l'invitation » annule le précédent.
 */
export default function InvitationLink({
  invitation,
  clientName,
  phone,
}: {
  invitation: Invitation;
  clientName: string;
  phone: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const message = `Bonjour ${firstName(clientName)}, votre dossier VISILION est ouvert. Créez votre accès à votre espace client avec ce lien (valable 7 jours) : ${invitation.url}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-green/25 bg-brand-green-soft/60 p-4">
      <Notice tone={invitation.emailSent ? 'success' : 'info'}>
        {invitation.emailSent
          ? `Invitation envoyée par email. Le lien est valable jusqu'au ${formatDate(invitation.expiresAt)}.`
          : "L'email n'a pas pu partir : transmettez le lien ci-dessous au client."}
      </Notice>

      <label htmlFor="lien-invitation" className="text-sm font-semibold text-primary">
        Lien d'invitation
      </label>
      <input
        id="lien-invitation"
        readOnly
        value={invitation.url}
        onFocus={(event) => event.target.select()}
        className="w-full rounded-xl border border-surface-container-high bg-white px-3.5 py-2.5 text-sm text-on-surface"
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={buttonClass.secondary}>
          <Icon name={copied ? 'check' : 'content_copy'} size={18} />
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
        {phone && (
          <a href={whatsappLink(whatsappNumber(phone), message)} target="_blank" rel="noopener noreferrer" className={buttonClass.secondary}>
            <Icon name="chat" size={18} />
            Envoyer par WhatsApp
          </a>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? 'Lien copié dans le presse-papiers.' : ''}
      </p>
    </div>
  );
}

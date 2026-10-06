import { MessageComposer, MessageList, useMessages } from '../../dossiers/MessageThread';
import { adminApi } from '../api';
import { useAdmin } from '../AdminContext';
import type { AdminDossier } from '../types';
import { Notice, Panel, Spinner } from '../ui';

/**
 * Messagerie du dossier, côté équipe : le même fil que celui du client.
 * L'ouvrir le marque comme lu pour toute l'équipe ; une réponse prévient le
 * client par email (s'il a activé son espace).
 */
export default function MessagesPanel({ dossier }: { dossier: AdminDossier }) {
  const { refreshDossierAlerts } = useAdmin();
  const { messages, setMessages, error } = useMessages(async () => {
    const response = await adminApi.dossierMessages(dossier.id);
    refreshDossierAlerts();

    return response.data ?? [];
  });

  return (
    <Panel
      title="Messages"
      subtitle={
        dossier.client.active
          ? 'Le client lit vos réponses dans son espace et en est prévenu par email.'
          : "Le client lira vos messages une fois son espace activé : il n'est pas prévenu par email d'ici là."
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      {messages === null && !error && <Spinner label="Chargement des messages…" />}

      {messages !== null && messages.length === 0 && (
        <p className="text-sm text-on-surface-variant">Aucun message pour l'instant.</p>
      )}

      {messages !== null && messages.length > 0 && (
        // Fil long : il défile dans le bloc, la saisie reste en vue.
        <div className="max-h-[28rem] overflow-y-auto rounded-xl bg-surface-container-low p-4">
          <MessageList messages={messages} viewer="team" />
        </div>
      )}

      <MessageComposer
        placeholder={`Votre message à ${dossier.client.fullName.split(' ')[0] || 'votre client'}…`}
        onSend={async (body) => {
          const response = await adminApi.sendDossierMessage(dossier.id, body);
          setMessages(response.data ?? []);
        }}
      />
    </Panel>
  );
}

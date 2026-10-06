import { useEffect, useRef } from 'react';
import Icon from '../../components/ui/Icon';
import { Notice, Spinner } from '../../components/ui/controls';
import { clientApi } from '../api';
import { useClient } from '../ClientContext';
import { MessageComposer, MessageList, useMessages } from '../../dossiers/MessageThread';
import { Card, PageTitle } from '../ui';

/**
 * Messagerie avec l'équipe : une question sur une pièce, un rendez-vous, un
 * paiement. Les réponses de l'équipe arrivent ici, et le client en est
 * prévenu par email.
 */
export default function MessagesPage() {
  const { dossier, markMessagesRead } = useClient();
  const { messages, setMessages, error } = useMessages(async () => {
    const response = await clientApi.messages();
    markMessagesRead();

    return response.data ?? [];
  });
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;

  // Le dernier message en vue, à l'ouverture et à chaque nouveau message.
  useEffect(() => {
    if (count > 0) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [count]);

  if (!dossier) {
    return <PageTitle title="Messages">Votre dossier n'est pas encore disponible.</PageTitle>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Messages">
        Une question sur votre dossier ? Écrivez à votre conseiller : il vous répond ici, et vous êtes prévenu par email.
      </PageTitle>

      {error && <Notice tone="error">{error}</Notice>}

      <Card className="flex flex-col gap-6">
        {messages === null && !error && <Spinner label="Chargement des messages…" />}

        {messages !== null && messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
              <Icon name="chat" size={24} />
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">
              Aucun message pour l'instant. Votre premier message part directement à votre conseiller.
            </p>
          </div>
        )}

        {messages !== null && messages.length > 0 && <MessageList messages={messages} viewer="client" />}

        <div ref={endRef} className="border-t border-surface-container pt-5">
          <MessageComposer
            placeholder="Votre message à votre conseiller…"
            onSend={async (body) => {
              const response = await clientApi.sendMessage(body);
              setMessages(response.data ?? []);
            }}
          />
        </div>
      </Card>
    </div>
  );
}

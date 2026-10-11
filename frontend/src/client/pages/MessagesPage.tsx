import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { Notice, Spinner } from '../../components/ui/controls';
import { clientApi } from '../api';
import { useClient } from '../ClientContext';
import { checklistProgress } from '../../dossiers/status';
import type { Dossier } from '../../dossiers/types';
import { MessageComposer, MessageList, useMessages } from '../../dossiers/MessageThread';
import { Card, PageTitle, ProgressBar } from '../ui';

/**
 * Messagerie avec l'équipe : une question sur une pièce, un rendez-vous, un
 * paiement. Les réponses de l'équipe arrivent ici, et le client en est
 * prévenu par email.
 *
 * Sur grand écran (refonte du 10/10/2026), la conversation occupe toute la
 * hauteur de l'écran, comme une messagerie de bureau : le fil défile seul,
 * la zone de saisie reste en bas. À partir de xl, le dossier est rappelé à
 * droite, pour écrire sans changer de page. Au téléphone, la page défile
 * normalement.
 */
export default function MessagesPage() {
  const { dossier, markMessagesRead } = useClient();
  const { messages, setMessages, error } = useMessages(async (background) => {
    const response = await clientApi.messages(background);
    markMessagesRead();

    return response.data ?? [];
  });
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;
  const seen = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /*
    Le dernier message en vue, à l'ouverture et à chaque nouveau message :
    en bas du fil quand il défile seul (grand écran), sinon en faisant
    défiler la page jusqu'à la zone de saisie.
  */
  useEffect(() => {
    if (count === 0) {
      return;
    }

    const list = listRef.current;

    if (list && list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY !== 'visible') {
      list.scrollTop = list.scrollHeight;
    } else {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [count]);

  /*
    Une réponse du conseiller qui arrive pendant la lecture (rafraîchissement
    toutes les 30 s) est annoncée aux lecteurs d'écran. Pas au chargement du
    fil, ni pour les messages que le client vient d'envoyer.
  */
  useEffect(() => {
    if (messages === null) {
      return;
    }

    if (seen.current !== null && messages.length > seen.current) {
      const fresh = messages.slice(seen.current).filter((message) => message.author === 'team');

      if (fresh.length > 0) {
        setAnnouncement(fresh.length > 1 ? `${fresh.length} nouveaux messages de votre conseiller.` : 'Nouveau message de votre conseiller.');
      }
    }

    seen.current = messages.length;
  }, [messages]);

  if (!dossier) {
    return <PageTitle title="Messages">Votre dossier n'est pas encore disponible.</PageTitle>;
  }

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100dvh-5.5rem)] lg:min-h-[34rem]">
      <PageTitle title="Messages">
        Une question sur votre dossier ? Écrivez à votre conseiller : il vous répond ici, et vous êtes prévenu par email.
      </PageTitle>

      {error && <Notice tone="error">{error}</Notice>}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid items-start gap-5 lg:min-h-0 lg:flex-1 lg:items-stretch xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        {/* Même aspect qu'une Card ; sans marge intérieure, pour que le fil défile jusqu'aux bords. */}
        <section
          aria-label="Conversation avec votre conseiller"
          className="flex flex-col overflow-hidden rounded-3xl border border-surface-container bg-white shadow-ambient lg:min-h-0"
        >
          <header className="hidden items-center gap-3 border-b border-surface-container px-8 py-4 lg:flex">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-brand-yellow">
              <Icon name="chat" size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">Votre conseiller VISILION</p>
              <p className="text-xs text-on-surface-variant">Dossier {dossier.reference}</p>
            </div>
          </header>

          <div ref={listRef} className="flex flex-col px-5 py-5 sm:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-8 lg:py-6">
            {messages === null && !error && <Spinner label="Chargement des messages…" />}

            {messages !== null && messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-6 text-center lg:my-auto">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                  <Icon name="chat" size={24} />
                </span>
                <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">
                  Aucun message pour l'instant. Votre premier message part directement à votre conseiller.
                </p>
              </div>
            )}

            {messages !== null && messages.length > 0 && <MessageList messages={messages} viewer="client" />}
          </div>

          <div ref={endRef} className="border-t border-surface-container bg-white px-5 py-4 sm:px-6 lg:px-8 lg:py-5">
            <MessageComposer
              placeholder="Votre message à votre conseiller…"
              onSend={async (body) => {
                const response = await clientApi.sendMessage(body);
                setMessages(response.data ?? []);
              }}
            />
          </div>
        </section>

        <aside className="hidden xl:block">
          <DossierBrief dossier={dossier} />
        </aside>
      </div>
    </div>
  );
}

/** Le dossier rappelé à côté de la conversation (xl). */
function DossierBrief({ dossier }: { dossier: Dossier }) {
  const current = dossier.steps.find((step) => step.number === dossier.step);
  const { validated, required } = checklistProgress(dossier);

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-primary">Votre dossier</h2>
        <p className="text-[0.9375rem] font-semibold leading-snug text-primary">{dossier.service.label}</p>
        <p className="text-sm tabular-nums text-on-surface-variant">{dossier.reference}</p>
      </div>

      <div className="flex flex-col gap-1 border-t border-surface-container pt-4">
        <p className="text-xs text-on-surface-variant">
          Étape {dossier.step} sur {dossier.steps.length}
        </p>
        <p className="text-[0.9375rem] font-semibold text-primary">{current?.label}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-surface-container pt-4">
        <p className="flex items-baseline justify-between gap-3 text-sm text-on-surface-variant">
          Pièces validées
          <span className="font-bold tabular-nums text-primary">
            {validated} / {required}
          </span>
        </p>
        <ProgressBar value={required > 0 ? validated / required : 0} label="Pièces obligatoires validées" tone="green" />
        <Link
          to="/espace-client/documents"
          className="mt-1 inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-secondary-ink hover:underline"
        >
          Voir mes documents
          <Icon name="arrow_forward" size={18} />
        </Link>
      </div>
    </Card>
  );
}

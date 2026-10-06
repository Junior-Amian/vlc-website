import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Icon from '../components/ui/Icon';
import { ButtonSpinner, buttonClass, inputClass, Notice } from '../components/ui/controls';
import { ApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Message } from './types';

/** Longueur maximale d'un message (DossierMessage::MAX_LENGTH côté PHP). */
const MAX_LENGTH = 2000;

/** Intervalle de rafraîchissement du fil quand l'onglet est visible. */
const REFRESH_MS = 30_000;

/**
 * Fil de messages d'un dossier, partagé par l'espace client et le panel.
 *
 * `viewer` : qui regarde. Ses propres messages sont à droite, en marine ;
 * ceux de l'autre partie à gauche, sur fond clair, comme dans toutes les
 * messageries que les clients utilisent déjà.
 */
export function MessageList({ messages, viewer }: { messages: Message[]; viewer: 'client' | 'team' }) {
  return (
    <ol className="flex flex-col gap-4" aria-label="Messages">
      {messages.map((message) => {
        const own = message.author === viewer;
        const who =
          message.author === 'team'
            ? `${message.authorName ?? 'Votre conseiller'} · VISILION`
            : viewer === 'team'
              ? 'Le client'
              : 'Vous';

        return (
          <li key={message.id} className={`flex flex-col gap-1 ${own ? 'items-end' : 'items-start'}`}>
            <p
              className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed sm:max-w-[75%] ${
                own
                  ? 'rounded-br-md bg-primary text-white'
                  : 'rounded-bl-md border border-surface-container bg-white text-on-surface'
              }`}
            >
              {message.body}
            </p>
            <p className="px-1 text-xs text-on-surface-variant">
              {who} · <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Zone de saisie. Entrée va à la ligne (au téléphone, c'est la seule touche
 * pour le faire) ; Ctrl + Entrée envoie, au clavier.
 */
export function MessageComposer({
  onSend,
  placeholder,
}: {
  onSend: (body: string) => Promise<void>;
  placeholder: string;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const over = body.length > MAX_LENGTH;

  async function submit(event?: FormEvent) {
    event?.preventDefault();

    if (!body.trim() || over || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onSend(body);
      setBody('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Le message n'est pas parti. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {error && (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}
      <label htmlFor="nouveau-message" className="sr-only">
        Votre message
      </label>
      <textarea
        id="nouveau-message"
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-invalid={over}
        className={`${inputClass} resize-y leading-relaxed`}
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs tabular-nums ${over ? 'font-bold text-brand-red-ink' : 'text-on-surface-variant'}`}>
          {body.length > MAX_LENGTH - 200 ? `${body.length} / ${MAX_LENGTH}` : ''}
        </span>
        <button type="submit" disabled={busy || !body.trim() || over} className={buttonClass.primary}>
          {busy ? <ButtonSpinner /> : <Icon name="send" size={18} />}
          Envoyer
        </button>
      </div>
    </form>
  );
}

/**
 * Charge le fil, puis le rafraîchit toutes les 30 secondes tant que la page
 * est visible : une réponse arrive sans recharger. Chaque lecture marque le
 * fil comme lu côté serveur.
 */
export function useMessages(load: () => Promise<Message[]>) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;

    const refresh = () =>
      loadRef
        .current()
        .then((list) => {
          if (!cancelled) {
            setMessages(list);
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : 'Les messages sont indisponibles pour le moment.');
          }
        });

    refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { messages, setMessages, error };
}

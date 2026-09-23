import { useState, type FormEvent, type ReactNode } from 'react';
import Icon from '../ui/Icon';
import { ApiError, sendContactRequest, type ContactPayload } from '../../lib/api';
import { whatsappLink } from '../../data/site';

type Status = 'idle' | 'sending' | 'sent';
type FieldErrors = Partial<Record<keyof ContactPayload, string>>;

/* Mêmes limites que l'API (api/app/Controllers/ContactController.php). */
const PHONE_PATTERN = /^\+?[0-9 ().-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 3000;

/**
 * Vérification immédiate, avant tout envoi : le visiteur corrige sa saisie
 * sans aller-retour réseau. L'API revalide de toute façon côté serveur.
 */
function validate(payload: ContactPayload): FieldErrors {
  const errors: FieldErrors = {};

  if (payload.full_name.length < 2) {
    errors.full_name = 'Indiquez votre nom et votre prénom.';
  }

  if (!EMAIL_PATTERN.test(payload.email)) {
    errors.email = 'Indiquez une adresse email valide.';
  }

  if (payload.phone.length < 8 || !PHONE_PATTERN.test(payload.phone)) {
    errors.phone = 'Indiquez un numéro valide, par exemple +225 07 00 00 00 00.';
  }

  if (payload.message.length < 10) {
    errors.message = 'Décrivez votre projet en quelques mots (10 caractères minimum).';
  }

  if (!payload.consent) {
    errors.consent = 'Votre accord est nécessaire pour que nous puissions vous recontacter.';
  }

  return errors;
}

function readPayload(form: HTMLFormElement): ContactPayload {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? '').trim();

  return {
    full_name: text('full_name'),
    email: text('email'),
    phone: text('phone'),
    message: text('message'),
    consent: data.get('consent') === 'on',
  };
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-xl border bg-surface px-4 text-base text-on-surface placeholder:text-on-surface-variant/70 transition-colors focus:bg-white focus:outline-none focus:ring-2 sm:text-sm ${
    hasError
      ? 'border-red-600 focus:ring-red-600/30'
      : 'border-surface-container-high hover:border-on-surface-variant/40 focus:border-secondary focus:ring-secondary/25'
  }`;
}

type FieldProps = {
  id: keyof ContactPayload;
  label: string;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
};

/** Libellé au-dessus, champ, puis message d'erreur en dessous. */
function Field({ id, label, error, className = '', children }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-semibold text-on-surface" htmlFor={id}>
        {label} <span className="text-secondary" aria-hidden="true">*</span>
      </label>
      {children(error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-red-700">
          <Icon name="error" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Formulaire de contact.
 *
 * Volontairement réduit à l'essentiel : nom, email, téléphone et message.
 * La qualification du projet se fait lors du rappel, pas ici : un formulaire
 * court est nettement mieux rempli qu'un formulaire exhaustif.
 */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Texte prérempli pour WhatsApp si l'API est injoignable.
  const [whatsappDraft, setWhatsappDraft] = useState<string | null>(null);
  const [messageLength, setMessageLength] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = readPayload(form);
    const errors = validate(payload);

    setGlobalError(null);
    setWhatsappDraft(null);
    setFieldErrors(errors);

    const firstInvalid = Object.keys(errors)[0];

    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setStatus('sending');

    try {
      await sendContactRequest(payload);

      form.reset();
      setMessageLength(0);
      setStatus('sent');
    } catch (error) {
      setStatus('idle');

      if (error instanceof ApiError) {
        setGlobalError(error.message);
        // L'API renvoie un tableau de motifs par champ : on affiche le premier.
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, messages]) => [field, messages[0]]),
          ) as FieldErrors,
        );

        // Serveur injoignable ou indisponible : on propose de passer par
        // WhatsApp avec le message déjà rédigé, pour ne pas perdre la demande.
        if (error.status === 0 || error.status >= 500) {
          setWhatsappDraft(
            `Bonjour VISILION, je suis ${payload.full_name} (${payload.phone}, ${payload.email}).\n\n${payload.message}`,
          );
        }
        return;
      }

      setGlobalError('Une erreur inattendue est survenue. Merci de réessayer.');
    }
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-3xl border border-brand-green/20 bg-brand-green-soft p-8 text-center sm:p-12"
      >
        <span className="pop-in flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-white">
          <Icon name="check" size={36} />
        </span>
        <h3 className="text-xl font-bold text-primary">Votre message a bien été reçu</h3>
        <p className="max-w-md text-sm leading-relaxed text-on-surface-variant sm:text-base">
          Marc-Peniel ou Marie-Paule vous recontacte sous 24 heures ouvrées.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-sm font-semibold text-secondary underline underline-offset-4 hover:text-on-secondary-fixed"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  const isSending = status === 'sending';

  return (
    <div className="rounded-3xl border border-surface-container bg-white p-6 shadow-lifted sm:p-8 lg:p-10">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-primary sm:text-2xl">Envoyez-nous un message</h3>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          Quelques mots sur votre projet suffisent : nous vous rappelons sous 24 h ouvrées.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="full_name" label="Nom et prénom" error={fieldErrors.full_name}>
            {(describedBy) => (
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Ex. Marc Kouassi"
                aria-invalid={Boolean(fieldErrors.full_name)}
                aria-describedby={describedBy}
                className={`h-12 ${inputClass(Boolean(fieldErrors.full_name))}`}
              />
            )}
          </Field>

          <Field id="phone" label="Téléphone (WhatsApp)" error={fieldErrors.phone}>
            {(describedBy) => (
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="Ex. +225 07 00 00 00 00"
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={describedBy}
                className={`h-12 ${inputClass(Boolean(fieldErrors.phone))}`}
              />
            )}
          </Field>
        </div>

        <Field id="email" label="Adresse email" error={fieldErrors.email}>
          {(describedBy) => (
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="Ex. vous@exemple.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={describedBy}
              className={`h-12 ${inputClass(Boolean(fieldErrors.email))}`}
            />
          )}
        </Field>

        <Field id="message" label="Votre projet" error={fieldErrors.message}>
          {(describedBy) => (
            <>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                maxLength={MESSAGE_MAX}
                onChange={(event) => setMessageLength(event.target.value.length)}
                placeholder="Destination envisagée, type de visa, échéance..."
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={describedBy}
                className={`resize-y py-3 ${inputClass(Boolean(fieldErrors.message))}`}
              />
              <p className="-mt-1 text-right text-xs text-on-surface-variant" aria-live="polite">
                {messageLength} / {MESSAGE_MAX}
              </p>
            </>
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-secondary"
              aria-invalid={Boolean(fieldErrors.consent)}
              aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
            />
            <label className="cursor-pointer text-sm leading-relaxed text-on-surface-variant" htmlFor="consent">
              J'accepte d'être recontacté(e) par VISILION CORPORATE au sujet de ma demande.
            </label>
          </div>
          {fieldErrors.consent && (
            <p id="consent-error" className="flex items-start gap-1.5 text-sm font-medium text-red-700">
              <Icon name="error" size={16} className="mt-0.5 shrink-0" />
              {fieldErrors.consent}
            </p>
          )}
        </div>

        {globalError && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-red-50 p-4">
            <p className="flex items-start gap-2 text-sm font-medium text-red-800">
              <Icon name="error" size={18} className="mt-0.5 shrink-0" />
              {globalError}
            </p>

            {whatsappDraft && (
              <a
                href={whatsappLink(whatsappDraft)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Icon name="chat" size={18} />
                Envoyer ce message par WhatsApp
              </a>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-4 text-base font-semibold text-white shadow-md transition-colors hover:bg-on-secondary-fixed active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
        >
          {isSending ? (
            <>
              <Icon name="progress_activity" size={20} className="animate-spin" />
              <span>Envoi en cours…</span>
            </>
          ) : (
            <>
              <span>Envoyer mon message</span>
              <Icon name="send" size={18} className="arrow-nudge" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { ButtonSpinner, inputClass, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import AuthFrame, { BackToLogin } from '../AuthFrame';
import { clientApi } from '../api';
import { bigButton } from '../ui';

/**
 * Mot de passe oublié. La réponse est la même que l'adresse ait un compte
 * ou non (l'API ne révèle pas qui est client) ; un compte jamais activé
 * reçoit une nouvelle invitation.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
    Adresse lue dans le formulaire à l'envoi, comme sur l'écran de
    connexion : le bouton reste actif et dit ce qui manque, plutôt que
    d'être grisé sans explication.
  */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem('email') as HTMLInputElement;
    const email = field.value.trim();

    if (!email) {
      setError('Saisissez l\'adresse email de votre espace.');
      field.focus();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await clientApi.forgotPassword(email);
      setSent(response.message ?? 'Email envoyé.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthFrame title="Regardez vos emails">
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-soft text-brand-green">
            <Icon name="mail" size={24} />
          </span>
          <p className="text-[0.9375rem] leading-relaxed text-on-surface">{sent}</p>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Le lien reçu est valable une heure. Rien reçu après quelques minutes ? Votre conseiller peut vous aider.
          </p>
        </div>
        <BackToLogin />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Mot de passe oublié"
      intro="Indiquez l'adresse email de votre espace : vous recevrez un lien pour choisir un nouveau mot de passe."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-semibold text-primary">
            Adresse email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={busy} className={`${bigButton.primary} w-full`}>
          {busy && <ButtonSpinner />}
          Recevoir le lien
        </button>
      </form>

      <BackToLogin />
    </AuthFrame>
  );
}

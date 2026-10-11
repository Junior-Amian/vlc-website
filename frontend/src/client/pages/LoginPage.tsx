import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ButtonSpinner, inputClass, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import { asset } from '../../lib/asset';
import AuthFrame from '../AuthFrame';
import { clientApi } from '../api';
import { bigButton, PasswordInput } from '../ui';

/**
 * Connexion à l'espace client. Les comptes n'existent que sur invitation :
 * l'écran le dit, pour qu'un visiteur égaré sache à qui s'adresser.
 */
export default function LoginPage({ expired, onLogin }: { expired: boolean; onLogin: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
    Champs lus dans le formulaire à l'envoi, et non suivis touche par
    touche : un gestionnaire de mots de passe qui remplit les champs sans
    prévenir la page est ainsi toujours pris en compte (audit du
    10/10/2026). Le bouton reste actif et dit ce qui manque.
  */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = event.currentTarget.elements;
    const emailField = fields.namedItem('email') as HTMLInputElement;
    const passwordField = fields.namedItem('password') as HTMLInputElement;
    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!email || !password) {
      setError('Saisissez votre adresse email et votre mot de passe.');
      (email ? passwordField : emailField).focus();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await clientApi.login(email, password);
      onLogin();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Connexion impossible pour le moment.');
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Connexion à votre espace"
      intro="Votre accès vous a été envoyé par email à l'ouverture de votre dossier."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {expired && !error && <Notice tone="info">Votre session a expiré. Reconnectez-vous pour continuer.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="client-email" className="text-sm font-semibold text-primary">
            Adresse email
          </label>
          <input
            id="client-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="client-password" className="text-sm font-semibold text-primary">
              Mot de passe
            </label>
            {/* 44 px de haut au doigt, sans pousser le champ vers le bas (-my-3). */}
            <Link
              to="/espace-client/mot-de-passe-oublie"
              className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold text-secondary-ink hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="client-password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={busy} className={`${bigButton.primary} w-full`}>
          {busy && <ButtonSpinner />}
          Se connecter
        </button>
      </form>

      <p className="mt-8 border-t border-surface-container pt-5 text-sm leading-relaxed text-on-surface-variant">
        Pas encore d'accès ? Votre espace est créé par votre conseiller à l'ouverture de votre dossier.{' '}
        <a href={asset('/#contact')} className="font-semibold text-secondary-ink hover:underline">
          Nous contacter
        </a>
      </p>
    </AuthFrame>
  );
}

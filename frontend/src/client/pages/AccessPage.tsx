import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ButtonSpinner, describedBy, FieldShell, Notice, Spinner } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import AuthFrame, { BackToLogin } from '../AuthFrame';
import { clientApi } from '../api';
import type { AccessInfo } from '../types';
import { bigButton, PasswordInput } from '../ui';

type State =
  | { status: 'checking' }
  | { status: 'invalid'; message: string }
  | { status: 'ready'; access: AccessInfo };

const MIN_LENGTH = 8;

/**
 * Lien reçu par email : invitation (premier mot de passe) ou mot de passe
 * oublié. Le lien est vérifié avant d'afficher le formulaire, pour qu'un
 * lien périmé le dise tout de suite plutôt qu'après la saisie.
 */
export default function AccessPage({ onDone }: { onDone: () => void }) {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'checking' });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    clientApi
      .checkAccess(token)
      .then((response) => {
        if (!cancelled && response.data) {
          setState({ status: 'ready', access: response.data });
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setState({
            status: 'invalid',
            message: caught instanceof ApiError ? caught.message : 'Impossible de vérifier ce lien pour le moment.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    // Vérifié ici d'abord : le client corrige sans attendre le serveur.
    const local: Record<string, string[]> = {};

    if (password.length < MIN_LENGTH) {
      local.password = [`Au moins ${MIN_LENGTH} caractères.`];
    } else if (password !== confirmation) {
      local.password_confirmation = ['Les deux mots de passe ne correspondent pas.'];
    }

    setErrors(local);
    setError(null);

    if (Object.keys(local).length > 0) {
      return;
    }

    setBusy(true);

    try {
      await clientApi.setPassword(token, password, confirmation);
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(caught.errors);
      } else {
        setError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible pour le moment.');
      }

      setBusy(false);
    }
  }

  if (state.status === 'checking') {
    return (
      <AuthFrame title="Un instant…">
        <Spinner label="Vérification du lien…" />
      </AuthFrame>
    );
  }

  if (state.status === 'invalid') {
    return (
      <AuthFrame title="Ce lien ne fonctionne plus">
        <div className="flex flex-col gap-5">
          <Notice tone="error">{state.message}</Notice>
          <Link to="/espace-client/mot-de-passe-oublie" className={`${bigButton.primary} w-full`}>
            Recevoir un nouveau lien
          </Link>
        </div>
        <BackToLogin />
      </AuthFrame>
    );
  }

  const { access } = state;
  const firstName = access.fullName.split(' ')[0] || access.fullName;
  const invite = access.type === 'invite';

  return (
    <AuthFrame
      title={invite ? `Bienvenue, ${firstName}` : 'Nouveau mot de passe'}
      intro={
        invite
          ? 'Votre dossier est ouvert. Choisissez votre mot de passe pour accéder à votre espace.'
          : "Choisissez votre nouveau mot de passe. Il remplacera l'ancien sur tous vos appareils."
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
          <Icon name="mail" size={20} className="shrink-0 text-on-surface-variant" />
          <div className="min-w-0">
            <p className="text-xs text-on-surface-variant">Votre identifiant</p>
            <p className="truncate text-sm font-semibold text-primary">{access.email}</p>
          </div>
        </div>

        {/* Champ caché : les gestionnaires de mots de passe associent ainsi le mot de passe à l'email. */}
        <input type="email" name="username" autoComplete="username" value={access.email} readOnly hidden />

        <FieldShell id="access-password" label="Mot de passe" required help={`Au moins ${MIN_LENGTH} caractères.`} errors={errors.password}>
          <PasswordInput
            id="access-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy('access-password', 'help', errors.password)}
          />
        </FieldShell>

        <FieldShell id="access-confirmation" label="Confirmez le mot de passe" required errors={errors.password_confirmation}>
          <PasswordInput
            id="access-confirmation"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={Boolean(errors.password_confirmation)}
            aria-describedby={describedBy('access-confirmation', undefined, errors.password_confirmation)}
          />
        </FieldShell>

        <button type="submit" disabled={busy} className={`${bigButton.primary} w-full`}>
          {busy && <ButtonSpinner />}
          {invite ? 'Accéder à mon espace' : 'Enregistrer et me connecter'}
        </button>
      </form>
    </AuthFrame>
  );
}

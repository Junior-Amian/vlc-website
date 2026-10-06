import { useState, type FormEvent } from 'react';
import { asset } from '../../lib/asset';
import { ApiError } from '../../lib/api';
import { adminApi } from '../api';
import type { Admin } from '../types';
import { ButtonSpinner, buttonClass, inputClass, LogoBar, Notice } from '../ui';

/** Écran de connexion au panel. */
export default function LoginPage({ onLogin, expired }: { onLogin: (admin: Admin) => void; expired: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const response = await adminApi.login(email.trim(), password);

      if (response.data) {
        onLogin(response.data);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Connexion impossible. Réessayez.');
      setSending(false);
    }
  };

  return (
    <main className="grid min-h-dvh bg-surface-container-low lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Volet de marque, grand écran : celui du site, marine et signature du logo. */}
      <section aria-hidden="true" className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5">
            <img src={asset('/logo.jpeg')} alt="" width={48} height={48} className="h-full w-full object-contain" />
          </span>
          <span className="text-lg font-bold">VISILION CORPORATE</span>
        </div>

        <div className="flex max-w-md flex-col gap-6">
          <LogoBar className="h-1.5 w-40" />
          <p className="text-3xl font-extrabold leading-tight tracking-tight">
            Le site se met à jour ici, sans attendre personne.
          </p>
          <p className="text-base leading-relaxed text-on-primary-variant">
            Textes, prestations, témoignages et photos : ce que vous enregistrez est en ligne aussitôt.
          </p>
        </div>

        <p className="text-sm font-semibold italic text-secondary-fixed">« Notre vision, votre satisfaction »</p>
      </section>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <img
            src={asset('/logo.jpeg')}
            alt="VISILION CORPORATE"
            width={120}
            height={56}
            className="mx-auto mb-8 h-16 w-auto object-contain lg:hidden"
          />

          <form
            onSubmit={submit}
            className="flex flex-col gap-5 rounded-2xl border border-surface-container bg-white p-6 shadow-lifted sm:p-8"
          >
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-primary">Connexion au panel</h1>
              <p className="mt-1 text-sm text-on-surface-variant">Avec l'email et le mot de passe de votre compte.</p>
            </div>

            {expired && !error && <Notice tone="info">Votre session a expiré : reconnectez-vous.</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="connexion-email" className="text-sm font-semibold text-primary">
                Email
              </label>
              <input
                id="connexion-email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="connexion-mdp" className="text-sm font-semibold text-primary">
                Mot de passe
              </label>
              <input
                id="connexion-mdp"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={sending} className={`${buttonClass.primary} w-full`}>
              {sending && (
                <ButtonSpinner />
              )}
              Se connecter
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-on-surface-variant">
            Mot de passe oublié : il se réinitialise sur le serveur (voir api/database/README.md).
          </p>
        </div>
      </div>
    </main>
  );
}

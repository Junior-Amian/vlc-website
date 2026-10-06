import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Notice } from '../components/ui/controls';
import { ApiError } from '../lib/api';
import { clientApi, setUnauthorizedHandler } from './api';
import { ClientContext, type ClientContextValue } from './ClientContext';
import { ClientLoading } from './ClientEntry';
import ClientLayout from './ClientLayout';
import AccessPage from './pages/AccessPage';
import DocumentsPage from './pages/DocumentsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import OnboardingPage from './pages/OnboardingPage';
import OverviewPage from './pages/OverviewPage';
import PaymentsPage from './pages/PaymentsPage';
import ProfilePage from './pages/ProfilePage';
import type { ClientState } from './types';

type State =
  | { status: 'loading' }
  | { status: 'guest'; expired: boolean }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ClientState };

/**
 * Espace client.
 *
 * Parcours : le client reçoit un lien d'invitation, choisit son mot de
 * passe (AccessPage), répond aux questions d'ouverture (OnboardingPage),
 * puis retrouve son dossier en quatre rubriques. Les liens reçus par email
 * et « mot de passe oublié » fonctionnent sans session ; tout le reste
 * demande d'être connecté, et l'écran de connexion s'affiche à l'adresse
 * demandée, qui reste celle où l'on arrive une fois connecté.
 */
export default function ClientApp() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const navigate = useNavigate();

  const start = useCallback(async () => {
    try {
      const response = await clientApi.me();

      if (response.data) {
        setState({ status: 'ready', data: response.data });
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setState({ status: 'guest', expired: false });
      } else {
        setState({
          status: 'error',
          message: caught instanceof ApiError ? caught.message : 'Le serveur ne répond pas.',
        });
      }
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  // Session expirée en cours de route : retour à la connexion, avec un mot.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((current) => (current.status === 'ready' ? { status: 'guest', expired: true } : current));
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const logout = useCallback(() => {
    clientApi.logout().catch(() => undefined);
    setState({ status: 'guest', expired: false });
    navigate('/espace-client');
  }, [navigate]);

  const context = useMemo<ClientContextValue | null>(
    () =>
      state.status === 'ready'
        ? {
            ...state.data,
            update: (data: ClientState) => setState({ status: 'ready', data }),
            markMessagesRead: () =>
              setState((current) =>
                current.status === 'ready' && current.data.unreadMessages > 0
                  ? { status: 'ready', data: { ...current.data, unreadMessages: 0 } }
                  : current,
              ),
            logout,
          }
        : null,
    [state, logout],
  );

  // Après le choix du mot de passe : la session est ouverte, on entre.
  const enter = useCallback(() => {
    setState({ status: 'loading' });
    navigate('/espace-client', { replace: true });
    start();
  }, [navigate, start]);

  function session() {
    if (state.status === 'loading') {
      return <ClientLoading />;
    }

    if (state.status === 'error') {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-surface px-4">
          <div className="max-w-md">
            <Notice tone="error">
              {state.message}{' '}
              <button type="button" onClick={() => start()} className="font-bold underline">
                Réessayer
              </button>
            </Notice>
          </div>
        </main>
      );
    }

    if (state.status === 'guest' || !context) {
      return (
        <LoginPage
          expired={state.status === 'guest' && state.expired}
          onLogin={() => {
            setState({ status: 'loading' });
            start();
          }}
        />
      );
    }

    return (
      <ClientContext.Provider value={context}>
        {!context.client.onboarded ? (
          <OnboardingPage />
        ) : (
          <ClientLayout>
            <Routes>
              <Route index element={<OverviewPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="paiements" element={<PaymentsPage />} />
              <Route path="profil" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/espace-client" replace />} />
            </Routes>
          </ClientLayout>
        )}
      </ClientContext.Provider>
    );
  }

  return (
    <Routes>
      <Route path="invitation/:token" element={<AccessPage onDone={enter} />} />
      <Route path="nouveau-mot-de-passe/:token" element={<AccessPage onDone={enter} />} />
      <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="*" element={session()} />
    </Routes>
  );
}

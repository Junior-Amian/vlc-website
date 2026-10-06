import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { adminApi, errorMessage, setUnauthorizedHandler } from './api';
import { AdminContext, type AdminContextValue } from './AdminContext';
import AdminLayout from './AdminLayout';
import AccountPage from './pages/AccountPage';
import DashboardPage from './pages/DashboardPage';
import DossierNewPage from './pages/DossierNewPage';
import DossierPage from './pages/DossierPage';
import DossiersPage from './pages/DossiersPage';
import LoginPage from './pages/LoginPage';
import MediaPage from './pages/MediaPage';
import RequestsPage from './pages/RequestsPage';
import SectionPage from './pages/SectionPage';
import type { Admin, Schema } from './types';
import { Notice, Spinner } from './ui';

type State =
  | { status: 'loading' }
  | { status: 'guest'; expired: boolean }
  | { status: 'error'; message: string }
  | { status: 'ready'; admin: Admin; schema: Schema };

/**
 * Panel d'administration du contenu.
 *
 * Au démarrage, la session est vérifiée auprès de l'API (cookie HttpOnly,
 * illisible ici) : connecté, on charge le schéma des sections ; sinon,
 * l'écran de connexion s'affiche, quelle que soit l'adresse demandée.
 */
export default function AdminApp() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [dirty, setDirty] = useState(false);

  const start = useCallback(async (known?: Admin) => {
    try {
      // Compte et schéma sont indépendants : demandés ensemble, pas l'un après l'autre.
      const [admin, schema] = await Promise.all([
        known ?? adminApi.me().then((response) => response.data),
        adminApi.schema().then((response) => response.data),
      ]);

      if (admin && schema) {
        setState({ status: 'ready', admin, schema });
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setState({ status: 'guest', expired: false });
      } else {
        setState({ status: 'error', message: errorMessage(caught, 'Le serveur ne répond pas.') });
      }
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  /*
    Session expirée en cours de travail (tout appel du panel qui reçoit un
    401) : retour à la connexion, avec un message. Hors séance (vérification
    au démarrage, mauvais mot de passe), le 401 est attendu et ne change rien.
  */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setDirty(false);
      setState((current) => (current.status === 'ready' ? { status: 'guest', expired: true } : current));
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const logout = useCallback(() => {
    adminApi.logout().catch(() => undefined);
    setDirty(false);
    setState({ status: 'guest', expired: false });
  }, []);

  // Demandes non lues et dossiers à traiter : au démarrage, puis chaque
  // minute, pour qu'une demande, une pièce ou un message arrivé pendant la
  // séance apparaisse dans le menu.
  const [newRequests, setNewRequests] = useState(0);
  const [dossierAlerts, setDossierAlerts] = useState(0);
  const ready = state.status === 'ready';

  const refreshRequests = useCallback(() => {
    adminApi
      .requestCounts()
      .then((response) => setNewRequests(response.data?.new ?? 0))
      .catch(() => undefined);
  }, []);

  const refreshDossierAlerts = useCallback(() => {
    adminApi
      .dossierAlerts()
      .then((response) => setDossierAlerts(response.data?.attention ?? 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const refresh = () => {
      refreshRequests();
      refreshDossierAlerts();
    };

    refresh();
    const timer = window.setInterval(refresh, 60_000);

    return () => window.clearInterval(timer);
  }, [ready, refreshRequests, refreshDossierAlerts]);

  const context = useMemo<AdminContextValue | null>(
    () =>
      state.status === 'ready'
        ? {
            admin: state.admin,
            schema: state.schema,
            logout,
            setDirty,
            dirty,
            newRequests,
            refreshRequests,
            dossierAlerts,
            refreshDossierAlerts,
          }
        : null,
    [state, logout, dirty, newRequests, refreshRequests, dossierAlerts, refreshDossierAlerts],
  );

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
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
        onLogin={(admin) => {
          setState({ status: 'loading' });
          start(admin);
        }}
      />
    );
  }

  return (
    <AdminContext.Provider value={context}>
      <AdminLayout>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="demandes" element={<RequestsPage />} />
          <Route path="demandes/:id" element={<RequestsPage />} />
          <Route path="dossiers" element={<DossiersPage />} />
          <Route path="dossiers/nouveau" element={<DossierNewPage />} />
          <Route path="dossiers/:id" element={<DossierPage />} />
          <Route path="sections/:key" element={<SectionPage />} />
          <Route path="medias" element={<MediaPage />} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminLayout>
    </AdminContext.Provider>
  );
}

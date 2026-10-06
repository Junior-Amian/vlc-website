import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { useAdmin } from '../AdminContext';
import BarList, { share } from '../dashboard/BarList';
import PendingRequests from '../dashboard/PendingRequests';
import StatBoard from '../dashboard/StatBoard';
import VisitorsChart from '../dashboard/VisitorsChart';
import { PAGE_SECTION_LABELS } from '../sections';
import type { Stats } from '../types';
import { Notice, PageHeader, Panel, Spinner } from '../ui';

const PERIODS = [7, 30, 90];

const ACTION_LABELS: Record<string, string> = {
  call: 'Appels',
  whatsapp: 'WhatsApp',
  email: 'Emails',
  contact_form: 'Formulaires envoyés',
};

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Téléphone',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
};

function pageLabel(path: string): string {
  return path === '/' ? 'Accueil' : path;
}

/** Choix de la période : un groupe de boutons radio, navigable au clavier. */
function PeriodPicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <fieldset className="flex rounded-xl border border-surface-container-high bg-white p-1">
      <legend className="sr-only">Période affichée</legend>
      {PERIODS.map((days) => (
        <label key={days} className="cursor-pointer">
          <input
            type="radio"
            name="periode"
            value={days}
            checked={value === days}
            onChange={() => onChange(days)}
            className="peer sr-only"
          />
          <span className="flex h-11 pointer-fine:h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
            {days} jours
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Accueil du panel : la fréquentation du site et les demandes à traiter. */
export default function DashboardPage() {
  const { admin } = useAdmin();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    adminApi
      .stats(days)
      .then((response) => !cancelled && setStats(response.data ?? null))
      .catch(() => !cancelled && setError('Les statistiques sont indisponibles pour le moment.'));

    return () => {
      cancelled = true;
    };
  }, [days]);

  const firstName = admin.name.split(' ')[0];
  const visitors = stats?.current.visitors ?? 0;
  const deviceTotal = stats?.devices.reduce((sum, device) => sum + device.count, 0) ?? 0;
  const referrerTotal = stats?.referrers.reduce((sum, referrer) => sum + referrer.count, 0) ?? 0;
  const noVisits = stats !== null && visitors === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bonjour ${firstName}`}
        description={`L'activité du site sur les ${days} derniers jours.`}
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!stats && !error && <Spinner />}

      {stats && (
        <>
          <StatBoard stats={stats} />

          <PendingRequests />

          {noVisits && (
            <Notice tone="info">
              Aucune visite sur cette période. Les chiffres se remplissent dès les premières visites du site en
              ligne ; les vôtres ne comptent pas tant que vous êtes connecté au panel.
            </Notice>
          )}

          <Panel title="Visiteurs par jour" subtitle="Survolez la courbe pour le détail d'une journée.">
            <VisitorsChart data={stats.daily} />
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              title="Jusqu'où lisent les visiteurs"
              subtitle="Part des visiteurs arrivés à chaque section, de haut en bas de la page."
            >
              <BarList
                max={visitors}
                rows={stats.sections.map((section) => ({
                  label: PAGE_SECTION_LABELS[section.name] ?? section.name,
                  value: section.count,
                  note: share(section.count, visitors),
                }))}
              />
            </Panel>

            <Panel title="Prises de contact" subtitle="Clics sur un numéro, WhatsApp ou l'email, et formulaires envoyés.">
              <BarList
                rows={stats.actions.map((action) => ({
                  label: ACTION_LABELS[action.name] ?? action.name,
                  value: action.count,
                }))}
                empty="Aucune prise de contact sur cette période."
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Provenance" subtitle="Site d'où arrivent les visiteurs.">
              <BarList
                rows={stats.referrers.map((referrer) => ({
                  label: referrer.name === '' ? 'Accès direct' : referrer.name,
                  value: referrer.count,
                  note: share(referrer.count, referrerTotal),
                }))}
              />
            </Panel>

            <Panel title="Appareils" subtitle="Ce qu'utilisent les visiteurs.">
              <BarList
                rows={stats.devices.map((device) => ({
                  label: DEVICE_LABELS[device.name] ?? device.name,
                  value: device.count,
                  note: share(device.count, deviceTotal),
                }))}
              />
            </Panel>

            <Panel title="Pages les plus vues" subtitle="Le site tient sur une page ; les autres adresses sont des liens erronés.">
              <BarList
                rows={stats.pages.map((page) => ({ label: pageLabel(page.name), value: page.count }))}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

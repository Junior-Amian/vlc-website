import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { formatLongDate, formatMoney } from '../../lib/format';
import AdvisorCard from '../AdvisorCard';
import { useClient } from '../ClientContext';
import { checklistProgress, itemsToDo } from '../../dossiers/status';
import type { Dossier } from '../../dossiers/types';
import { bigButton, Card, ProgressBar, StepStamp } from '../ui';

/**
 * Accueil de l'espace : où en est le dossier, et ce que le client doit
 * faire maintenant. Une seule action proposée à la fois.
 *
 * Au téléphone, dans l'ordre de lecture : le dossier, la prochaine action,
 * les deux résumés, l'avancement détaillé, le conseiller. Sur grand écran,
 * résumés et conseiller passent dans une colonne à droite.
 */
export default function OverviewPage() {
  const { client, dossier, unreadMessages } = useClient();
  const firstName = client.fullName.split(' ')[0] || client.fullName;

  if (!dossier) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting name={firstName} />
        <Card>
          <p className="text-[0.9375rem] leading-relaxed text-on-surface">
            Votre dossier n'est pas encore disponible. Votre conseiller le prépare ; il apparaîtra ici.
          </p>
        </Card>
        <AdvisorCard reference={null} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Greeting name={firstName} />

      {unreadMessages > 0 && (
        <Link
          to="/espace-client/messages"
          className="group flex items-center gap-4 rounded-3xl border border-brand-blue/15 bg-brand-blue-soft p-4 transition-[border-color,transform] duration-150 hover:border-brand-blue/30 active:scale-[0.99] sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-blue">
            <Icon name="chat" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-primary">
              {unreadMessages > 1 ? `${unreadMessages} nouveaux messages` : 'Nouveau message'} de votre conseiller
            </span>
            <span className="block text-sm text-on-surface-variant">Lisez-le et répondez-lui dans vos messages.</span>
          </span>
          <Icon name="arrow_forward" size={20} className="shrink-0 text-brand-blue transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      )}

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Vignette dossier={dossier} />
        <NextAction dossier={dossier} />

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid-cols-1">
          <DocumentsTile dossier={dossier} />
          <PaymentsTile dossier={dossier} />
        </div>

        <Timeline dossier={dossier} />

        <div className="lg:col-start-2 lg:row-start-3">
          <AdvisorCard reference={dossier.reference} />
        </div>
      </div>
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Bonjour {name}</h1>
      <p className="text-sm text-on-surface-variant sm:text-base">Voici où en est votre dossier.</p>
    </header>
  );
}

/**
 * Le dossier présenté comme une vignette consulaire : fond marine,
 * référence en capitales espacées, et l'étape en cours frappée en tampon.
 */
function Vignette({ dossier }: { dossier: Dossier }) {
  const current = dossier.steps.find((step) => step.number === dossier.step);

  return (
    <section
      aria-label="Votre dossier"
      className="relative overflow-hidden rounded-[1.75rem] bg-primary p-5 text-white shadow-lifted sm:p-7"
    >
      {/* Les quatre couleurs du logo en liseré, comme la bande d'une vignette. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 grid h-1 grid-cols-4">
        <span className="bg-brand-blue" />
        <span className="bg-brand-red" />
        <span className="bg-brand-green" />
        <span className="bg-brand-yellow" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-primary-muted">
            Dossier <span className="whitespace-nowrap tabular-nums text-on-primary-soft">{dossier.reference}</span>
          </p>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">{dossier.service.label}</h2>
          {dossier.country && (
            <p className="text-sm text-on-primary-soft sm:text-base">
              Destination : <span className="font-semibold text-white">{dossier.country}</span>
            </p>
          )}
        </div>
        <StepStamp step={dossier.step} total={dossier.steps.length} className="w-24 shrink-0 text-[13px] sm:w-32 sm:text-[17px]" />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-4">
        <p className="flex flex-col">
          <span className="text-xs text-on-primary-muted">
            Étape {dossier.step} sur {dossier.steps.length}
          </span>
          <span className="font-semibold">{current?.label}</span>
        </p>
        <p className="text-xs text-on-primary-muted">depuis le {formatLongDate(dossier.stepChangedAt)}</p>
      </div>
    </section>
  );
}

type Action = {
  tone: 'alert' | 'action' | 'wait' | 'done';
  title: string;
  text: string;
  cta?: string;
};

/** Ce que le client doit faire maintenant, déduit du dossier. */
function nextAction(dossier: Dossier): Action {
  const last = dossier.steps.length;
  const rejected = dossier.checklist.filter((item) => item.status === 'rejected');
  const missing = itemsToDo(dossier).filter((item) => item.status === 'missing');
  const received = dossier.checklist.filter((item) => item.status === 'received');
  const current = dossier.steps.find((step) => step.number === dossier.step);

  if (dossier.step >= last) {
    return { tone: 'done', title: current?.label ?? 'Dossier terminé', text: current?.description ?? '' };
  }

  if (rejected.length > 0) {
    return {
      tone: 'alert',
      title: rejected.length === 1 ? '1 pièce à refaire' : `${rejected.length} pièces à refaire`,
      text: `${rejected[0].label} : ${rejected[0].rejectionReason ?? 'voir le motif dans vos documents.'}`,
      cta: 'Corriger',
    };
  }

  if (missing.length > 0) {
    return {
      tone: 'action',
      title: missing.length === 1 ? 'Il reste 1 pièce à déposer' : `Il reste ${missing.length} pièces à déposer`,
      text: 'Une photo ou un PDF suffit, envoyé depuis votre téléphone.',
      cta: 'Déposer mes documents',
    };
  }

  if (received.length > 0) {
    return {
      tone: 'wait',
      title: 'Votre conseiller vérifie vos pièces',
      text: "Chaque pièce affiche son état dans vos documents dès qu'elle est vérifiée.",
    };
  }

  return { tone: 'wait', title: current?.label ?? '', text: current?.description ?? '' };
}

function NextAction({ dossier }: { dossier: Dossier }) {
  const action = nextAction(dossier);

  const look = {
    alert: { icon: 'error', badge: 'bg-brand-red-soft text-brand-red-ink' },
    action: { icon: 'upload', badge: 'bg-secondary-fixed text-secondary-ink' },
    wait: { icon: 'hourglass_top', badge: 'bg-brand-blue-soft text-brand-blue' },
    done: { icon: 'check_circle', badge: 'bg-brand-green-soft text-brand-green' },
  }[action.tone];

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${look.badge}`}>
          <Icon name={look.icon} size={24} filled={action.tone === 'done'} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold text-on-surface-variant">
            {action.cta ? 'À faire maintenant' : "Pour l'instant"}
          </p>
          <h2 className="text-lg font-bold leading-snug text-primary">{action.title}</h2>
          {action.text && <p className="text-sm leading-relaxed text-on-surface-variant">{action.text}</p>}
        </div>
      </div>
      {action.cta && (
        <Link to="/espace-client/documents" className={`${bigButton.primary} w-full shrink-0 sm:w-auto`}>
          {action.cta}
          <Icon name="arrow_forward" size={20} />
        </Link>
      )}
    </Card>
  );
}

function DocumentsTile({ dossier }: { dossier: Dossier }) {
  const { validated, required } = checklistProgress(dossier);

  return (
    <Link
      to="/espace-client/documents"
      className="group flex flex-col gap-3 rounded-3xl border border-surface-container bg-white p-5 shadow-ambient transition-[border-color,transform] duration-150 hover:border-primary/20 active:scale-[0.99]"
    >
      <span className="flex items-center justify-between text-sm font-semibold text-on-surface-variant">
        Documents
        <Icon name="arrow_forward" size={18} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tabular-nums text-primary">
          {validated}
          <span className="text-on-surface-variant">/{required}</span>
        </span>
        <span className="text-sm text-on-surface-variant">validées</span>
      </span>
      <ProgressBar value={required > 0 ? validated / required : 0} label="Pièces obligatoires validées" tone="green" />
    </Link>
  );
}

function PaymentsTile({ dossier }: { dossier: Dossier }) {
  const { total, paid, balance } = dossier.finance;

  return (
    <Link
      to="/espace-client/paiements"
      className="group flex flex-col gap-3 rounded-3xl border border-surface-container bg-white p-5 shadow-ambient transition-[border-color,transform] duration-150 hover:border-primary/20 active:scale-[0.99]"
    >
      <span className="flex items-center justify-between text-sm font-semibold text-on-surface-variant">
        Paiements
        <Icon name="arrow_forward" size={18} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
      {total === null ? (
        <span className="text-sm leading-relaxed text-on-surface-variant">Montant à définir avec votre conseiller.</span>
      ) : balance === 0 ? (
        <span className="flex items-center gap-2 text-lg font-bold text-brand-green">
          <Icon name="check_circle" size={22} filled />
          Tout est réglé
        </span>
      ) : (
        <span className="flex flex-col">
          <span className="text-sm text-on-surface-variant">Reste à payer</span>
          <span className="text-2xl font-extrabold tabular-nums text-primary">{formatMoney(balance ?? 0)}</span>
        </span>
      )}
      {total !== null && total > 0 && <ProgressBar value={paid / total} label="Part du montant déjà payée" />}
    </Link>
  );
}

/** Les étapes du dossier, de haut en bas : franchies, en cours, à venir. */
function Timeline({ dossier }: { dossier: Dossier }) {
  return (
    <Card>
      <h2 className="mb-5 text-base font-bold text-primary">Avancement</h2>
      <ol className="flex flex-col">
        {dossier.steps.map((step, index) => {
          const done = step.number < dossier.step || dossier.step === dossier.steps.length;
          const current = step.number === dossier.step;
          const isLast = index === dossier.steps.length - 1;

          return (
            <li key={step.number} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? 'step' : undefined}>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-[0.9375rem] top-8 w-0.5 rounded-full ${done && !current ? 'bg-primary' : 'bg-surface-container'}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  current
                    ? 'bg-secondary text-white ring-4 ring-secondary-fixed'
                    : done
                      ? 'bg-primary text-white'
                      : 'border-2 border-surface-container-high bg-white text-on-surface-variant'
                }`}
              >
                {done && !current ? <Icon name="check" size={18} /> : step.number}
              </span>
              <div className="flex min-w-0 flex-col gap-1 pt-1">
                <p className={`text-[0.9375rem] font-semibold leading-snug ${current || done ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {step.label}
                  <span className="sr-only">{current ? ' (étape en cours)' : done ? ' (franchie)' : ' (à venir)'}</span>
                </p>
                {current && (
                  <>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                    <p className="text-xs font-semibold text-secondary-ink">Depuis le {formatLongDate(dossier.stepChangedAt)}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

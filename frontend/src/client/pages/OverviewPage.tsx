import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { formatFirstName, formatLongDate, formatNumber, formatPercent } from '../../lib/format';
import { useClient } from '../ClientContext';
import { itemsToDo } from '../../dossiers/status';
import type { Dossier } from '../../dossiers/types';
import { bigButton, Card, ProgressBar, StepStamp } from '../ui';

/**
 * Accueil de l'espace : où en est le dossier, et ce que le client doit
 * faire maintenant. Une seule action proposée à la fois.
 *
 * Au téléphone et sur tablette, dans l'ordre de lecture : le dossier,
 * l'avancement détaillé, les paiements, le résumé des documents. Pas de bloc
 * « À faire maintenant » (demande du 10/10/2026).
 *
 * Sur grand écran (refonte du 10/10/2026), la vignette du dossier prend
 * toute la largeur et porte la frise des étapes, qui remplace la liste
 * « Avancement ». Dessous : l'action à mener et le point des paiements (trois
 * cartes, sur toutes les tailles d'écran), puis le résumé des documents, en
 * colonne à droite à partir de xl. Les messages ont leur bandeau quand il y
 * en a de nouveaux, et leur rubrique. Pas de carte « Une question ? »
 * (retirée sur tous les écrans, demande du 10/10/2026) : le conseiller se
 * joint par la rubrique Messages.
 */
export default function OverviewPage() {
  const { client, dossier, unreadMessages } = useClient();
  const firstName = formatFirstName(client.fullName);

  if (!dossier) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting name={firstName} />
        <Card>
          <p className="text-[0.9375rem] leading-relaxed text-on-surface">
            Votre dossier n'est pas encore disponible. Votre conseiller le prépare ; il apparaîtra ici.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
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

      <Vignette dossier={dossier} />

      {/*
        Une seule colonne, pleine largeur (demandes du 10 et du 11/10/2026).
        Téléphone et tablette : pas de bloc « À faire maintenant » (l'onglet
        Documents porte déjà le nombre de pièces à fournir), l'avancement
        avant les paiements, puis la tuile Documents. Grand écran : l'action,
        puis les paiements ; pas de tuile Documents, l'avancement y est la
        frise de la vignette.
      */}
      <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
        <div className="hidden lg:block">
          <NextAction dossier={dossier} />
        </div>
        <div className="lg:hidden">
          <Timeline dossier={dossier} />
        </div>
        <PaymentsOverview dossier={dossier} />
        <div className="lg:hidden">
          <DocumentsTile dossier={dossier} />
        </div>
      </div>
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-extrabold tracking-tight text-primary outline-none sm:text-3xl">Bonjour {name}</h1>
      <p className="text-sm text-on-surface-variant sm:text-base">Voici où en est votre dossier.</p>
    </header>
  );
}

/**
 * Le dossier présenté comme une vignette consulaire : fond marine,
 * référence en capitales espacées, et l'étape en cours frappée en tampon.
 * Sur grand écran, la frise des étapes en occupe le bas.
 */
function Vignette({ dossier }: { dossier: Dossier }) {
  const current = dossier.steps.find((step) => step.number === dossier.step);

  return (
    <section
      aria-label="Votre dossier"
      className="relative overflow-hidden rounded-[1.75rem] bg-primary p-5 text-white shadow-lifted sm:p-7 lg:p-8 xl:p-10"
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
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem] xl:text-[2.5rem]">{dossier.service.label}</h2>
          {dossier.country && (
            <p className="text-sm text-on-primary-soft sm:text-base">
              Destination : <span className="font-semibold text-white">{dossier.country}</span>
            </p>
          )}
          {current && (
            <p className="mt-2 hidden max-w-xl text-[0.9375rem] leading-relaxed text-on-primary-soft lg:block">{current.description}</p>
          )}
        </div>
        <StepStamp step={dossier.step} total={dossier.steps.length} className="w-24 shrink-0 text-[13px] sm:w-32 sm:text-[17px] xl:w-36 xl:text-[19px]" />
      </div>

      {/* Téléphone et tablette : l'étape en une ligne ; la liste détaillée vient plus bas. */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-4 lg:hidden">
        <p className="flex flex-col">
          <span className="text-xs text-on-primary-muted">
            Étape {dossier.step} sur {dossier.steps.length}
          </span>
          <span className="font-semibold">{current?.label}</span>
        </p>
        <p className="text-xs text-on-primary-muted">depuis le {formatLongDate(dossier.stepChangedAt)}</p>
      </div>

      <StepFrieze dossier={dossier} />
    </section>
  );
}

/**
 * Les étapes en frise, de gauche à droite, sur grand écran : franchies
 * (cochées), en cours (ocre, avec sa date), à venir. Lue comme une liste
 * ordonnée, chaque étape annonce son état aux lecteurs d'écran.
 */
function StepFrieze({ dossier }: { dossier: Dossier }) {
  const finished = dossier.step === dossier.steps.length;

  return (
    <ol
      className="mt-8 hidden border-t border-white/10 pt-7 lg:grid"
      style={{ gridTemplateColumns: `repeat(${dossier.steps.length}, minmax(0, 1fr))` }}
    >
      {dossier.steps.map((step, index) => {
        const current = step.number === dossier.step;
        const done = step.number < dossier.step || finished;
        const isLast = index === dossier.steps.length - 1;

        return (
          <li key={step.number} className="flex min-w-0 flex-col gap-3" aria-current={current ? 'step' : undefined}>
            <div className="flex items-center" aria-hidden="true">
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  current && !finished
                    ? 'bg-secondary text-white ring-4 ring-secondary/30'
                    : done
                      ? 'bg-white text-primary'
                      : 'border border-white/25 text-on-primary-muted'
                }`}
              >
                {done && !(current && !finished) ? <Icon name="check" size={18} /> : step.number}
              </span>
              {!isLast && <span className={`mx-2 h-0.5 flex-1 rounded-full ${step.number < dossier.step ? 'bg-on-primary-soft/70' : 'bg-white/15'}`} />}
            </div>
            <div className="flex flex-col gap-0.5 pr-4">
              <p
                className={`text-sm leading-snug ${
                  current ? 'font-bold text-white' : done ? 'font-semibold text-on-primary-soft' : 'font-medium text-on-primary-muted'
                }`}
              >
                {step.label}
                <span className="sr-only">{current ? ' (étape en cours)' : done ? ' (franchie)' : ' (à venir)'}</span>
              </p>
              {current && <p className="text-xs text-secondary-container">Depuis le {formatLongDate(dossier.stepChangedAt)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
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
      text: 'Une photo ou un PDF suffit.',
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
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:p-7">
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl lg:h-12 lg:w-12 ${look.badge}`}>
          <Icon name={look.icon} size={24} filled={action.tone === 'done'} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold text-on-surface-variant">
            {action.cta ? 'À faire maintenant' : "Pour l'instant"}
          </p>
          <h2 className="text-lg font-bold leading-snug text-primary lg:text-xl">{action.title}</h2>
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

/**
 * Le point des paiements, une carte par montant (demande du 10/10/2026) :
 * prix de la prestation, déjà payé, reste à payer. Le reste à payer, ce que
 * le client cherche, est la seule carte marine. Les versements se règlent
 * auprès du conseiller ; « Voir le détail » mène à leur relevé.
 */
function PaymentsOverview({ dossier }: { dossier: Dossier }) {
  const { total, paid, balance, payments } = dossier.finance;
  const ratio = total ? Math.min(1, paid / total) : null;
  const settled = total !== null && balance === 0;

  return (
    <section aria-labelledby="suivi-paiements" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="suivi-paiements" className="text-base font-bold text-primary">
          Paiements
        </h2>
        <Link
          to="/espace-client/paiements"
          className="-my-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-secondary-ink hover:underline"
        >
          Voir le détail
          <Icon name="arrow_forward" size={18} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <AmountCard
          icon="payments"
          label="Prix de la prestation"
          amount={total}
          note={total === null ? 'À fixer avec votre conseiller.' : 'Montant total de votre dossier.'}
        />
        <AmountCard
          icon="check_circle"
          label="Déjà payé"
          amount={paid}
          progress={ratio}
          note={
            payments.length === 0
              ? 'Aucun versement pour l\'instant.'
              : `${payments.length > 1 ? `${payments.length} versements` : '1 versement'}${ratio !== null ? ` · ${formatPercent(ratio)} du prix` : ''}`
          }
        />
        <AmountCard
          icon="hourglass_top"
          label="Reste à payer"
          amount={total === null ? null : (balance ?? 0)}
          settled={settled}
          note={
            total === null
              ? 'Connu dès que le prix est fixé.'
              : settled
                ? 'Merci, votre prestation est réglée.'
                : 'À régler auprès de votre conseiller.'
          }
          highlight
        />
      </div>
    </section>
  );
}

/**
 * Une carte de montant. Le chiffre et « FCFA » sont deux mots distincts :
 * dans une carte étroite, l'unité passe à la ligne au lieu de déborder.
 */
function AmountCard({
  icon,
  label,
  amount,
  note,
  progress = null,
  settled = false,
  highlight = false,
}: {
  icon: string;
  label: string;
  amount: number | null;
  note: string;
  progress?: number | null;
  settled?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-3xl p-5 lg:p-6 ${
        highlight ? 'bg-primary text-white shadow-lifted' : 'border border-surface-container bg-white shadow-ambient'
      }`}
    >
      <p className={`flex items-center gap-2 text-sm font-semibold ${highlight ? 'text-on-primary-soft' : 'text-on-surface-variant'}`}>
        <Icon name={icon} size={18} className={highlight ? 'text-brand-yellow' : 'text-secondary-ink'} />
        {label}
      </p>

      {amount === null ? (
        <p className={`text-xl font-extrabold ${highlight ? 'text-white' : 'text-primary'}`}>À définir</p>
      ) : settled ? (
        <p className="flex items-center gap-2 text-xl font-extrabold text-white">
          <Icon name="check_circle" size={22} filled className="text-brand-yellow" />
          Tout est réglé
        </p>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={`text-2xl font-extrabold tabular-nums tracking-tight xl:text-[1.75rem] ${highlight ? 'text-white' : 'text-primary'}`}>
            {formatNumber(amount)}
          </span>
          <span className={`text-sm font-semibold ${highlight ? 'text-on-primary-soft' : 'text-on-surface-variant'}`}>FCFA</span>
        </p>
      )}

      {progress !== null && <ProgressBar value={progress} label="Part du prix déjà payée" tone="green" />}

      <p className={`mt-auto text-xs leading-relaxed ${highlight ? 'text-on-primary-soft' : 'text-on-surface-variant'}`}>{note}</p>
    </div>
  );
}

const TILE =
  'group flex h-full flex-col gap-3 rounded-3xl border border-surface-container bg-white p-5 shadow-ambient transition-[border-color,transform] duration-150 hover:border-primary/20 active:scale-[0.99] lg:p-6';

function TileHeading({ children }: { children: string }) {
  return (
    <span className="flex items-center justify-between text-sm font-semibold text-on-surface-variant">
      {children}
      <Icon name="arrow_forward" size={18} className="transition-transform duration-150 group-hover:translate-x-0.5" />
    </span>
  );
}

/**
 * Téléphone et tablette seulement : les pièces obligatoires déjà jointes
 * (au moins un fichier envoyé, quel que soit leur état) sur celles demandées.
 * « Joints » plutôt que « validées » (demande du 11/10/2026), accordé au
 * titre « Documents » : c'est ce que le client peut faire avancer lui-même.
 */
function DocumentsTile({ dossier }: { dossier: Dossier }) {
  const required = dossier.checklist.filter((item) => item.required);
  const attached = required.filter((item) => item.documents.length > 0).length;

  return (
    <Link to="/espace-client/documents" className={TILE}>
      <TileHeading>Documents</TileHeading>
      <span className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tabular-nums text-primary">
          {attached}
          <span className="text-on-surface-variant">/{required.length}</span>
        </span>
        <span className="text-sm text-on-surface-variant">joints</span>
      </span>
      <ProgressBar value={required.length > 0 ? attached / required.length : 0} label="Documents obligatoires joints" tone="green" />
    </Link>
  );
}

/** Les étapes du dossier, de haut en bas : franchies, en cours, à venir (téléphone et tablette). */
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

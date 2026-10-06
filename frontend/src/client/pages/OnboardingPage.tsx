import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Icon from '../../components/ui/Icon';
import { ButtonSpinner, LogoBar, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import { clientApi } from '../api';
import { useClient } from '../ClientContext';
import OnboardingFields, { focusFirstError, missingFields } from '../OnboardingFields';
import { bigButton } from '../ui';

/**
 * Première connexion : les informations dont le conseiller a besoin, en
 * deux courtes étapes plutôt qu'un long formulaire. Une page d'accueil
 * d'abord, qui rappelle le dossier ouvert et annonce la durée.
 *
 * Les erreurs renvoyées par l'API ramènent à l'étape du premier champ en
 * cause.
 */
export default function OnboardingPage() {
  const { client, dossier, onboarding, update, logout } = useClient();
  const groups = onboarding.groups;
  const [stage, setStage] = useState(-1);
  const [values, setValues] = useState<Record<string, string>>({ ...client.profile });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstName = client.fullName.split(' ')[0] || client.fullName;

  // Nouvelle étape : haut de page, et le titre reçoit le focus pour que les
  // lecteurs d'écran l'annoncent.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    headingRef.current?.focus();
  }, [stage]);

  const group = stage >= 0 ? groups[stage] : null;
  const lastStage = stage === groups.length - 1;

  function change(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!group) {
      return;
    }

    const local = missingFields(group.fields, values);
    setErrors(local);
    setError(null);

    if (Object.keys(local).length > 0) {
      focusFirstError(group.fields, local);
      return;
    }

    if (!lastStage) {
      setStage(stage + 1);
      return;
    }

    setBusy(true);

    try {
      const response = await clientApi.saveProfile(values);

      if (response.data) {
        update(response.data);
      }
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(caught.errors);
        const target = groups.findIndex((candidate) => candidate.fields.some((field) => caught.errors[field.key]));
        setStage(target >= 0 ? target : stage);
      } else {
        setError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible pour le moment.');
      }

      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-surface-container bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex flex-col gap-1">
            <span className="text-sm font-bold leading-none text-primary">Ouverture de votre dossier</span>
            <LogoBar className="h-[3px] w-14" />
          </span>
          <button type="button" onClick={logout} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-on-surface-variant hover:text-primary">
            <Icon name="logout" size={18} />
            Quitter
          </button>
        </div>

        {group && (
          <div className="mx-auto grid max-w-2xl gap-1.5 px-4 pb-3 sm:px-6" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
            {groups.map((candidate, index) => (
              <span
                key={candidate.number}
                aria-hidden="true"
                className={`h-1 rounded-full transition-colors duration-300 ${index <= stage ? 'bg-secondary' : 'bg-surface-container'}`}
              />
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pb-16">
        {!group ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-primary outline-none sm:text-4xl">
                Bienvenue, {firstName}
              </h1>
              <p className="text-[0.9375rem] leading-relaxed text-on-surface-variant sm:text-base">
                Avant de commencer, nous avons besoin de quelques informations sur vous. Comptez deux minutes.
              </p>
            </div>

            {dossier && (
              <div className="flex items-center gap-4 rounded-3xl bg-primary p-5 text-white">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-yellow">
                  <Icon name="description" size={24} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-on-primary-muted">Dossier {dossier.reference}</p>
                  <p className="font-bold">
                    {dossier.service.label}
                    {dossier.country && <span className="font-normal text-on-primary-soft"> · {dossier.country}</span>}
                  </p>
                </div>
              </div>
            )}

            <ol className="flex flex-col gap-3">
              {groups.map((candidate) => (
                <li key={candidate.number} className="flex items-start gap-3 rounded-2xl border border-surface-container bg-white px-4 py-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-sm font-bold text-primary">
                    {candidate.number}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-primary">{candidate.title}</span>
                    <span className="text-sm text-on-surface-variant">{candidate.description}</span>
                  </span>
                </li>
              ))}
            </ol>

            <StickyActions>
              <button type="button" onClick={() => setStage(0)} className={`${bigButton.primary} w-full sm:w-auto`}>
                Commencer
                <Icon name="arrow_forward" size={20} />
              </button>
            </StickyActions>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-secondary-ink">
                Étape {stage + 1} sur {groups.length}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-primary outline-none sm:text-3xl">
                {group.title}
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">{group.description}</p>
            </div>

            {error && <Notice tone="error">{error}</Notice>}

            <div className="rounded-3xl border border-surface-container bg-white p-5 shadow-ambient sm:p-6">
              <OnboardingFields fields={group.fields} values={values} errors={errors} onChange={change} />
            </div>

            <StickyActions>
              <button type="button" onClick={() => setStage(stage - 1)} disabled={busy} className={bigButton.secondary} aria-label="Étape précédente">
                <Icon name="arrow_back" size={20} />
              </button>
              <button type="submit" disabled={busy} className={`${bigButton.primary} flex-1 sm:flex-none`}>
                {busy && <ButtonSpinner />}
                {lastStage ? 'Valider mes informations' : 'Continuer'}
                {!busy && !lastStage && <Icon name="arrow_forward" size={20} />}
              </button>
            </StickyActions>
          </form>
        )}
      </main>
    </div>
  );
}

/**
 * Boutons de l'étape : collés en bas de l'écran au téléphone, à portée de
 * pouce et toujours visibles, même clavier fermé ; à leur place en dessous
 * du formulaire sur grand écran.
 */
function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-surface-container bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}

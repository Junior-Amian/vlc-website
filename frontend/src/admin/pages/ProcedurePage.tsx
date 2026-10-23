import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adminApi, errorMessage } from '../api';
import { useAdmin } from '../AdminContext';
import FieldControl from '../form/FieldControl';
import { FormContext, type FormContextValue } from '../form/FormContext';
import { groupFields, isSame, prepare } from '../form/values';
import type { FieldErrors, Procedure, ProcedureList, SectionData } from '../types';
import { ButtonSpinner, buttonClass, Notice, PageHeader, Spinner } from '../ui';

type Feedback = { tone: 'success' | 'error'; text: string } | null;

/** Données de départ d'une procédure : la sienne, une copie, ou une nouvelle. */
function startingData(list: ProcedureList, id: string | undefined, params: URLSearchParams): SectionData | null {
  if (id) {
    return list.items.find((item) => item.id === id) ?? null;
  }

  const copy = list.items.find((item) => item.id === params.get('copie'));

  if (copy) {
    return { ...copy, name: `${copy.name} (copie)` };
  }

  // Nouvelle procédure : les étapes par défaut, à renommer ou compléter.
  return { service: params.get('prestation') ?? '', name: '', steps: list.defaults.steps, checklist: [] };
}

/**
 * Création et modification d'une procédure, avec les champs des sections
 * du site (FieldControl) : listes d'étapes et de pièces à réordonner, à
 * replier, à compléter.
 *
 * `/admin/procedures/nouvelle` crée (`?copie=` part d'une procédure
 * existante, `?prestation=` présélectionne la prestation) ;
 * `/admin/procedures/:id` modifie.
 */
export default function ProcedurePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { schema, setDirty } = useAdmin();

  const [list, setList] = useState<ProcedureList | null>(null);
  const [initial, setInitial] = useState<SectionData | null>(null);
  const [value, setValue] = useState<SectionData | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Juste après une création, la page recharge la procédure créée : le
  // message « Procédure créée » doit survivre à ce rechargement.
  const keepFeedback = useRef(false);

  const fields = list?.fields ?? [];
  const current = id ? list?.items.find((item) => item.id === id) : undefined;

  const apply = useCallback((nextList: ProcedureList, data: SectionData) => {
    const prepared = prepare(nextList.fields, data);
    setList(nextList);
    setInitial(prepared);
    setValue(prepared);
    setErrors({});
  }, []);

  useEffect(() => {
    setLoadError(null);

    if (!keepFeedback.current) {
      setFeedback(null);
    }

    keepFeedback.current = false;

    adminApi
      .procedures()
      .then((response) => {
        const data = response.data ? startingData(response.data, id, params) : null;

        if (!response.data || !data) {
          setLoadError('Procédure introuvable : elle a peut-être été supprimée.');

          return;
        }

        apply(response.data, data);
      })
      .catch((caught) => setLoadError(errorMessage(caught, 'Les procédures sont indisponibles.')));
    // `params` ne compte qu'à l'arrivée sur la page.
  }, [id, apply]);

  // Une copie ou une nouvelle procédure est à enregistrer dès l'arrivée.
  const dirty = value !== null && initial !== null && (!id || !isSame(value, initial));

  useEffect(() => {
    setDirty(dirty);

    return () => setDirty(false);
  }, [dirty, setDirty]);

  const context = useMemo<FormContextValue>(
    () => ({
      errors,
      icons: schema.icons,
      options: list?.options ?? {},
      media: {},
      rememberMedia: () => undefined,
    }),
    [errors, schema.icons, list],
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!value || !list) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = id ? await adminApi.saveProcedure(id, value) : await adminApi.createProcedure(value);
      const saved = response.data as Procedure;
      const items = id ? list.items.map((item) => (item.id === saved.id ? saved : item)) : [...list.items, saved];

      apply({ ...list, items }, saved);
      setFeedback({ tone: 'success', text: response.message ?? 'Procédure enregistrée.' });

      if (!id) {
        // La page devient celle de la procédure créée ; le message suit.
        keepFeedback.current = true;
        setDirty(false);
        navigate(`/admin/procedures/${saved.id}`, { replace: true });
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setErrors(caught.errors);
        const count = Object.keys(caught.errors).length;
        setFeedback({
          tone: 'error',
          text: count > 1 ? `${count} champs sont à corriger, signalés en rouge.` : 'Un champ est à corriger, signalé en rouge.',
        });
      } else {
        setFeedback({ tone: 'error', text: errorMessage(caught, "L'enregistrement a échoué. Réessayez.") });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current || !window.confirm(`Supprimer la procédure « ${current.name} » ? Les dossiers déjà ouverts la gardent.`)) {
      return;
    }

    setDeleting(true);

    try {
      await adminApi.deleteProcedure(current.id);
      setDirty(false);
      navigate('/admin/procedures');
    } catch (caught) {
      setFeedback({ tone: 'error', text: errorMessage(caught, 'La suppression a échoué. Réessayez.') });
      setDeleting(false);
    }
  };

  const title = id ? (current?.name ?? 'Procédure') : params.get('copie') ? 'Dupliquer une procédure' : 'Nouvelle procédure';

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <PageHeader
        trail="Réglages · Procédures"
        title={title}
        description={
          <>
            Les étapes et les pièces sont copiées dans chaque dossier ouvert avec cette procédure. Les modifier ensuite ne change pas les dossiers déjà ouverts.
            {current && <span className="mt-1 block text-xs">Dernière modification le {formatDate(current.updatedAt)}</span>}
          </>
        }
        actions={
          <Link to="/admin/procedures" className={buttonClass.secondary}>
            <Icon name="arrow_back" size={18} />
            Toutes les procédures
          </Link>
        }
      />

      {loadError && <Notice tone="error">{loadError}</Notice>}
      {!value && !loadError && <Spinner />}

      {value && (
        <FormContext.Provider value={context}>
          {groupFields(fields).map((group) => (
            <div
              key={group.map((field) => field.key).join('-')}
              className="flex flex-col gap-6 rounded-2xl border border-surface-container bg-white p-5 sm:p-7"
            >
              {group.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={value[field.key]}
                  onChange={(next) => setValue((state) => (state ? { ...state, [field.key]: next } : state))}
                  path={field.key}
                />
              ))}
            </div>
          ))}

          {current && (
            <div className="flex flex-col gap-3 rounded-2xl border border-surface-container bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Supprimer la procédure la retire du choix à l'ouverture d'un dossier. Les dossiers déjà ouverts la gardent.
              </p>
              <button type="button" onClick={remove} disabled={deleting} className={`${buttonClass.danger} shrink-0`}>
                {deleting ? <ButtonSpinner /> : <Icon name="delete" size={18} />}
                Supprimer
              </button>
            </div>
          )}

          {/* Barre d'enregistrement collée en bas d'écran, comme pour les sections du site. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-surface-container-high bg-surface-container-low/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
            {feedback && (
              <Notice tone={feedback.tone} onClose={() => setFeedback(null)}>
                {feedback.text}
              </Notice>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant" aria-live="polite">
                {dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
              </p>
              <div className="flex gap-2">
                {id && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue(initial);
                      setErrors({});
                      setFeedback(null);
                    }}
                    disabled={!dirty || saving}
                    className={buttonClass.secondary}
                  >
                    Annuler
                  </button>
                )}
                <button type="submit" disabled={!dirty || saving} className={buttonClass.primary}>
                  {saving ? <ButtonSpinner /> : <Icon name="check" size={18} />}
                  {id ? 'Enregistrer' : 'Créer la procédure'}
                </button>
              </div>
            </div>
          </div>
        </FormContext.Provider>
      )}
    </form>
  );
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import type { MediaImage } from '../../content/types';
import { ApiError } from '../../lib/api';
import { adminApi, errorMessage } from '../api';
import { useAdmin } from '../AdminContext';
import FieldControl from '../form/FieldControl';
import { FormContext, type FormContextValue } from '../form/FormContext';
import { isSame, prepare } from '../form/values';
import { asset } from '../../lib/asset';
import { sectionAnchor } from '../sections';
import type { FieldDef, FieldErrors, SectionData, SectionPayload } from '../types';
import { formatDate } from '../../lib/format';
import { ButtonSpinner, buttonClass, Notice, PageHeader, Spinner } from '../ui';

type Feedback = { tone: 'success' | 'error'; text: string; conflict?: boolean } | null;

/** Champs simples consécutifs réunis ; chaque liste d'éléments seule. */
function groupFields(fields: FieldDef[]): FieldDef[][] {
  const groups: FieldDef[][] = [];

  for (const field of fields) {
    const last = groups[groups.length - 1];

    if (field.type === 'items' || !last || last[0].type === 'items') {
      groups.push([field]);
    } else {
      last.push(field);
    }
  }

  return groups;
}

/**
 * Modification d'une section du site, avec un formulaire construit à partir
 * de son schéma.
 *
 * Rien n'est publié avant « Enregistrer » ; une fois enregistré, le
 * changement est visible au prochain chargement du site, sans recompilation.
 */
export default function SectionPage() {
  const { key = '' } = useParams();
  const { schema, setDirty } = useAdmin();
  const section = schema.sections.find((candidate) => candidate.key === key);

  const [payload, setPayload] = useState<SectionPayload | null>(null);
  const [initial, setInitial] = useState<SectionData | null>(null);
  const [value, setValue] = useState<SectionData | null>(null);
  const [media, setMedia] = useState<Record<string, MediaImage>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = useCallback(
    (next: SectionPayload) => {
      if (!section) {
        return;
      }

      const prepared = prepare(section.fields, next.data);
      setPayload(next);
      setInitial(prepared);
      setValue(prepared);
      setMedia(next.media);
      setErrors({});
    },
    [section],
  );

  const load = useCallback(() => {
    setLoadError(null);
    setPayload(null);

    adminApi
      .section(key)
      .then((response) => response.data && apply(response.data))
      .catch((caught) => setLoadError(errorMessage(caught, 'Section indisponible.')));
  }, [key, apply]);

  useEffect(() => {
    setFeedback(null);
    load();
  }, [load]);

  const dirty = value !== null && initial !== null && !isSame(value, initial);

  useEffect(() => {
    setDirty(dirty);

    return () => setDirty(false);
  }, [dirty, setDirty]);

  const context = useMemo<FormContextValue>(
    () => ({
      errors,
      icons: schema.icons,
      options: payload?.options ?? {},
      media,
      rememberMedia: (image) => setMedia((current) => ({ ...current, [String(image.id)]: image })),
    }),
    [errors, schema.icons, payload, media],
  );

  if (!section) {
    return (
      <Notice tone="error">
        Section inconnue. <Link to="/admin" className="underline">Retour au tableau de bord</Link>
      </Notice>
    );
  }

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!value || !payload) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = await adminApi.saveSection(key, value, payload.version);

      if (response.data) {
        apply(response.data);
      }

      setFeedback({ tone: 'success', text: 'Modifications enregistrées : elles sont en ligne.' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setErrors(caught.errors);
        const count = Object.keys(caught.errors).length;
        setFeedback({
          tone: 'error',
          text: count > 1 ? `${count} champs sont à corriger, signalés en rouge.` : 'Un champ est à corriger, signalé en rouge.',
        });
      } else if (caught instanceof ApiError && caught.status === 409) {
        setFeedback({ tone: 'error', text: caught.message, conflict: true });
      } else {
        setFeedback({
          tone: 'error',
          text: errorMessage(caught, "L'enregistrement a échoué. Réessayez."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <PageHeader
        trail={section.group === 'settings' ? 'Réglages' : 'Contenu de la page'}
        title={section.label}
        description={
          <>
            {section.description}
            {payload?.updatedAt && (
              <span className="mt-1 block text-xs">
                Dernière modification le {formatDate(payload.updatedAt)}
                {payload.updatedBy && ` par ${payload.updatedBy}`}
              </span>
            )}
          </>
        }
        actions={
          <a
            href={asset(`/#${sectionAnchor(section.key)}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass.secondary}
          >
            <Icon name="open_in_new" size={18} />
            Voir sur le site
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        }
      />

      {loadError && (
        <Notice tone="error">
          {loadError}{' '}
          <button type="button" onClick={load} className="font-bold underline">
            Réessayer
          </button>
        </Notice>
      )}

      {!value && !loadError && <Spinner />}

      {value && (
        <FormContext.Provider value={context}>
          {/*
            Un bloc par groupe : les champs simples qui se suivent ensemble,
            chaque liste (prestations, étapes…) à part, pour qu'une longue
            liste ne noie pas les textes de la section.
          */}
          {groupFields(section.fields).map((group) => (
            <div
              key={group.map((field) => field.key).join('-')}
              className="flex flex-col gap-6 rounded-2xl border border-surface-container bg-white p-5 sm:p-7"
            >
              {group.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={value[field.key]}
                  onChange={(next) => setValue((current) => (current ? { ...current, [field.key]: next } : current))}
                  path={field.key}
                />
              ))}
            </div>
          ))}

          {/*
            Barre d'enregistrement collée en bas d'écran : toujours à portée,
            même au milieu d'une longue liste de prestations. Le résultat de
            l'enregistrement s'y affiche, là où l'on vient de cliquer.
          */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-surface-container-high bg-surface-container-low/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
            {feedback && (
              <Notice tone={feedback.tone} onClose={() => setFeedback(null)}>
                {feedback.text}
                {feedback.conflict && (
                  <button type="button" onClick={load} className="ml-2 font-bold underline">
                    Recharger la section
                  </button>
                )}
              </Notice>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant" aria-live="polite">
                {dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
              </p>
              <div className="flex gap-2">
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
                <button type="submit" disabled={!dirty || saving} className={buttonClass.primary}>
                  {saving ? (
                    <ButtonSpinner />
                  ) : (
                    <Icon name="check" size={18} />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </FormContext.Provider>
      )}
    </form>
  );
}

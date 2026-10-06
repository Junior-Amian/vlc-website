import { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { brand, type BrandColor } from '../../components/ui/brand';
import type { FieldDef, SectionData } from '../types';
import { buttonClass } from '../ui';
import FieldControl, { fieldId } from './FieldControl';
import { useFormContext } from './FormContext';
import { emptyObject, hasErrorsUnder, KEY, slugify } from './values';

function isBrandColor(value: unknown): value is BrandColor {
  return typeof value === 'string' && value in brand;
}

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
};

/**
 * Liste d'éléments structurés : prestations, témoignages, étapes…
 *
 * Chaque élément est une fiche repliable, titrée par son champ principal
 * (`titleField`), qu'on peut déplacer, masquer (champ `published`) ou
 * supprimer. Une fiche qui contient une erreur s'ouvre d'elle-même.
 */
export default function ItemsField({ field, value, onChange, path }: Props) {
  const { errors } = useFormContext();
  const items = Array.isArray(value) ? (value as SectionData[]) : [];
  const subFields = field.fields ?? [];
  const itemLabel = field.itemLabel ?? 'Élément';
  const max = field.maxItems ?? Infinity;
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  // Ouvre les fiches signalées par la dernière validation du serveur.
  useEffect(() => {
    const withErrors = items
      .filter((_, index) => hasErrorsUnder(errors, `${path}.${index}`))
      .map((item) => String(item[KEY]));

    if (withErrors.length > 0) {
      setOpen((current) => new Set([...current, ...withErrors]));
    }
    // Uniquement à l'arrivée de nouvelles erreurs, pas à chaque frappe.
  }, [errors]);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });

  const updateItem = (index: number, key: string, next: unknown) => {
    onChange(
      items.map((item, i) => {
        if (i !== index) {
          return item;
        }

        const updated = { ...item, [key]: next };

        // L'ancre suit le titre tant qu'elle n'a pas été modifiée à la main.
        if (key === 'title' && subFields.some((sub) => sub.key === 'slug')) {
          const previous = String(item.title ?? '');

          if (item.slug === '' || item.slug === slugify(previous)) {
            updated.slug = slugify(String(next));
          }
        }

        return updated;
      }),
    );
  };

  const move = (index: number, offset: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };

  const remove = (index: number, title: string) => {
    if (window.confirm(`Supprimer « ${title} » ? La suppression ne sera définitive qu'à l'enregistrement.`)) {
      onChange(items.filter((_, i) => i !== index));
    }
  };

  const add = () => {
    const item = emptyObject(subFields);
    onChange([...items, item]);
    setOpen((current) => new Set([...current, String(item[KEY])]));

    // Le focus va au premier champ de la nouvelle fiche, une fois rendue.
    requestAnimationFrame(() => {
      const firstField = subFields.find((sub) => sub.type !== 'boolean') ?? subFields[0];

      if (firstField) {
        document.getElementById(fieldId(`${path}.${items.length}.${firstField.key}`))?.focus();
      }
    });
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex w-full items-baseline justify-between gap-3">
        <span className="text-base font-bold text-primary">{field.label}</span>
        <span className="text-xs tabular-nums text-on-surface-variant">
          {items.length}
          {Number.isFinite(max) && ` / ${max}`}
        </span>
      </legend>

      {field.help && <p className="-mt-2 text-xs leading-relaxed text-on-surface-variant">{field.help}</p>}

      <ol className="flex flex-col gap-2.5">
        {items.map((item, index) => {
          const key = String(item[KEY]);
          const itemPath = `${path}.${index}`;
          const isOpen = open.has(key);
          const hidden = item.published === false;
          const invalid = hasErrorsUnder(errors, itemPath);
          const titleValue = field.titleField ? String(item[field.titleField] ?? '').trim() : '';
          const title = titleValue || `${itemLabel} ${index + 1}`;
          const bodyId = `${fieldId(itemPath)}-fiche`;

          return (
            <li
              key={key}
              className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                invalid ? 'border-brand-red/50' : 'border-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-1 py-1 pl-1 pr-1.5">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-left hover:bg-surface-container-low"
                >
                  <span className={`inline-flex shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <Icon name="expand_more" size={22} className="text-on-surface-variant" />
                  </span>
                  {/*
                    Repères de la fiche telle qu'elle paraît sur le site : son
                    icône et sa couleur (prestations, valeurs…), sinon son rang.
                  */}
                  {typeof item.icon === 'string' && item.icon !== '' ? (
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isBrandColor(item.color) ? `${brand[item.color].soft} ${brand[item.color].text}` : 'bg-surface-container-low text-primary'
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                    </span>
                  ) : (
                    <span className="w-6 shrink-0 text-xs font-bold tabular-nums text-on-surface-variant">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                  <span className={`min-w-0 truncate text-sm font-semibold ${hidden ? 'text-on-surface-variant' : 'text-primary'}`}>
                    {title}
                  </span>
                  {hidden && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                      <Icon name="visibility_off" size={14} />
                      Hors ligne
                    </span>
                  )}
                  {invalid && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-red-ink">
                      <Icon name="error" size={16} />
                      <span className="max-sm:sr-only">À corriger</span>
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Monter : ${title}`}
                  className={buttonClass.icon}
                >
                  <Icon name="arrow_upward" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Descendre : ${title}`}
                  className={buttonClass.icon}
                >
                  <Icon name="arrow_downward" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index, title)}
                  disabled={items.length <= (field.minItems ?? 0)}
                  aria-label={`Supprimer : ${title}`}
                  className={`${buttonClass.icon} hover:bg-brand-red-soft! hover:text-brand-red-ink!`}
                >
                  <Icon name="delete" size={18} />
                </button>
              </div>

              {isOpen && (
                <div id={bodyId} className="flex flex-col gap-5 border-t border-surface-container px-4 py-5 sm:px-5">
                  {subFields.map((sub) => (
                    <FieldControl
                      key={sub.key}
                      field={sub}
                      value={item[sub.key]}
                      onChange={(next) => updateItem(index, sub.key, next)}
                      path={`${itemPath}.${sub.key}`}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {errors[path]?.map((error) => (
        <p key={error} className="text-sm font-medium text-brand-red-ink">
          {error}
        </p>
      ))}

      <button type="button" onClick={add} disabled={items.length >= max} className={`${buttonClass.secondary} w-fit`}>
        <Icon name="add" size={18} />
        Ajouter : {itemLabel.toLowerCase()}
      </button>
    </fieldset>
  );
}

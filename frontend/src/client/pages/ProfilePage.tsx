import { useState, type FormEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { Avatar, ButtonSpinner, buttonClass, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import { formatLongDate } from '../../lib/format';
import { clientApi } from '../api';
import { useClient } from '../ClientContext';
import OnboardingFields, { focusFirstError, missingFields } from '../OnboardingFields';
import { Card, PageTitle } from '../ui';

/**
 * Le compte du client : son identité, ses réponses du formulaire
 * d'ouverture (modifiables), son mot de passe et la déconnexion.
 *
 * L'email et le téléphone ne se changent pas ici : ils servent à le
 * joindre, et l'équipe doit savoir qu'ils changent.
 */
export default function ProfilePage() {
  const { client, onboarding, logout } = useClient();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const fields = onboarding.groups.flatMap((group) => group.fields);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Votre profil" />

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={client.fullName} className="h-16 w-16 text-xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg font-bold text-primary">{client.fullName}</p>
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Icon name="mail" size={18} className="shrink-0" />
            <span className="truncate">{client.email}</span>
          </p>
          {client.phone && (
            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Icon name="call" size={18} className="shrink-0" />
              {client.phone}
            </p>
          )}
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Pour changer d'email ou de téléphone, prévenez votre conseiller.
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-primary">Vos informations</h2>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
              className={buttonClass.secondary}
            >
              <Icon name="edit" size={18} />
              Modifier
            </button>
          )}
        </div>

        {saved && <Notice tone="success">Informations enregistrées.</Notice>}

        {editing ? (
          <ProfileForm
            onDone={(didSave) => {
              setEditing(false);
              setSaved(didSave);
            }}
          />
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map((field) => {
              const raw = client.profile[field.key] ?? '';
              const value =
                field.type === 'select'
                  ? field.options?.find((option) => option.value === raw)?.label ?? raw
                  : field.type === 'date' && raw
                    ? formatLongDate(raw)
                    : raw;

              return (
                <div key={field.key} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-on-surface-variant">{field.label}</dt>
                  <dd className="text-[0.9375rem] font-semibold text-primary">{value || '—'}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </Card>

      <PasswordCard email={client.email} />

      <button type="button" onClick={logout} className={`${buttonClass.secondary} w-full sm:w-auto sm:self-start`}>
        <Icon name="logout" size={20} />
        Se déconnecter
      </button>
    </div>
  );
}

function ProfileForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const { client, onboarding, update } = useClient();
  const fields = onboarding.groups.flatMap((group) => group.fields);
  const [values, setValues] = useState<Record<string, string>>({ ...client.profile });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const local = missingFields(fields, values);
    setErrors(local);
    setError(null);

    if (Object.keys(local).length > 0) {
      focusFirstError(fields, local);
      return;
    }

    setBusy(true);

    try {
      const response = await clientApi.saveProfile(values);

      if (response.data) {
        update(response.data);
      }

      onDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(caught.errors);
      } else {
        setError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible pour le moment.');
      }

      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {error && <Notice tone="error">{error}</Notice>}
      <OnboardingFields
        fields={fields}
        values={values}
        errors={errors}
        onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => onDone(false)} disabled={busy} className={buttonClass.secondary}>
          Annuler
        </button>
        <button type="submit" disabled={busy} className={buttonClass.primary}>
          {busy && <ButtonSpinner />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

/**
 * Changer de mot de passe passe par le même lien que l'oubli : un email
 * prouve que c'est bien le titulaire de l'adresse qui le demande.
 */
function PasswordCard({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  async function send() {
    setState('busy');

    try {
      await clientApi.forgotPassword(email);
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-primary">Mot de passe</h2>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Pour le changer, recevez un lien à votre adresse email. Il est valable une heure.
        </p>
      </div>
      {state === 'sent' && <Notice tone="success">Email envoyé à {email}. Pensez à regarder dans les courriers indésirables.</Notice>}
      {state === 'error' && <Notice tone="error">L'envoi a échoué. Réessayez dans un instant.</Notice>}
      {state !== 'sent' && (
        <button type="button" onClick={send} disabled={state === 'busy'} className={`${buttonClass.secondary} w-full sm:w-auto sm:self-start`}>
          {state === 'busy' ? <ButtonSpinner /> : <Icon name="lock" size={18} />}
          Recevoir le lien
        </button>
      )}
    </Card>
  );
}

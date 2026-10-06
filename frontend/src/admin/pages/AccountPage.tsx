import { useState, type FormEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { ApiError } from '../../lib/api';
import { adminApi, errorMessage } from '../api';
import { useAdmin } from '../AdminContext';
import { Avatar, ButtonSpinner, buttonClass, describedBy, FieldShell, inputClass, Notice, PageHeader } from '../ui';

/** Compte de l'administrateur connecté : changement de mot de passe. */
export default function AccountPage() {
  const { admin } = useAdmin();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (password !== confirmation) {
      setErrors({ password_confirmation: ['Les deux saisies du nouveau mot de passe diffèrent.'] });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      await adminApi.changePassword(current, password, confirmation);
      setCurrent('');
      setPassword('');
      setConfirmation('');
      setFeedback({ tone: 'success', text: 'Mot de passe modifié. Vos autres sessions ouvertes ont été fermées.' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setErrors(caught.errors);
      } else {
        setFeedback({ tone: 'error', text: errorMessage(caught, 'Modification impossible.') });
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    autoComplete: string,
    help?: string,
  ) => (
    <FieldShell id={id} label={label} required help={help} errors={errors[id]}>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={errors[id] ? true : undefined}
        aria-describedby={describedBy(id, help, errors[id])}
        className={inputClass}
      />
    </FieldShell>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader trail="Réglages" title="Mon compte" />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-surface-container bg-white p-6 text-center">
          <Avatar name={admin.name} className="h-16 w-16 text-xl" />
          <div>
            <p className="font-bold text-primary">{admin.name}</p>
            <p className="text-sm break-all text-on-surface-variant">{admin.email}</p>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Le nom et l'email se modifient sur le serveur (api/database/README.md).
          </p>
        </section>

        <form
          onSubmit={submit}
          noValidate
          className="flex max-w-xl flex-col gap-5 rounded-2xl border border-surface-container bg-white p-5 sm:p-7"
        >
          <h2 className="text-base font-bold text-primary">Changer de mot de passe</h2>

          {feedback && (
            <Notice tone={feedback.tone} onClose={() => setFeedback(null)}>
              {feedback.text}
            </Notice>
          )}

          {field('current_password', 'Mot de passe actuel', current, setCurrent, 'current-password')}
          {field('password', 'Nouveau mot de passe', password, setPassword, 'new-password')}
          {field('password_confirmation', 'Nouveau mot de passe, encore', confirmation, setConfirmation, 'new-password')}

          <button type="submit" disabled={saving} className={`${buttonClass.primary} w-fit`}>
            {saving ? (
              <ButtonSpinner />
            ) : (
              <Icon name="lock" size={18} />
            )}
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
}

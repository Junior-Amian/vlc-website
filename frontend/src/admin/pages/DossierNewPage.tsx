import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ApiError } from '../../lib/api';
import { adminApi, errorMessage } from '../api';
import InvitationLink from '../dossiers/InvitationLink';
import type { AdminDossier, DossierOptions, Invitation } from '../types';
import { ButtonSpinner, buttonClass, describedBy, FieldShell, inputClass, Notice, PageHeader, Panel, Spinner } from '../ui';

type Values = {
  full_name: string;
  email: string;
  phone: string;
  service: string;
  country: string;
  amount_total: string;
};

const EMPTY: Values = { full_name: '', email: '', phone: '', service: '', country: '', amount_total: '' };

/**
 * Ouvrir un dossier : crée le compte du client, son dossier avec la liste
 * de pièces par défaut, et lui envoie son invitation.
 *
 * Depuis une demande de contact (?demande=12), les coordonnées sont reprises
 * et la demande est marquée traitée à l'ouverture.
 */
export default function DossierNewPage() {
  const [params] = useSearchParams();
  const requestId = params.get('demande') || null;

  const [options, setOptions] = useState<DossierOptions | null>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ dossier: AdminDossier; invitation: Invitation } | null>(null);

  useEffect(() => {
    adminApi
      .dossierOptions()
      .then((response) => response.data && setOptions(response.data))
      .catch((caught) => setError(errorMessage(caught, 'Les prestations sont indisponibles.')));

    if (requestId) {
      adminApi
        .contactRequest(requestId)
        .then((response) => {
          const request = response.data;

          if (request) {
            setValues((current) => ({ ...current, full_name: request.fullName, email: request.email, phone: request.phone }));
          }
        })
        .catch(() => undefined);
    }
  }, [requestId]);

  const set = (key: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: [] }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await adminApi.createDossier({
        ...values,
        amount_total: values.amount_total.replace(/\D/g, '') || null,
        contact_request_id: requestId,
      });

      if (response.data) {
        setCreated(response.data);
      }
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(caught.errors);
      } else {
        setError(errorMessage(caught, "Le dossier n'a pas pu être ouvert."));
      }
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const { dossier, invitation } = created;

    return (
      <div className="flex flex-col gap-6">
        <PageHeader trail="Dossiers clients" title="Dossier ouvert" description={`${dossier.reference} · ${dossier.client.fullName} · ${dossier.service.label}`} />
        <Panel title="Invitation du client" subtitle="Le client choisit son mot de passe depuis ce lien, puis répond à quelques questions avant d'accéder à son dossier.">
          <InvitationLink invitation={invitation} clientName={dossier.client.fullName} phone={dossier.client.phone} />
        </Panel>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/dossiers/${dossier.id}`} className={buttonClass.primary}>
            Voir le dossier
            <Icon name="arrow_forward" size={20} />
          </Link>
          <Link to="/admin/dossiers" className={buttonClass.secondary}>
            Tous les dossiers
          </Link>
        </div>
      </div>
    );
  }

  const field = (key: keyof Values, label: string, input: InputHTMLAttributes<HTMLInputElement>, help?: string, required = true) => {
    const id = `dossier-${key}`;

    return (
      <FieldShell id={id} label={label} required={required} help={help} errors={errors[key]?.length ? errors[key] : undefined}>
        <input
          id={id}
          value={values[key]}
          onChange={(event) => set(key)(event.target.value)}
          aria-invalid={Boolean(errors[key]?.length)}
          aria-describedby={describedBy(id, help, errors[key]?.length ? errors[key] : undefined)}
          className={inputClass}
          {...input}
        />
      </FieldShell>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail="Dossiers clients"
        title="Ouvrir un dossier"
        description="Le client reçoit par email un lien pour créer son accès. La liste de pièces par défaut est ajoutée ; vous l'ajusterez ensuite."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!options && !error && <Spinner />}

      {options && (
        <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
          <Panel title="Le client" subtitle={requestId ? 'Coordonnées reprises de la demande de contact.' : undefined}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('full_name', 'Nom et prénom', { autoComplete: 'off' })}</div>
              {field('email', 'Adresse email', { type: 'email', inputMode: 'email' }, "Son identifiant : l'invitation y est envoyée.")}
              {field('phone', 'Téléphone', { type: 'tel', inputMode: 'tel' }, 'Pour lui envoyer le lien par WhatsApp.', false)}
            </div>
          </Panel>

          <Panel title="Le dossier">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell id="dossier-service" label="Prestation" required errors={errors.service?.length ? errors.service : undefined}>
                <select
                  id="dossier-service"
                  value={values.service}
                  onChange={(event) => set('service')(event.target.value)}
                  aria-invalid={Boolean(errors.service?.length)}
                  className={inputClass}
                >
                  <option value="">Choisir…</option>
                  {options.services.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              {field('country', 'Pays de destination', {}, undefined, false)}
              {field('amount_total', 'Montant total (FCFA)', { inputMode: 'numeric' }, "Laissez vide si le montant n'est pas encore fixé.", false)}
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={buttonClass.primary}>
              {busy && <ButtonSpinner />}
              Ouvrir le dossier et inviter le client
            </button>
            <Link to="/admin/dossiers" className={buttonClass.secondary}>
              Annuler
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

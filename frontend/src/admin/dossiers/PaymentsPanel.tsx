import { useState, type FormEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { formatLongDate, formatMoney } from '../../lib/format';
import { adminApi } from '../api';
import type { AdminDossier } from '../types';
import { ButtonSpinner, buttonClass, inputClass, Panel } from '../ui';
import type { Save } from './ChecklistPanel';

const today = () => new Date().toISOString().slice(0, 10);
const digits = (value: string) => value.replace(/\D/g, '');

/**
 * Suivi financier du dossier : le montant total, et chaque versement reçu.
 * Le client voit les mêmes chiffres dans son espace.
 */
export default function PaymentsPanel({ dossier, save }: { dossier: AdminDossier; save: Save }) {
  const { total, paid, balance, payments } = dossier.finance;
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(total !== null ? String(total) : '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<{ data?: AdminDossier }>) => {
    setBusy(true);
    const ok = await save(action);
    setBusy(false);

    return ok;
  };

  async function saveTotal(event: FormEvent) {
    event.preventDefault();
    const value = digits(totalInput);

    if (await run(() => adminApi.updateDossier(dossier.id, { amount_total: value === '' ? null : Number(value) }))) {
      setEditingTotal(false);
    }
  }

  async function addPayment(event: FormEvent) {
    event.preventDefault();

    if (await run(() => adminApi.addPayment(dossier.id, { amount: Number(digits(amount)), paid_on: date, label }))) {
      setAmount('');
      setLabel('');
      setDate(today());
    }
  }

  return (
    <Panel title="Paiements" subtitle="En francs CFA. Le client voit le total, ses versements et le solde.">
      {editingTotal ? (
        <form onSubmit={saveTotal} className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <label htmlFor="montant-total" className="text-sm font-semibold text-primary">
              Montant total de la prestation
            </label>
            <input id="montant-total" inputMode="numeric" value={totalInput} onChange={(event) => setTotalInput(event.target.value)} placeholder="Vide : à fixer" className={inputClass} />
          </div>
          <button type="submit" disabled={busy} className={buttonClass.primary}>
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditingTotal(false)} className={buttonClass.secondary}>
            Annuler
          </button>
        </form>
      ) : (
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-surface-container-low p-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-on-surface-variant">Total</dt>
            <dd className="text-sm font-bold tabular-nums text-primary">{total !== null ? formatMoney(total) : 'À fixer'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-on-surface-variant">Payé</dt>
            <dd className="text-sm font-bold tabular-nums text-primary">{formatMoney(paid)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-on-surface-variant">Reste</dt>
            <dd className={`text-sm font-bold tabular-nums ${balance === 0 ? 'text-brand-green' : 'text-primary'}`}>
              {balance === null ? '—' : formatMoney(balance)}
            </dd>
          </div>
        </dl>
      )}

      {!editingTotal && (
        <button type="button" onClick={() => setEditingTotal(true)} className={`${buttonClass.secondary} self-start`}>
          <Icon name="edit" size={18} />
          Modifier le montant total
        </button>
      )}

      {payments.length > 0 && (
        <ul className="flex flex-col divide-y divide-surface-container">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-primary">{payment.label || 'Versement'}</p>
                <p className="text-xs text-on-surface-variant">{formatLongDate(payment.paidOn)}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-primary">{formatMoney(payment.amount)}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  window.confirm(`Supprimer le versement de ${formatMoney(payment.amount)} du ${formatLongDate(payment.paidOn)} ?`) &&
                  run(() => adminApi.deletePayment(payment.id))
                }
                aria-label={`Supprimer le versement du ${formatLongDate(payment.paidOn)}`}
                className={buttonClass.icon}
              >
                <Icon name="delete" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addPayment} className="flex flex-col gap-3 rounded-xl border border-dashed border-surface-container-high p-4">
        <p className="text-sm font-semibold text-primary">Enregistrer un versement</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="versement-montant" className="text-xs font-semibold text-on-surface-variant">
              Montant (FCFA)
            </label>
            <input id="versement-montant" inputMode="numeric" required value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="versement-date" className="text-xs font-semibold text-on-surface-variant">
              Reçu le
            </label>
            <input id="versement-date" type="date" required max={today()} value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="versement-libelle" className="text-xs font-semibold text-on-surface-variant">
              Libellé (facultatif)
            </label>
            <input id="versement-libelle" maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Acompte, deuxième versement…" className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={busy || !digits(amount)} className={`${buttonClass.primary} self-start`}>
          {busy && <ButtonSpinner />}
          Enregistrer le versement
        </button>
      </form>
    </Panel>
  );
}

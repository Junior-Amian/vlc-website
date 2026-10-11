import Icon from '../../components/ui/Icon';
import { formatLongDate, formatMoney } from '../../lib/format';
import { useClient } from '../ClientContext';
import { Card, PageTitle, ProgressBar } from '../ui';

/**
 * Suivi financier : le total de la prestation, ce qui est payé, ce qui
 * reste. Les versements se règlent auprès du conseiller ; l'espace les
 * affiche une fois enregistrés dans le panel. Le solde et la liste des
 * versements l'un sous l'autre au téléphone, côte à côte sur grand écran.
 */
export default function PaymentsPage() {
  const { dossier } = useClient();

  if (!dossier) {
    return <PageTitle title="Vos paiements">Votre dossier n'est pas encore disponible.</PageTitle>;
  }

  const { total, paid, balance, payments } = dossier.finance;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Vos paiements">
        Vos versements se règlent auprès de votre conseiller. Ils apparaissent ici dès qu'ils sont enregistrés.
      </PageTitle>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] xl:gap-8">
        <Card className="flex flex-col gap-5">
          {total === null ? (
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                <Icon name="schedule" size={24} />
              </span>
              <p className="pt-1 text-[0.9375rem] leading-relaxed text-on-surface">
                Le montant de votre prestation sera fixé avec votre conseiller. Il s'affichera ici.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-on-surface-variant">{balance === 0 ? 'Solde' : 'Reste à payer'}</p>
                {balance === 0 ? (
                  <p className="flex items-center gap-2 text-2xl font-extrabold text-brand-green sm:text-3xl">
                    <Icon name="check_circle" size={28} filled />
                    Tout est réglé
                  </p>
                ) : (
                  <p className="text-[2rem] font-extrabold leading-tight tracking-tight tabular-nums text-primary sm:text-4xl">
                    {formatMoney(balance ?? 0)}
                  </p>
                )}
              </div>

              {total > 0 && <ProgressBar value={paid / total} label="Part du montant déjà payée" tone={balance === 0 ? 'green' : 'secondary'} />}

              <dl className="grid grid-cols-2 gap-4 border-t border-surface-container pt-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-on-surface-variant">Total de la prestation</dt>
                  <dd className="text-base font-bold tabular-nums text-primary">{formatMoney(total)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-on-surface-variant">Déjà payé</dt>
                  <dd className="text-base font-bold tabular-nums text-primary">{formatMoney(paid)}</dd>
                </div>
              </dl>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-bold text-primary">Versements reçus</h2>

          {payments.length === 0 ? (
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Aucun versement enregistré pour l'instant. Chaque versement apparaîtra ici, daté, dès que votre conseiller l'aura enregistré.
            </p>
          ) : (
            <>
              {/* Grand écran : un relevé en tableau, daté, avec le total en pied. */}
              <table className="hidden w-full text-left text-sm lg:table">
                <caption className="sr-only">Versements reçus, dans l'ordre où ils ont été reçus</caption>
                <thead>
                  <tr className="border-b border-surface-container text-xs text-on-surface-variant">
                    <th scope="col" className="pb-3 font-semibold">Date</th>
                    <th scope="col" className="pb-3 font-semibold">Libellé</th>
                    <th scope="col" className="pb-3 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap py-3.5 pr-4 text-on-surface-variant">{formatLongDate(payment.paidOn)}</td>
                      <td className="py-3.5 pr-4 font-semibold text-primary">{payment.label || 'Versement'}</td>
                      <td className="whitespace-nowrap py-3.5 text-right font-bold tabular-nums text-primary">{formatMoney(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-container-high">
                    <th scope="row" colSpan={2} className="pt-3.5 font-semibold text-on-surface-variant">
                      Total versé
                    </th>
                    <td className="whitespace-nowrap pt-3.5 text-right font-extrabold tabular-nums text-primary">{formatMoney(paid)}</td>
                  </tr>
                </tfoot>
              </table>

              <ul className="flex flex-col divide-y divide-surface-container lg:hidden">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-brand-green">
                        <Icon name="check" size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary">{payment.label || 'Versement'}</p>
                        <p className="text-xs text-on-surface-variant">{formatLongDate(payment.paidOn)}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-primary">{formatMoney(payment.amount)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

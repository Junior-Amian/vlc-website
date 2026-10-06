import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { LogoBar } from '../components/ui/controls';
import { asset } from '../lib/asset';

const PROMISES = [
  { icon: 'schedule', text: "Suivez chaque étape de votre dossier, de l'ouverture à la décision." },
  { icon: 'lock', text: 'Déposez vos documents en sécurité, depuis votre téléphone.' },
  { icon: 'payments', text: 'Retrouvez vos versements et le solde restant.' },
];

/**
 * Cadre des écrans d'accès (connexion, invitation, mot de passe).
 *
 * Au téléphone : un bandeau marine à la marque, puis le formulaire. Sur
 * grand écran : la marque et ce que l'espace apporte à gauche, le
 * formulaire à droite. Le formulaire reste la seule action de l'écran.
 */
export default function AuthFrame({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative overflow-hidden bg-primary px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <a href={asset('/')} className="inline-flex items-center gap-3 rounded-xl">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1">
            <img src={asset('/logo.jpeg')} alt="" width={40} height={40} className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-[0.9375rem] font-bold leading-tight">VISILION CORPORATE</span>
            <span className="block text-xs text-on-primary-muted">Espace client</span>
          </span>
        </a>

        <div className="hidden max-w-md flex-col gap-8 lg:flex">
          <LogoBar className="h-1 w-24" />
          <p className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Votre dossier de visa, suivi de près, où que vous soyez.
          </p>
          <ul className="flex flex-col gap-4">
            {PROMISES.map((promise) => (
              <li key={promise.text} className="flex items-start gap-3 text-on-primary-soft">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-yellow">
                  <Icon name={promise.icon} size={20} />
                </span>
                <span className="pt-1.5 text-[0.9375rem] leading-relaxed">{promise.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-sm italic text-on-primary-muted lg:block">Notre vision, votre satisfaction.</p>
      </aside>

      <main className="relative -mt-10 px-4 pb-10 sm:px-8 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-surface-container bg-white p-6 shadow-lifted sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-[1.75rem]">{title}</h1>
            {intro && <p className="text-sm leading-relaxed text-on-surface-variant sm:text-[0.9375rem]">{intro}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Lien de retour vers la connexion, en bas des écrans secondaires. */
export function BackToLogin() {
  return (
    <Link
      to="/espace-client"
      className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-secondary-ink hover:underline"
    >
      <Icon name="arrow_back" size={18} />
      Retour à la connexion
    </Link>
  );
}

import Seo from '../components/ui/Seo';
import Icon from '../components/ui/Icon';

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page introuvable"
        description="La page demandée n'existe pas ou a été déplacée."
        path="/404"
      />

      <section className="flex min-h-[60vh] items-center justify-center px-4 py-20">
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <Icon name="explore_off" size={56} className="text-secondary" />

          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Cette page n'existe pas
          </h1>

          <p className="text-sm leading-relaxed text-on-surface-variant">
            Le lien est peut-être erroné ou la page a été déplacée. Revenez à l'accueil ou
            contactez-nous directement.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-container"
            >
              <Icon name="home" size={18} />
              <span>Retour à l'accueil</span>
            </a>

            <a
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/70 px-6 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <span>Nous contacter</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

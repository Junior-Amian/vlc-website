import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileActionBar from './components/layout/MobileActionBar';
import { useScrollReveal } from './lib/useScrollReveal';

/**
 * Coquille commune à toutes les pages publiques.
 */
export default function Layout() {
  const { pathname, hash } = useLocation();

  useScrollReveal(pathname);

  // Sans cela, React Router conserve la position de défilement d'une page à
  // l'autre et le visiteur arrive au milieu de la page suivante.
  useEffect(() => {
    if (hash) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu principal
      </a>

      <Header />

      <main id="contenu" className="w-full flex-1">
        <Outlet />
      </main>

      <Footer />
      <MobileActionBar />
    </div>
  );
}

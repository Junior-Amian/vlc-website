import Icon from '../ui/Icon';
import { site } from '../../data/site';

/*
  Bannière immersive, dans l'esprit de la maquette validée par le client
  (template/screen.png) : une photo de voyage sous un voile marine.

  Photo : Atikh Bana (@tikh) sur Unsplash, licence Unsplash (usage commercial
  libre, sans attribution obligatoire). Une voyageuse à Paris, et non un
  couple, pour ne pas être confondue avec les fondateurs, présentés juste
  après. À remplacer par une photo propre au client quand il en fournira une,
  en gardant les trois largeurs de public/images/.

  Deux compositions :
  - grand écran : photo en plein cadre, voile de gauche (texte) à droite
    (visage) ;
  - mobile et tablette : photo en haut, fondue dans le marine, texte en
    dessous, pour que le titre ne passe jamais sur le visage.
*/
export default function Hero() {
  return (
    <section id="accueil" className="relative isolate overflow-hidden bg-primary lg:flex lg:min-h-[min(100dvh,820px)] lg:items-center">
      <div className="relative h-[42vh] min-h-[260px] max-h-[440px] overflow-hidden sm:h-[50vh] sm:max-h-[520px] lg:absolute lg:inset-0 lg:-z-10 lg:h-auto lg:max-h-none">
        <img
          src="/images/hero-paris-1920.webp"
          srcSet="/images/hero-paris-960.webp 960w, /images/hero-paris-1920.webp 1920w, /images/hero-paris-2400.webp 2400w"
          sizes="100vw"
          width={1920}
          height={1280}
          fetchPriority="high"
          alt="Voyageuse souriante devant la tour Eiffel, à Paris"
          className="hero-zoom h-full w-full object-cover object-[62%_30%]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-primary/30 lg:bg-gradient-to-r lg:from-primary lg:from-10% lg:via-primary/75 lg:via-45% lg:to-transparent"
        />
      </div>

      <div className="relative mx-auto -mt-20 w-full max-w-7xl px-4 pb-14 sm:px-8 lg:mt-0 lg:pb-24 lg:pt-36">
        <div className="flex max-w-xl flex-col items-start gap-6 lg:max-w-2xl">
          <span className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-secondary-fixed">
            <Icon name="verified" size={16} />
            {site.slogan}
          </span>

          <h1
            className="animate-rise text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            Ensemble, nous vous ouvrons le monde.
          </h1>

          <p
            className="animate-rise max-w-[34rem] text-base leading-relaxed text-slate-200 sm:text-lg"
            style={{ animationDelay: '160ms' }}
          >
            Études, tourisme, affaires ou installation au Canada : votre visa préparé de A à Z depuis
            Abidjan, entretien compris.
          </p>

          <div
            className="animate-rise flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:gap-4"
            style={{ animationDelay: '240ms' }}
          >
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-all hover:bg-on-secondary-fixed active:scale-[0.98] sm:text-base"
            >
              <span>Démarrer ma procédure</span>
              <Icon name="arrow_forward" size={20} className="arrow-nudge" />
            </a>

            <a
              href="#services"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/40 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/15 active:scale-[0.98] sm:text-base"
            >
              Voir nos services
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Head } from 'vite-react-ssg';
import { site } from '../../data/site';

type SeoProps = {
  title: string;
  description: string;
  path: string;
  /** Données structurées JSON-LD éventuelles. */
  jsonLd?: Record<string, unknown>;
};

/**
 * JSON-LD sûr à placer dans un <script>.
 *
 * Le pré-rendu recopie le contenu du script tel quel dans le HTML : un texte
 * du panel contenant « </script> » refermerait la balise, et le script
 * suivant serait admis par la CSP calculée au build (audit de sécurité du
 * 22/10/2026). Remplacer <, > et & par leur échappement
 * Unicode garde un JSON identique pour les moteurs.
 */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Balises <head> par page.
 *
 * `Head` de vite-react-ssg les inscrit réellement dans le HTML généré au
 * build : les moteurs et les aperçus de partage les voient sans exécuter
 * de JavaScript.
 */
export default function Seo({ title, description, path, jsonLd }: SeoProps) {
  const fullTitle = path === '/' ? title : `${title} | ${site.name}`;
  const canonical = `${site.baseUrl}${path === '/' ? '' : path}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="fr_FR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {jsonLd && (
        <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      )}
    </Head>
  );
}

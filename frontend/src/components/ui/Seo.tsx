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
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Head>
  );
}

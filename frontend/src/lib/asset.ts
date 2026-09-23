/**
 * Chemin d'un fichier de `public/`, préfixé par la base du site.
 *
 * Sur le domaine final et en développement, `BASE_URL` vaut « / » : le
 * chemin ressort inchangé. Sur un aperçu servi depuis un sous-dossier —
 * GitHub Pages publie sous `/vlc-website/` — il vaut ce sous-dossier.
 *
 * Ce passage est obligé : Vite ne réécrit que les URL trouvées dans
 * `index.html`. Celles écrites dans le code TypeScript sont de simples
 * chaînes, qu'il laisse telles quelles ; un `/logo.jpeg` codé en dur
 * pointerait donc à la racine du domaine et renverrait une erreur 404.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

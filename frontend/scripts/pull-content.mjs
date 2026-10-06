/*
  Rafraîchit le contenu intégré à la compilation (src/content/baseline.json)
  à partir du contenu publié par l'API.

    npm run content:pull                          # site en ligne
    npm run content:pull -- http://localhost:5173 # API locale (via le proxy de Vite)

  À lancer avant `npm run build` : le HTML pré-rendu reprend alors les
  textes du panel, et le site n'a plus rien à remplacer au chargement.
  Sans cette étape, le site reste correct (il applique le contenu à jour au
  démarrage), mais les moteurs qui n'exécutent pas JavaScript voient
  l'ancienne version.
*/
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? 'https://visilioncorporate.com').replace(/\/$/, '');
const url = `${base}/api/content`;
const target = fileURLToPath(new URL('../src/content/baseline.json', import.meta.url));

const response = await fetch(url, { headers: { Accept: 'application/json' } }).catch((error) => {
  console.error(`Impossible de joindre ${url} : ${error.message}`);
  process.exit(1);
});

const payload = await response.json().catch(() => null);

if (!response.ok || payload?.success !== true || typeof payload.data !== 'object') {
  console.error(`Réponse inattendue de ${url} (HTTP ${response.status}).`);
  process.exit(1);
}

// Une section jamais enregistrée dans le panel est absente de la réponse :
// elle garde sa version actuelle.
const current = JSON.parse(await readFile(target, 'utf8'));
const merged = { ...current };

for (const key of Object.keys(current)) {
  if (payload.data[key] !== undefined) {
    merged[key] = payload.data[key];
  }
}

await writeFile(target, `${JSON.stringify(merged, null, 2)}\n`);

const updated = Object.keys(current).filter((key) => payload.data[key] !== undefined);
console.log(`baseline.json mis à jour depuis ${url} (${updated.length} sections).`);

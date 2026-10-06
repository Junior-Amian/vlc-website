/*
  Complète la politique de contenu (CSP) de dist/.htaccess après la
  compilation : `npm run build` l'appelle en dernier.

  Les pages pré-rendues contiennent des scripts intégrés, dont certains
  changent à chaque compilation (données d'hydratation, empreinte de
  vite-react-ssg). La CSP les admet un par un, par leur empreinte SHA-256,
  plutôt que d'autoriser tout script en ligne.

  Si VITE_API_URL désigne une API sur un autre domaine, son origine est
  ajoutée aux connexions permises.

  La compilation échoue si .htaccess ne porte plus les marqueurs : mieux
  vaut un échec visible qu'un site en ligne dont la CSP bloque les scripts.
*/
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const htaccess = path.join(dist, '.htaccess');

/** Scripts exécutés par le navigateur ; un bloc JSON-LD ne l'est pas. */
const EXECUTABLE = /^(|module|text\/javascript|application\/javascript)$/i;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) return htmlFiles(full);

      return entry.name.endsWith('.html') ? [full] : [];
    }),
  );

  return nested.flat();
}

const hashes = new Set();

for (const file of await htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');

  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attributes)) continue;

    const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attributes)?.[1] ?? '';

    if (!EXECUTABLE.test(type)) continue;

    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}

let apiOrigin = '';

if (process.env.VITE_API_URL) {
  try {
    apiOrigin = ` ${new URL(process.env.VITE_API_URL).origin}`;
  } catch {
    console.error(`VITE_API_URL n'est pas une adresse valide : ${process.env.VITE_API_URL}`);
    process.exit(1);
  }
}

const rules = await readFile(htaccess, 'utf8');

if (!rules.includes('__CSP_SCRIPT_HASHES__') || !rules.includes('__CSP_API_ORIGIN__')) {
  console.error('dist/.htaccess ne contient plus les marqueurs de la CSP (__CSP_SCRIPT_HASHES__, __CSP_API_ORIGIN__).');
  process.exit(1);
}

await writeFile(
  htaccess,
  rules
    .replace('__CSP_SCRIPT_HASHES__', [...hashes].sort().join(' '))
    .replace('__CSP_API_ORIGIN__', apiOrigin),
);

console.log(`CSP : ${hashes.size} script(s) intégré(s) admis par empreinte.`);

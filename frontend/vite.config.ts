import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  /*
    Racine du site. Le domaine final et l'hébergement cPanel servent le site
    à la racine, d'où « / » par défaut. GitHub Pages le publie dans un
    sous-dossier (/vlc-website/) : le workflow .github/workflows/pages.yml
    renseigne alors VITE_BASE. Sans cela, toutes les URL d'actifs et le
    basename du routeur (voir src/main.tsx) pointeraient à côté.
  */
  base: process.env.VITE_BASE || '/',

  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    // En développement, le front appelle /api/... sur son propre port et
    // Vite relaie vers PHP. Cela évite toute question de CORS en local et
    // reproduit la configuration de production, où les deux sont servis
    // depuis le même domaine.
    proxy: {
      '/api': {
        target: 'http://localhost/vlc-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  build: {
    outDir: 'dist',
    // L'hébergement mutualisé sert les fichiers tels quels : on garde des
    // noms hachés pour pouvoir mettre un cache long sur /assets.
    assetsDir: 'assets',
    sourcemap: false,
  },
});

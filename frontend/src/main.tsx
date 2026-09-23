import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './styles/index.css';

/*
  Point d'entrée unique.

  En développement, ViteReactSSG se comporte comme un createRoot classique.
  Au build, il parcourt `routes`, rend chaque page en HTML statique et écrit
  un fichier par URL — ce qui donne un site indexable par Google tout en
  restant une application React une fois chargée.
*/
export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
});

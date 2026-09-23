import type { RouteRecord } from 'vite-react-ssg';
import Layout from './App';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

/*
  Le site tient sur une seule page ; la navigation se fait par ancres.

  La route « * » reste nécessaire : l'hébergement renvoie toute URL inconnue
  vers index.html, et c'est elle qui affiche alors la page d'erreur plutôt
  qu'un écran vide.

  Pour repasser à des pages distinctes, il suffira de rétablir des entrées
  ici : les sections sont déjà des composants autonomes dans components/home.
*/
export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

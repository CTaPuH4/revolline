import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const New = lazy(() => import('./pages/New'));
const Sales = lazy(() => import('./pages/Sales'));
const About = lazy(() => import('./pages/About'));
const Partners = lazy(() => import('./pages/Partners'));
const Cart = lazy(() => import('./pages/Cart'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> }, // вместо path: "", используем index
      { path: 'catalog', element: <Catalog /> },
      { path: 'new', element: <New /> },
      { path: 'sales', element: <Sales /> },
      { path: 'about', element: <About /> },
      { path: 'cart', element: <Cart /> },
      { path: 'partners', element: <Partners /> },
      { path: 'favorites', element: <Favorites /> },
      { path: 'profile', element: <Profile /> },
      { path: 'policy', element: <PrivacyPolicy /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  ) 
}

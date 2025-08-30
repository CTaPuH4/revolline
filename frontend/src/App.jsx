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
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ProductPage = lazy(() => import('./pages/ProductPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'catalog',
        children: [
          { index: true, element: <Catalog /> },
          { path: ':sectionSlug', element: <Catalog /> },
          { path: ':sectionSlug/:categorySlug', element: <Catalog /> },
        ],
      },
      { path: 'product/:id', element: <ProductPage /> },
      {
        path: 'new',
        children: [
          { index: true, element: <New /> }, // /new
          { path: ':sectionSlug', element: <New /> }, // /new/:sectionSlug
          { path: ':sectionSlug/:categorySlug', element: <New /> }, // /new/:sectionSlug/:categorySlug
        ],
      },
      {
        path: 'sales',
        children: [
          { index: true, element: <Sales /> }, // /sales
          { path: ':sectionSlug', element: <Sales /> }, // /sales/:sectionSlug
          { path: ':sectionSlug/:categorySlug', element: <Sales /> }, // /sales/:sectionSlug/:categorySlug
        ],
      },
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
  );
}

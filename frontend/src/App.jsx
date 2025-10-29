import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';


const Activate = lazy(() => import('./pages/Activate'));
const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const New = lazy(() => import('./pages/New'));
const Sales = lazy(() => import('./pages/Sales'));
const Cart = lazy(() => import('./pages/Cart'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Info = lazy(() => import('./pages/Info'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Orders = lazy(() => import('./pages/Orders'));
const CreateOrder = lazy(() => import('./pages/CreateOrder'));
const ConfirmReset  = lazy(() => import('./pages/ConfirmReset'));

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

      {
        path: 'info',
        children: [
          // /info -> редиректим на /info/privacy
          { index: true, element: <Navigate to="/info/privacy" replace /> },
          // /info/:pageId -> PrivacyPolicy читает useParams().pageId
          { path: ':pageId', element: <Info /> },
        ],
      },
      { path: 'cart', element: <Cart /> },
      { path: 'favorites', element: <Favorites /> },
      { path: 'profile', element: <Profile /> },
      { path: 'orders', element: <Orders /> },
      { path: 'create', element: <CreateOrder /> },
      { path: '*', element: <NotFound /> },
      { path: 'activate/:uidb64/:token', element: <Activate /> },
      { path: 'reset', element: <ConfirmReset /> },
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

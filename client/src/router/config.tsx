import AdminPage from '@/pages/admin/page';
import Profile from '@/pages/profile/page';
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const Home = lazy(() => import('../pages/home/page'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Landing = lazy(() => import('../pages/landing/page'));
const Auth = lazy(() => import('../pages/auth/page'));
const Questionnaire = lazy(() => import('../pages/questionnaire/page'));
const MarketSelection = lazy(() => import('../pages/market-selection/page'));
const RecipeSwiper = lazy(() => import('../pages/recipe-swiper/page'));
const ShoppingList = lazy(() => import('../pages/shopping-list/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/auth',
    element: <Auth />,
  },
  {
    path: '/questionnaire',
    element: <Questionnaire />,
  },
  {
    path: '/market-selection',
    element: <MarketSelection />,
  },
  {
    path: '/recipe-swiper',
    element: <RecipeSwiper />,
  },
  {
    path: '/shopping-list',
    element: <ShoppingList />,
  },
  {
    path: '/profile',
    element: <Profile />
  },
  {
    path: '*',
    element: <NotFound />,
  },
  {
    path: '/admin',
    element: <AdminPage />
  }
];

export default routes;

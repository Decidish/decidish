
import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import NotFound from "@/pages/NotFound";

const Landing = lazy(() => import("@/pages/landing/page"));
const Auth = lazy(() => import("@/pages/auth/page"));
const Profile = lazy(() => import("@/pages/profile/page"));
const Questionnaire = lazy(() => import("@/pages/questionnaire/page"));
const RecipeSwiper = lazy(() => import("@/pages/recipe-swiper/page"));
const ShoppingList = lazy(() => import("@/pages/shopping-list/page"));
const MarketSelection = lazy(() => import("@/pages/market-selection/page"));
const Admin = lazy(() => import("@/pages/admin/page"));
const Search = lazy(() => import("@/pages/search/page"));
const SearchProducts = lazy(() => import("@/pages/search-products/page"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <MainLayout><Landing /></MainLayout>,
  },
  {
    path: "/auth",
    element: <MainLayout><Auth /></MainLayout>,
  },
  {
    path: "/profile",
    element: <MainLayout><Profile /></MainLayout>,
  },
  {
    path: "/questionnaire",
    element: <MainLayout><Questionnaire /></MainLayout>,
  },
  {
    path: "/recipe-swiper",
    element: <MainLayout><RecipeSwiper /></MainLayout>,
  },
  {
    path: "/shopping-list",
    element: <MainLayout><ShoppingList /></MainLayout>,
  },
  {
    path: "/market-selection",
    element: <MainLayout><MarketSelection /></MainLayout>,
  },
  {
    path: "/admin",
    element: <MainLayout><Admin /></MainLayout>,
  },
  {
    path: "/search",
    element: <MainLayout><Search /></MainLayout>,
  },
  {
    path: "/search-products",
    element: <MainLayout><SearchProducts /></MainLayout>,
  },
  {
    path: "*",
    element: <NotFound></NotFound>
  },
];

export default routes;

import { lazy } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { App } from '@/App'
import { AuthLayout } from '@/layouts/AuthLayout'
import { LibraryLayout } from '@/layouts/LibraryLayout'
import { MainLayout } from '@/layouts/MainLayout'

/* Route-level code splitting: every page is its own chunk. */
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const BrowsePage = lazy(() => import('@/pages/catalog/BrowsePage'))
const SearchPage = lazy(() => import('@/pages/catalog/SearchPage'))
const GenresPage = lazy(() => import('@/pages/catalog/GenresPage'))
const GenrePage = lazy(() => import('@/pages/catalog/GenrePage'))
const SeasonPage = lazy(() => import('@/pages/catalog/SeasonPage'))
const SchedulePage = lazy(() => import('@/pages/catalog/SchedulePage'))
const CharactersPage = lazy(() => import('@/pages/catalog/CharactersPage'))
const CharacterPage = lazy(() => import('@/pages/catalog/CharacterPage'))
const StudiosPage = lazy(() => import('@/pages/catalog/StudiosPage'))
const StudioPage = lazy(() => import('@/pages/catalog/StudioPage'))
const AnimeDetailsPage = lazy(() => import('@/pages/anime/AnimeDetailsPage'))
const WatchPage = lazy(() => import('@/pages/anime/WatchPage'))
const EpisodesPage = lazy(() => import('@/pages/anime/EpisodesPage'))
const WatchlistPage = lazy(() => import('@/pages/profile/WatchlistPage'))
const HistoryPage = lazy(() => import('@/pages/profile/HistoryPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const PublicProfilePage = lazy(() => import('@/pages/profile/PublicProfilePage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const PricingPage = lazy(() => import('@/pages/info/PricingPage'))
const AboutPage = lazy(() => import('@/pages/info/AboutPage'))
const ContactPage = lazy(() => import('@/pages/info/ContactPage'))
const PrivacyPage = lazy(() => import('@/pages/info/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/info/TermsPage'))
const NotFoundPage = lazy(() => import('@/pages/info/NotFoundPage'))
const StatusPage = lazy(() => import('@/pages/info/StatusPage'))

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'browse', element: <BrowsePage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'genres', element: <GenresPage /> },
          { path: 'genres/:genre', element: <GenrePage /> },
          { path: 'season', element: <SeasonPage /> },
          { path: 'season/:season', element: <SeasonPage /> },
          { path: 'schedule', element: <SchedulePage /> },
          { path: 'anime/:id', element: <AnimeDetailsPage /> },
          { path: 'anime/:id/watch', element: <WatchPage /> },
          { path: 'anime/:id/episodes', element: <EpisodesPage /> },
          { path: 'characters', element: <CharactersPage /> },
          { path: 'character/:id', element: <CharacterPage /> },
          { path: 'studios', element: <StudiosPage /> },
          { path: 'studio/:id', element: <StudioPage /> },
          { path: 'u/:username', element: <PublicProfilePage /> },
          {
            element: <LibraryLayout />,
            children: [
              { path: 'watchlist', element: <WatchlistPage /> },
              { path: 'history', element: <HistoryPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
          { path: 'pricing', element: <PricingPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'contact', element: <ContactPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
          { path: 'terms', element: <TermsPage /> },
          { path: 'status', element: <StatusPage /> },
          { path: '404', element: <NotFoundPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'reset-password', element: <ResetPasswordPage /> },
        ],
      },
      { path: 'home', element: <Navigate to="/" replace /> },
    ],
  },
]

export const router = createBrowserRouter(routes)

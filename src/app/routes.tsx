import type { RouteObject } from 'react-router';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { HomePage } from '@/pages/HomePage';
import { PathPage } from '@/pages/PathPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RootLayout } from './layout/RootLayout';

/**
 * Route table (see docs/02-architecture/routing.md). Home and Path are eager;
 * everything else is code-split with route-level `lazy`.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    HydrateFallback: PageSkeleton,
    children: [
      { index: true, Component: HomePage },
      { path: 'path', Component: PathPage },
      {
        path: 'module/:moduleId',
        lazy: () => import('@/pages/ModulePage').then((m) => ({ Component: m.ModulePage })),
      },
      {
        path: 'lesson/:lessonId',
        lazy: () => import('@/pages/LessonPage').then((m) => ({ Component: m.LessonPage })),
      },
      {
        path: 'lesson/:lessonId/quiz',
        lazy: () => import('@/pages/QuizPage').then((m) => ({ Component: m.QuizPage })),
      },
      {
        path: 'exam/:moduleId',
        lazy: () => import('@/pages/ExamPage').then((m) => ({ Component: m.ExamPage })),
      },
      {
        path: 'simulator/:scenarioId?',
        lazy: () => import('@/pages/SimulatorPage').then((m) => ({ Component: m.SimulatorPage })),
      },
      {
        path: 'tools/:calcId?',
        lazy: () => import('@/pages/ToolsPage').then((m) => ({ Component: m.ToolsPage })),
      },
      {
        path: 'journal',
        lazy: () => import('@/pages/JournalPage').then((m) => ({ Component: m.JournalPage })),
      },
      {
        path: 'journal/:entryId',
        lazy: () =>
          import('@/pages/JournalEntryPage').then((m) => ({ Component: m.JournalEntryPage })),
      },
      {
        path: 'glossary/:termId?',
        lazy: () => import('@/pages/GlossaryPage').then((m) => ({ Component: m.GlossaryPage })),
      },
      {
        path: 'cheatsheets',
        lazy: () =>
          import('@/pages/CheatsheetsPage').then((m) => ({ Component: m.CheatsheetsPage })),
      },
      {
        path: 'stats',
        lazy: () => import('@/pages/StatsPage').then((m) => ({ Component: m.StatsPage })),
      },
      {
        path: 'achievements',
        lazy: () =>
          import('@/pages/AchievementsPage').then((m) => ({ Component: m.AchievementsPage })),
      },
      {
        path: 'settings',
        lazy: () => import('@/pages/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
      },
      {
        path: 'certificate',
        lazy: () =>
          import('@/pages/CertificatePage').then((m) => ({ Component: m.CertificatePage })),
      },
      {
        path: 'plan',
        lazy: () => import('@/pages/PlanPage').then((m) => ({ Component: m.PlanPage })),
      },
      {
        path: 'about',
        lazy: () => import('@/pages/AboutPage').then((m) => ({ Component: m.AboutPage })),
      },
      // Dev-only UI showcase: the whole branch is removed from production builds.
      ...(import.meta.env.DEV
        ? [
            {
              path: 'dev/ui',
              lazy: () => import('@/pages/DevUiPage').then((m) => ({ Component: m.DevUiPage })),
            },
          ]
        : []),
      { path: '*', Component: NotFoundPage },
    ],
  },
];

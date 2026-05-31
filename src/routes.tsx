import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ZoneDetailsPage from './pages/ZoneDetailsPage';
import ReportPage from './pages/ReportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import OperationsPage from './pages/OperationsPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Overview',    path: '/',             element: <LandingPage />,     public: true },
  { name: 'Dashboard',   path: '/dashboard',    element: <DashboardPage />,   public: true },
  { name: 'Map',         path: '/map',          element: <MapPage />,         public: true },
  { name: 'Zone',        path: '/zone/:zoneId', element: <ZoneDetailsPage />, public: true },
  { name: 'Analytics',   path: '/analytics',    element: <AnalyticsPage />,   public: true },
  { name: 'Report',      path: '/report',       element: <ReportPage />,      public: true },
  { name: 'Operations',  path: '/operations',   element: <OperationsPage />,  public: true },
];

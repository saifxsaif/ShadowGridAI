import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AppProvider } from '@/store/AppContext';
import { routes } from './routes';

const App: React.FC = () => {
  return (
    <Router>
      <AppProvider>
        <IntersectObserver />
        <AppLayout>
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        <Toaster />
      </AppProvider>
    </Router>
  );
};

export default App;

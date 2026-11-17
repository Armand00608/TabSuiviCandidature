import { useMemo } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from '@/state/store';
import { createDefaultRepository } from '@/storage/localStorageRepository';
import { ToastProvider } from '@/components/Toast';
import { AppLayout } from '@/features/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TrackerPage } from '@/features/trackers/TrackerPage';
import { TrackerSettingsPage } from '@/features/settings/TrackerSettingsPage';
import { DataPage } from '@/features/settings/DataPage';
import { NotFound } from '@/features/layout/NotFound';

export function App() {
  const repository = useMemo(createDefaultRepository, []);
  return (
    <StoreProvider repository={repository}>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="suivi/:trackerId" element={<TrackerPage />} />
              <Route path="suivi/:trackerId/parametres" element={<TrackerSettingsPage />} />
              <Route path="donnees" element={<DataPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}

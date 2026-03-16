import { Outlet } from 'react-router-dom';
import { PageLayoutProvider } from '@/contexts/PageLayoutContext';
import { ErrorBoundary } from '../ErrorBoundary';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  return (
    <PageLayoutProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto min-h-0 bg-background border-l border-t border-border">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </PageLayoutProvider>
  );
}

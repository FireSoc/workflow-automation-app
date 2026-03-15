import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-h-0">
        <main className="flex-1 overflow-y-auto min-h-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

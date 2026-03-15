import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Projects } from './pages/Projects';
import { ProjectsLanding } from './pages/ProjectsLanding';
import { ProjectDetail } from './pages/ProjectDetail';
import { AtRiskAccounts } from './pages/AtRiskAccounts';
import { PlaybookInspector } from './pages/PlaybookInspector';
import { CustomerPortalProject } from './pages/CustomerPortalProject';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/at-risk" element={<AtRiskAccounts />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/projects" element={<ProjectsLanding />} />
            <Route path="/projects/list" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/playbooks" element={<PlaybookInspector />} />
            <Route path="/portal/projects/:id" element={<CustomerPortalProject />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

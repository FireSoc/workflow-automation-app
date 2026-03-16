import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Projects } from './pages/Projects';
import { ProjectsLanding } from './pages/ProjectsLanding';
import { ProjectDetail } from './pages/ProjectDetail';
import { PlaybookInspector } from './pages/PlaybookInspector';
import { CustomerPortalProject } from './pages/CustomerPortalProject';
import { ImportDeal } from './pages/ImportDeal';
import { Simulator } from './pages/Simulator';
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
          <Route path="/" element={<Landing />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/at-risk" element={<Navigate to="/dashboard" replace />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/projects" element={<ProjectsLanding />} />
            <Route path="/projects/list" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/playbooks" element={<PlaybookInspector />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/deals/import" element={<ImportDeal />} />
            <Route path="/portal/projects/:id" element={<CustomerPortalProject />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

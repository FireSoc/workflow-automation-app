import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { FolderKanban, Plus } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { ProjectForm } from '../components/ui/ProjectForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

function getDefaultProjectId(
  projects: { id: number; customer_id: number; created_at: string }[],
  customers: { id: number; created_at: string }[]
): number | null {
  if (!projects.length || !customers.length) return null;
  const customersByNewest = [...customers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const mostRecentCustomerId = customersByNewest[0].id;
  const thatCompanyProjects = projects
    .filter((p) => p.customer_id === mostRecentCustomerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (!thatCompanyProjects.length) {
    const fallback = [...projects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return fallback?.id ?? null;
  }
  return thatCompanyProjects[0].id;
}

export function ProjectsLanding() {
  const [isModalOpen, setModalOpen] = useState(false);

  const { data: projects, isPending: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers, isPending: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const isPending = loadingProjects || loadingCustomers;

  if (isPending) return <PageLoading />;

  const defaultId = projects && customers ? getDefaultProjectId(projects, customers) : null;

  if (defaultId != null) {
    return <Navigate to={`/projects/${defaultId}`} replace />;
  }

  return (
    <div className="p-6">
      <EmptyState
        title="No projects yet"
        description="Create an onboarding project for a customer to get started."
        icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Onboarding Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSuccess={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

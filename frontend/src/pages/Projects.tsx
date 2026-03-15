import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle, FolderKanban, ExternalLink } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '../components/ui/StatusBadge';
import { ProjectForm } from '../components/ui/ProjectForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Projects() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const projectId = searchParams.get('project');

  const { data: projects, isPending: loadingProjects, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  const filteredByCompany = companyId
    ? projects?.filter((p) => p.customer_id === Number(companyId))
    : projects;

  const filteredProjects =
    projectId && filteredByCompany
      ? filteredByCompany.filter((p) => p.id === Number(projectId))
      : filteredByCompany;

  const projectsForProjectDropdown = filteredByCompany ?? [];

  function setCompany(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('company', value);
    else next.delete('company');
    next.delete('project');
    setSearchParams(next);
  }

  function setProject(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('project', value);
    else next.delete('project');
    setSearchParams(next);
  }

  const tableTitle =
    companyId && projectId
      ? 'Project'
      : companyId
        ? `Projects for ${customerMap.get(Number(companyId))?.company_name ?? 'Customer'}`
        : 'All Projects';

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {!loadingProjects && !isError && (projects?.length ?? 0) > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-company" className="text-sm font-medium">
                  Company
                </Label>
                <select
                  id="filter-company"
                  value={companyId ?? ''}
                  onChange={(e) => setCompany(e.target.value)}
                  aria-label="Filter by company"
                  className={cn(
                    'flex h-8 w-48 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  <option value="">All companies</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-project" className="text-sm font-medium">
                  Project
                </Label>
                <select
                  id="filter-project"
                  value={projectId ?? ''}
                  onChange={(e) => setProject(e.target.value)}
                  aria-label="Filter by project"
                  disabled={projectsForProjectDropdown.length === 0}
                  className={cn(
                    'flex h-8 w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                  )}
                >
                  <option value="">All projects</option>
                  {projectsForProjectDropdown.map((p) => {
                    const customer = customerMap.get(p.customer_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {customer?.company_name ?? `Customer #${p.customer_id}`} — #{p.id}
                      </option>
                    );
                  })}
                </select>
              </div>
            </>
          )}
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {loadingProjects && <PageLoading />}

      {isError && (
        <ErrorAlert
          message="Failed to load projects. Is the backend running?"
          onRetry={() => refetch()}
        />
      )}

      {!loadingProjects && !isError && filteredProjects?.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create a new onboarding project for a customer to get started."
          icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          }
        />
      )}

      {!loadingProjects && !isError && filteredProjects && filteredProjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              {tableTitle}
              <Badge variant="secondary" className="font-normal">
                {filteredProjects.length}
              </Badge>
            </CardTitle>
            {(companyId || projectId) && (
              <Button variant="link" size="sm" className="text-primary" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5 py-3">Customer</TableHead>
                  <TableHead className="px-5 py-3">Stage</TableHead>
                  <TableHead className="px-5 py-3">Status</TableHead>
                  <TableHead className="px-5 py-3">Risk</TableHead>
                  <TableHead className="px-5 py-3">Updated</TableHead>
                  <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const customer = customerMap.get(project.customer_id);
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-foreground">
                            {customer?.company_name ?? `Customer #${project.customer_id}`}
                          </p>
                          {customer && (
                            <div className="mt-0.5">
                              <CustomerTypeBadge type={customer.customer_type} />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <StageBadge stage={project.current_stage} />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        {project.risk_flag ? (
                          <div className="flex items-center gap-1 text-destructive text-xs font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            At Risk
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {new Date(project.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        <Link to={`/projects/${project.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Onboarding Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            preselectedCustomerId={companyId ? Number(companyId) : undefined}
            onSuccess={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

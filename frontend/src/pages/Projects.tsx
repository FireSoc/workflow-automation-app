import { useLayoutEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '../components/ui/StatusBadge';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';
import { ProjectForm } from '../components/ui/ProjectForm';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterBar } from '@/components/ui/FilterBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Projects() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: number; label: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPageLayout } = usePageLayout();
  const queryClient = useQueryClient();
  const companyId = searchParams.get('company');
  const projectId = searchParams.get('project');
  const atRisk = searchParams.get('atRisk') === '1';

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToDelete(null);
    },
  });

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

  const displayedProjects = atRisk
    ? (filteredProjects?.filter((p) => p.status === 'at_risk' || p.risk_flag) ?? [])
    : (filteredProjects ?? []);

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

  function setAtRisk(value: boolean) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('atRisk', '1');
    else next.delete('atRisk');
    setSearchParams(next);
  }

  const tableTitle =
    companyId && projectId
      ? 'Project'
      : companyId
        ? `Projects for ${customerMap.get(Number(companyId))?.company_name ?? 'Customer'}`
        : atRisk
          ? 'At-risk projects'
          : 'All Projects';

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Projects',
      subtitle: 'Browse and filter onboarding projects.',
      action: (
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New project
        </Button>
      ),
    });
  }, [setPageLayout]);

  return (
    <PageContainer className="flex flex-col gap-6">
      {!loadingProjects && !isError && (projects?.length ?? 0) > 0 && (
        <FilterBar>
          <Select
            value={companyId ?? ''}
            onValueChange={(v) => setCompany(v ?? '')}
          >
            <SelectTrigger
              id="filter-company"
              size="sm"
              className="w-48"
              aria-label="Filter by company"
            >
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All companies</SelectItem>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={projectId ?? ''}
            onValueChange={(v) => setProject(v ?? '')}
          >
            <SelectTrigger
              id="filter-project"
              size="sm"
              className="w-56"
              aria-label="Filter by project"
              disabled={projectsForProjectDropdown.length === 0}
            >
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All projects</SelectItem>
              {projectsForProjectDropdown.map((p) => {
                const customer = customerMap.get(p.customer_id);
                return (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {customer?.company_name ?? `Customer #${p.customer_id}`} — #{p.id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={atRisk}
              onChange={(e) => setAtRisk(e.target.checked)}
              aria-label="At risk only"
              className="rounded border-input"
            />
            At risk only
          </label>
        </FilterBar>
      )}

      {loadingProjects && <PageLoading />}

      {isError && (
        <ErrorAlert
          message="Failed to load projects. Is the backend running?"
          onRetry={() => refetch()}
        />
      )}

      {!loadingProjects && !isError && (filteredProjects?.length ?? 0) === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create a new onboarding project for a customer or import a deal from your CRM."
          icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
              <Link
                to="/deals/import"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Import a deal
              </Link>
            </div>
          }
        />
      )}

      {!loadingProjects && !isError && filteredProjects && filteredProjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              {tableTitle}
              <Badge variant="secondary" className="font-normal">
                {displayedProjects.length}
              </Badge>
            </CardTitle>
            {(companyId || projectId || atRisk) && (
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
                {displayedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No at-risk projects. Clear the filter or check back later.
                    </TableCell>
                  </TableRow>
                ) : (
                displayedProjects.map((project, index) => {
                  const customer = customerMap.get(project.customer_id);
                  return (
                    <TableRow
                      key={project.id}
                      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                      style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}
                    >
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
                        <RiskScoreBadge
                          score={project.risk_score ?? null}
                          level={project.risk_level ?? undefined}
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {new Date(project.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Actions">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setProjectToDelete({
                                    id: project.id,
                                    label: `${customer?.company_name ?? `Customer #${project.customer_id}`} — #${project.id}`,
                                  })
                                }
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
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

      <Dialog open={projectToDelete != null} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{projectToDelete?.label}</strong>? All tasks and events for this
            project will be removed. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete.id)}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

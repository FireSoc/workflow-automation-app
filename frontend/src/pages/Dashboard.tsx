import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  FolderKanban,
  AlertTriangle,
  Users,
  ArrowRight,
  LayoutGrid,
  FlaskConical,
  Lightbulb,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { ActionPanel } from '@/components/ui/ActionPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EventFeed } from '@/components/ui/EventFeed';
import { STAGE_LABELS, type Project, type Task, type OnboardingEvent, type ProjectDetail } from '../types';

const DASHBOARD_PROJECT_LIMIT = 10;

export interface TaskWithProject extends Task {
  projectName: string;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isOverdue(dateStr: string | null, status: Task['status']): boolean {
  if (!dateStr || status === 'completed') return false;
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isFuture(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return new Date(dateStr) > new Date(new Date().setHours(23, 59, 59, 999));
}

export function Dashboard() {
  const [tasksFilter, setTasksFilter] = useState<'all' | 'mine'>('all');
  const { setPageLayout } = usePageLayout();

  const { data: projects, isPending: loadingProjects, isError: errorProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers, isPending: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const projectIds = useMemo(() => (projects ?? []).slice(0, DASHBOARD_PROJECT_LIMIT).map((p) => p.id), [projects]);

  const detailQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ['project', id] as const,
      queryFn: () => projectsApi.get(id),
      enabled: !!projects && projectIds.length > 0,
    })),
  });

  const projectDetails = useMemo(() => {
    return detailQueries
      .filter((q) => q.data != null)
      .map((q) => q.data as ProjectDetail);
  }, [detailQueries]);

  const { aggregatedTasks, aggregatedEvents, projectProgress } = useMemo(() => {
    const tasks: TaskWithProject[] = [];
    const events: OnboardingEvent[] = [];
    const progress: Record<number, { completed: number; total: number }> = {};

    for (const detail of projectDetails) {
      const project = projects?.find((p) => p.id === detail.id);
      const customer = customers?.find((c) => c.id === detail.customer_id);
      const projectName = project?.name ?? customer?.company_name ?? `Project #${detail.id}`;

      for (const t of detail.tasks ?? []) {
        tasks.push({ ...t, projectName });
      }
      for (const e of detail.events ?? []) {
        events.push(e);
      }
      const taskList = detail.tasks ?? [];
      const total = taskList.length;
      const completed = taskList.filter((t) => t.status === 'completed').length;
      progress[detail.id] = { completed, total };
    }

    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      aggregatedTasks: tasks,
      aggregatedEvents: events,
      projectProgress: progress,
    };
  }, [projectDetails, projects, customers]);

  const filteredTasks = useMemo(() => {
    if (tasksFilter === 'mine') {
      return aggregatedTasks.filter((t) => t.assigned_to != null && t.assigned_to !== '');
    }
    return aggregatedTasks;
  }, [aggregatedTasks, tasksFilter]);

  const orderedTasksForActions = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aOverdue = isOverdue(a.due_date, a.status);
      const bOverdue = isOverdue(b.due_date, b.status);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      const aBlocked = a.status === 'blocked';
      const bBlocked = b.status === 'blocked';
      if (aBlocked && !bBlocked) return -1;
      if (!aBlocked && bBlocked) return 1;
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [filteredTasks]);

  const todoBuckets = useMemo(() => {
    const incomplete = aggregatedTasks.filter((t) => t.status !== 'completed');
    const today = incomplete.filter((t) => isToday(t.due_date));
    const overdue = incomplete.filter((t) => isOverdue(t.due_date, t.status));
    const future = incomplete.filter((t) => isFuture(t.due_date));
    return { today, overdue, future, all: incomplete };
  }, [aggregatedTasks]);

  const totalProjects = projects?.length ?? 0;
  const completedProjects = projects?.filter((p) => p.status === 'completed').length ?? 0;
  const atRiskProjects = projects?.filter((p) => p.status === 'at_risk' || p.risk_flag).length ?? 0;
  const totalTasks = aggregatedTasks.length;
  const completedTasks = aggregatedTasks.filter((t) => t.status === 'completed').length;
  const needsAttention = todoBuckets.overdue.length + (atRiskProjects > 0 ? 1 : 0);

  const totalRecommendations = useMemo(
    () =>
      projectDetails.reduce(
        (sum, d) => sum + (d.recommendations?.filter((r) => !r.dismissed).length ?? 0),
        0
      ),
    [projectDetails]
  );

  const projectsWithRecommendations = useMemo(() => {
    return projectDetails.filter(
      (d) => (d.recommendations?.filter((r) => !r.dismissed).length ?? 0) > 0
    );
  }, [projectDetails]);

  useEffect(() => {
    setPageLayout({
      title: 'Overview',
      subtitle: 'Onboarding operations at a glance',
      action: (
        <div className="flex items-center gap-2">
          <Link to="/simulator" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
            <FlaskConical className="size-4" />
            Run simulation
          </Link>
        </div>
      ),
    });
  }, [setPageLayout]);

  const isLoadingDetails = detailQueries.some((q) => q.isPending);
  if (loadingProjects || loadingCustomers) return <PageLoading />;

  return (
    <PageContainer className="page-container--compact flex flex-col section-gap gap-6">
      <PageHeader
        title="Onboarding operations"
        subtitle="Active projects, at-risk accounts, and quick access to the simulator."
        action={
          <div className="flex items-center gap-2">
            <Link to="/simulator" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
              <FlaskConical className="size-4" />
              Run simulation
            </Link>
          </div>
        }
      />

      {errorProjects && (
        <ErrorAlert
          message="Could not load projects. Is the backend running?"
          onRetry={() => refetchProjects()}
        />
      )}

      <section aria-labelledby="kpi-heading" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <h2 id="kpi-heading" className="sr-only">
          North star metrics
        </h2>
        <KpiCard
          label="Projects"
          value={`${completedProjects}/${totalProjects}`}
          icon={<FolderKanban className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="Tasks"
          value={`${completedTasks}/${totalTasks}`}
          icon={<LayoutGrid className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="At risk"
          value={atRiskProjects}
          icon={<AlertTriangle className="size-5 text-destructive" />}
          iconClassName="bg-destructive/10"
        />
        <KpiCard
          label="Recommendations"
          value={totalRecommendations}
          icon={<Lightbulb className="size-5 text-muted-foreground" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActionPanel
            title="Next best actions"
            description="Tasks and items that need attention"
            action={
              <Tabs value={tasksFilter} onValueChange={(v) => setTasksFilter(v as 'all' | 'mine')}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mine">Mine</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            {needsAttention > 0 && (
              <p className="mb-3 text-xs font-medium text-destructive">
                {todoBuckets.overdue.length} overdue · {atRiskProjects} at-risk project{atRiskProjects !== 1 ? 's' : ''}
              </p>
            )}
            {isLoadingDetails ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading tasks…</p>
            ) : filteredTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tasks.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedTasksForActions.slice(0, 8).map((task) => (
                    <TableRow key={`${task.project_id}-${task.id}`}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{STAGE_LABELS[task.stage]}</TableCell>
                      <TableCell>
                        <Link to={`/projects/${task.project_id}`} className="text-primary hover:underline">
                          {task.projectName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString('en-US')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ActionPanel>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Projects</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Progress and go-live</p>
            </CardHeader>
            <CardContent className="p-0">
              {!projects?.length ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No projects. <Link to="/projects" className="text-primary hover:underline">Create one</Link>.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>End date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(projects ?? []).map((project: Project) => {
                      const customer = customers?.find((c) => c.id === project.customer_id);
                      const name = project.name ?? customer?.company_name ?? `Project #${project.id}`;
                      const prog = projectProgress[project.id];
                      const pct = prog && prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
                      const endDate = project.target_go_live_date ?? project.projected_go_live_date;
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">
                            <Link to={`/projects/${project.id}`} className="text-primary hover:underline">
                              {name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex w-24 items-center gap-2">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-xs tabular-nums">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {endDate ? new Date(endDate).toLocaleDateString('en-US') : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ActionPanel
            title="Simulation"
            description="Test timeline risk and see AI insights"
            icon={<FlaskConical className="size-4" />}
          >
            <p className="text-sm text-muted-foreground">
              Run a simulation on any project to see how delays and assumptions affect go-live, virtual inboxes, and risk.
            </p>
            <Link to="/simulator" className={cn(buttonVariants({ size: 'sm' }), 'mt-3 flex w-full gap-1.5')}>
              Open simulator
              <ArrowRight className="size-3.5" />
            </Link>
          </ActionPanel>

          <ActionPanel title="Recent activity" description="Across projects">
            <EventFeed events={aggregatedEvents} maxItems={5} />
          </ActionPanel>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="size-4 text-muted-foreground" />
                Projects with recommendations
                {totalRecommendations > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({totalRecommendations})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectsWithRecommendations.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">No open recommendations.</p>
              ) : (
                projectsWithRecommendations.map((detail) => {
                  const project = projects?.find((p) => p.id === detail.id);
                  const customer = customers?.find((c) => c.id === detail.customer_id);
                  const name = project?.name ?? customer?.company_name ?? `Project #${detail.id}`;
                  return (
                    <Link
                      key={detail.id}
                      to={`/projects/${detail.id}`}
                      className="flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted hover:text-foreground"
                    >
                      <span className="truncate">{name}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/customers"
                className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted hover:text-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="size-4 text-muted-foreground" />
                  Customers
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/projects"
                className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted hover:text-foreground"
              >
                <span className="flex items-center gap-2.5">
                  <FolderKanban className="size-4 text-muted-foreground" />
                  Projects
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              {atRiskProjects > 0 && (
                <Link
                  to="/projects"
                  className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  {atRiskProjects} at risk — View projects
                  <ArrowRight className="size-3.5 ml-auto" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}


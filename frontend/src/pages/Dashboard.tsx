import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowRight,
  LayoutGrid,
  Activity,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EventFeed } from '@/components/ui/EventFeed';
import { STAGE_LABELS, type Project, type Task, type OnboardingEvent, type ProjectDetail } from '../types';

const DASHBOARD_PROJECT_LIMIT = 10;
const KPI_ICON_CLASS = 'size-5 text-muted-foreground';

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
  const totalEvents = aggregatedEvents.length;

  const isLoadingDetails = detailQueries.some((q) => q.isPending);
  if (loadingProjects || loadingCustomers) return <PageLoading />;

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        Onboarding at a glance: active projects, at-risk accounts, and quick access to customers and projects.
      </p>

      {errorProjects && (
        <ErrorAlert
          message="Could not load projects. Is the backend running?"
          onRetry={() => refetchProjects()}
        />
      )}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Onboarding overview
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <Card>
            <CardContent className="flex flex-row items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2.5">
                <FolderKanban className={KPI_ICON_CLASS} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Projects</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                  {completedProjects}/{totalProjects}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2.5">
                <LayoutGrid className={KPI_ICON_CLASS} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                  {completedTasks}/{totalTasks}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2.5">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">{atRiskProjects}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2.5">
                <CheckCircle2 className={KPI_ICON_CLASS} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">{completedProjects}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2.5">
                <Activity className={KPI_ICON_CLASS} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Activities</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totalEvents}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6" aria-labelledby="tasks-heading">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <CardTitle id="tasks-heading" className="text-base">
                Tasks: {filteredTasks.length}
              </CardTitle>
              <Tabs value={tasksFilter} onValueChange={(v) => setTasksFilter(v as 'all' | 'mine')}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mine">Mine</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingDetails ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading tasks…</div>
              ) : filteredTasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No tasks.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Module / Stage</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={`${task.project_id}-${task.id}`}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{STAGE_LABELS[task.stage]}</TableCell>
                        <TableCell>
                          <Link to={`/projects/${task.project_id}`} className="text-primary hover:underline">
                            {task.projectName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {task.status === 'completed' ? '100%' : '0%'}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Projects: {projects?.length ?? 0}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Progress, end date, owner</p>
            </CardHeader>
            <CardContent className="p-0">
              {!projects?.length ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No projects. <Link to="/projects" className="text-primary hover:underline">Create one</Link>.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>End date</TableHead>
                      <TableHead>Owner</TableHead>
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
                            <div className="flex items-center gap-2 w-24">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-xs tabular-nums">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {endDate ? new Date(endDate).toLocaleDateString('en-US') : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-labelledby="todos-heading">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle id="todos-heading" className="text-base">
                My To-dos
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Today, Overdue, Future, All</p>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="today">
                    Today ({todoBuckets.today.length})
                  </TabsTrigger>
                  <TabsTrigger value="overdue">
                    Overdue ({todoBuckets.overdue.length})
                  </TabsTrigger>
                  <TabsTrigger value="future">
                    Future ({todoBuckets.future.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All ({todoBuckets.all.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="today" className="mt-3">
                  <TodoList tasks={todoBuckets.today} />
                </TabsContent>
                <TabsContent value="overdue" className="mt-3">
                  <TodoList tasks={todoBuckets.overdue} />
                </TabsContent>
                <TabsContent value="future" className="mt-3">
                  <TodoList tasks={todoBuckets.future} />
                </TabsContent>
                <TabsContent value="all" className="mt-3">
                  <TodoList tasks={todoBuckets.all} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">What changed across projects</p>
            </CardHeader>
            <CardContent className="pt-4">
              <EventFeed events={aggregatedEvents} maxItems={5} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers → projects → tasks & risk
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Link
                to="/customers"
                className="flex w-full items-center justify-between rounded-lg border border-input bg-background py-3 px-4 text-sm font-medium hover:bg-muted hover:text-foreground gap-2.5"
              >
                <Users className="size-4 text-muted-foreground" />
                <span>Customers</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/projects"
                className="flex w-full items-center justify-between rounded-lg border border-input bg-background py-3 px-4 text-sm font-medium hover:bg-muted hover:text-foreground gap-2.5"
              >
                <FolderKanban className="size-4 text-muted-foreground" />
                <span>Onboarding Projects</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              {atRiskProjects > 0 && (
                <Card className="mt-3 border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive shrink-0" />
                      <p className="text-sm font-medium text-destructive">
                        {atRiskProjects} project{atRiskProjects > 1 ? 's' : ''} at risk
                      </p>
                    </div>
                    <Link to="/ops-inbox" className="mt-1 text-sm font-medium text-destructive underline-offset-4 hover:underline flex items-center gap-1">
                      Review in Ops Inbox <ArrowRight className="size-3" />
                    </Link>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function TodoList({ tasks }: { tasks: TaskWithProject[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">None</p>;
  }
  return (
    <ul className="space-y-2">
      {tasks.slice(0, 10).map((t) => (
        <li key={`${t.project_id}-${t.id}`} className="text-sm">
          <Link to={`/projects/${t.project_id}`} className="text-primary hover:underline">
            {t.title}
          </Link>
          <span className="text-muted-foreground ml-1">· {t.projectName}</span>
        </li>
      ))}
      {tasks.length > 10 && (
        <li className="text-xs text-muted-foreground">+{tasks.length - 10} more</li>
      )}
    </ul>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Calendar,
  Star,
  ShieldAlert,
  FileText,
  Building2,
  Activity,
  Target,
  Lightbulb,
  ArrowRightCircle,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { aiApi } from '../api/ai';
import { tasksApi } from '../api/tasks';
import { customersApi } from '../api/customers';
import {
  ProjectStatusBadge,
  TaskStatusBadge,
  StageBadge,
  CustomerTypeBadge,
  Badge,
} from '../components/ui/StatusBadge';
import { StageProgress } from '../components/ui/StageProgress';
import { EventFeed } from '../components/ui/EventFeed';
import { PageLoading, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
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
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task } from '../types';

function TaskRow({
  task,
  onComplete,
  isCompleting,
}: {
  task: Task;
  onComplete: (id: number) => void;
  isCompleting: boolean;
}) {
  const isActionable = task.status !== 'completed' && task.status !== 'blocked';

  return (
    <TableRow className={cn(task.status === 'overdue' && 'bg-destructive/5')}>
      <TableCell className="px-5 py-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm font-medium', task.status === 'completed' && 'text-muted-foreground line-through')}>
              {task.title}
            </span>
            {task.required_for_stage_completion && (
              <span title="Required for stage completion">
                <Star className="h-3 w-3 text-amber-500 fill-amber-400" aria-label="Required" />
              </span>
            )}
            {task.is_customer_required && (
              <Badge label="Customer" variant="purple" />
            )}
            {task.requires_setup_data && (
              <Badge label="Needs Setup Data" variant="slate" />
            )}
          </div>
          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <TaskStatusBadge status={task.status} />
      </TableCell>
      <TableCell className="px-5 py-3.5">
        {task.due_date ? (
          <div className={cn('flex items-center gap-1 text-xs', task.status === 'overdue' && 'text-destructive font-medium')}>
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5 text-right">
        {isActionable && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onComplete(task.id)}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Mark Complete
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const { setPageLayout } = usePageLayout();

  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customer = customers?.find((c) => c.id === project?.customer_id);

  const projectsForCompany = project
    ? (projects ?? []).filter((p) => p.customer_id === project.customer_id).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  function handleCompanyChange(customerId: number) {
    const thatCompanyProjects = (projects ?? [])
      .filter((p) => p.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const targetId = thatCompanyProjects[0]?.id;
    if (targetId != null) navigate(`/projects/${targetId}`);
  }

  function handleProjectChange(projectId: number) {
    navigate(`/projects/${projectId}`);
  }

  function showMsg(text: string, type: 'success' | 'info' = 'success') {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 5000);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  const completeTaskMutation = useMutation({
    mutationFn: tasksApi.complete,
    onMutate: (taskId) => setCompletingTaskId(taskId),
    onSuccess: (data) => {
      invalidate();
      setCompletingTaskId(null);
      if (data.project_completed) {
        showMsg('Project completed!');
      } else if (data.stage_advanced) {
        showMsg(`Stage advanced to ${data.new_stage?.replace('_', '-') ?? ''}.`);
      } else {
        showMsg(data.message);
      }
    },
    onError: () => setCompletingTaskId(null),
  });

  const checkOverdueMutation = useMutation({
    mutationFn: () => projectsApi.checkOverdue(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message, 'info');
    },
  });

  const checkRiskMutation = useMutation({
    mutationFn: () => projectsApi.checkRisk(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message, data.risk_flag ? 'info' : 'success');
    },
  });

  const recalculateRiskMutation = useMutation({
    mutationFn: () => projectsApi.recalculateRisk(projectId),
    onSuccess: () => invalidate(),
  });

  const advanceStageMutation = useMutation({
    mutationFn: () => projectsApi.advanceStage(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message);
    },
  });

  const { data: risk } = useQuery({
    queryKey: ['project-risk', projectId],
    queryFn: () => projectsApi.getRisk(projectId),
    enabled: !!project && !isNaN(projectId),
  });

  const riskSummaryMutation = useMutation({
    mutationFn: () => aiApi.getRiskSummary(projectId),
  });

  const projectName = project?.name ?? customer?.company_name ?? `Project #${projectId}`;

  useEffect(() => {
    if (!isNaN(projectId) && projectId > 0) riskSummaryMutation.mutate();
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    setPageLayout({
      title: projectName,
      action: (
        <Link to="/simulator" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
          <FlaskConical className="size-4" />
          Simulator
        </Link>
      ),
    });
    // Depend on id/name only so we don't re-run when project object reference changes
  }, [setPageLayout, projectName, project?.id]);

  if (isPending) return <PageLoading />;

  if (isError || !project) {
    return (
      <div className="p-6">
        <ErrorAlert message="Could not load project." onRetry={() => refetch()} />
      </div>
    );
  }

  const tasks = project.tasks ?? [];
  const events = project.events ?? [];
  const riskSignals = project.risk_signals ?? [];
  const recommendations = project.recommendations ?? [];
  const blockedTasks = tasks.filter((t) => t.blocker_flag);

  const tasksByStage = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.stage]) acc[task.stage] = [];
    acc[task.stage].push(task);
    return acc;
  }, {});

  const completedTaskCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueTaskCount = tasks.filter((t) => t.status === 'overdue').length;

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="project-detail-company" className="text-sm font-medium">
            Company
          </Label>
          <select
            id="project-detail-company"
            value={project.customer_id}
            onChange={(e) => handleCompanyChange(Number(e.target.value))}
            aria-label="Switch company"
            className="flex h-8 w-48 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="project-detail-project" className="text-sm font-medium">
            Project
          </Label>
          <select
            id="project-detail-project"
            value={project.id}
            onChange={(e) => handleProjectChange(Number(e.target.value))}
            aria-label="Switch project"
            disabled={projectsForCompany.length === 0}
            className="flex h-8 w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {projectsForCompany.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? `${customerMap.get(p.customer_id)?.company_name ?? `Customer #${p.customer_id}`} — #${p.id}`}
              </option>
            ))}
          </select>
        </div>
        <Link to="/projects/list" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          All onboarding projects
        </Link>
      </div>

      {actionMsg && (
        <Card className={cn(actionMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50/50' : 'border-primary/30 bg-primary/5')}>
          <CardContent className="py-3">
            <p className={cn('text-sm font-medium', actionMsg.type === 'success' ? 'text-emerald-700' : 'text-primary')} role="status">
              {actionMsg.text}
            </p>
          </CardContent>
        </Card>
      )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left column: summary + tasks */}
          <div className="xl:col-span-2 space-y-6">

            <section aria-labelledby="project-summary">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle id="project-summary" className="text-lg flex items-center gap-2">
                      {project.name ?? customer?.company_name ?? `Project #${project.id}`}
                      {project.risk_flag && (
                        <AlertTriangle className="h-4 w-4 text-destructive" aria-label="At risk" />
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Onboarding Project #{project.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={project.current_stage} />
                    <ProjectStatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StageProgress currentStage={project.current_stage} status={project.status} />
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground border-t border-border pt-4">
                    {customer && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.company_name}</span>
                    <CustomerTypeBadge type={customer.customer_type} />
                  </div>
                    )}
                    {customer?.industry && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.industry}</span>
                      </div>
                    )}
                    {(project.target_go_live_date || project.projected_go_live_date) && (
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Go-live: {project.projected_go_live_date
                        ? new Date(project.projected_go_live_date).toLocaleDateString('en-US')
                        : project.target_go_live_date
                          ? new Date(project.target_go_live_date).toLocaleDateString('en-US')
                          : '—'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created{' '}
                    {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                    </div>
                    {project.notes && (
                      <div className="flex items-start gap-1.5 w-full">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground italic">{project.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {(project.risk_flag || (risk?.explanations?.length ?? 0) > 0) && (
              <Card className="border-destructive/30 bg-destructive/5" aria-labelledby="risk-heading">
                <CardHeader>
                  <CardTitle id="risk-heading" className="text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    Risk {risk?.risk_level && `(${risk.risk_level})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-foreground list-disc list-inside space-y-0.5">
                    {(risk?.explanations ?? riskSignals.map((s) => s.description)).map((text, i) => (
                      <li key={i}>{text}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {blockedTasks.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30" aria-labelledby="blockers-heading">
                <CardHeader>
                  <CardTitle id="blockers-heading" className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Blockers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-foreground space-y-1">
                    {blockedTasks.map((t) => (
                      <li key={t.id}>
                        <span className="font-medium">{t.title}</span>
                        {t.blocker_reason && ` — ${t.blocker_reason}`}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(project.next_best_action || recommendations.length > 0) && (
              <Card aria-labelledby="next-heading">
                <CardHeader>
                  <CardTitle id="next-heading" className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Next best action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.next_best_action && (
                    <p className="text-sm text-foreground">{project.next_best_action}</p>
                  )}
                  {recommendations.length > 0 && (
                    <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                      {recommendations.map((r) => (
                        <li key={r.id}>{r.label ?? r.action_type}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Card aria-labelledby="ai-risk-summary-heading">
              <CardHeader>
                <CardTitle id="ai-risk-summary-heading" className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI risk summary
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Short, actionable summary for ops (generated when you open this page).
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => riskSummaryMutation.mutate()}
                  disabled={riskSummaryMutation.isPending}
                >
                  {riskSummaryMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate AI summary
                </Button>
                {riskSummaryMutation.isError && (
                  <p className="text-sm text-destructive">Could not load AI summary.</p>
                )}
                {riskSummaryMutation.data?.risk_summary && (
                  <p className="text-sm text-foreground border-t border-border pt-3">
                    {riskSummaryMutation.data.risk_summary}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{completedTaskCount}/{tasks.length}</span>
                <span>tasks completed</span>
                {overdueTaskCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {overdueTaskCount} overdue
                  </span>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => checkOverdueMutation.mutate()} disabled={checkOverdueMutation.isPending}>
                {checkOverdueMutation.isPending ? <LoadingSpinner size="sm" /> : <Clock className="h-4 w-4" />}
                Check Overdue
              </Button>
              <Button
                variant={project.risk_flag ? 'destructive' : 'secondary'}
                size="sm"
                onClick={() => checkRiskMutation.mutate()}
                disabled={checkRiskMutation.isPending}
              >
                {checkRiskMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldAlert className="h-4 w-4" />}
                Check Risk
              </Button>
              <Button variant="secondary" size="sm" onClick={() => recalculateRiskMutation.mutate()} disabled={recalculateRiskMutation.isPending}>
                {recalculateRiskMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldAlert className="h-4 w-4" />}
                Recalculate Risk
              </Button>
              {project.status !== 'completed' && (
                <Button size="sm" onClick={() => advanceStageMutation.mutate()} disabled={advanceStageMutation.isPending}>
                  {advanceStageMutation.isPending ? <LoadingSpinner size="sm" /> : <ArrowRightCircle className="h-4 w-4" />}
                  Advance Stage
                </Button>
              )}
            </div>

            <section aria-labelledby="tasks-heading">
              <Card>
                <CardHeader className="border-b pb-4">
                  <CardTitle id="tasks-heading" className="text-sm">
                    Tasks
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-400 inline mr-0.5" />
                    Required for stage gate
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {tasks.length === 0 ? (
                    <div className="p-6">
                      <EmptyState title="No tasks" description="Tasks will be generated when the project is created." />
                    </div>
                  ) : (
                    Object.entries(tasksByStage).map(([stage, stageTasks]) => (
                      <div key={stage}>
                        <div className="px-5 py-2 bg-muted/50 border-b border-border">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {stage.replace('_', ' ')} Stage
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="sr-only">
                              <TableHead>Task</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stageTasks.map((task) => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                onComplete={(taskId) => completeTaskMutation.mutate(taskId)}
                                isCompleting={completingTaskId === task.id}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <aside>
            <Card aria-labelledby="events-heading">
              <CardHeader className="flex flex-row items-center gap-2 border-b pb-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle id="events-heading" className="text-sm">
                  Activity
                </CardTitle>
                {events.length > 0 && (
                  <ShadcnBadge variant="secondary" className="ml-auto font-normal">
                    {events.length}
                  </ShadcnBadge>
                )}
              </CardHeader>
              <CardContent>
                <EventFeed events={events} />
              </CardContent>
            </Card>
          </aside>
        </div>
    </PageContainer>
  );
}

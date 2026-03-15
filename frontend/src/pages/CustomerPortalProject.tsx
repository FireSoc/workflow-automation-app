import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Target } from 'lucide-react';
import { portalApi } from '../api/portal';
import { tasksApi } from '../api/tasks';
import { StageProgress } from '../components/ui/StageProgress';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { TaskStatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { STAGE_ORDER, STAGE_LABELS, type Task } from '../types';
import { cn } from '@/lib/utils';

function getNextTask(tasks: Task[]): Task | null {
  const byStage = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!acc[t.stage]) acc[t.stage] = [];
    acc[t.stage].push(t);
    return acc;
  }, {});
  for (const stage of STAGE_ORDER) {
    const list = byStage[stage] ?? [];
    const next = list.find((t) => t.status !== 'completed');
    if (next) return next;
  }
  return null;
}

export function CustomerPortalProject() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();

  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: () => portalApi.getProject(projectId),
    enabled: !isNaN(projectId),
  });

  const completeMutation = useMutation({
    mutationFn: tasksApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-project', projectId] });
    },
  });

  if (isPending) return <PageLoading />;

  if (isError || !project) {
    return (
      <div className="p-6">
        <ErrorAlert message="Could not load your onboarding." onRetry={() => refetch()} />
      </div>
    );
  }

  const tasks = project.tasks ?? [];
  const tasksByStage = useMemo(
    () =>
      tasks.reduce<Record<string, Task[]>>((acc, task) => {
        const s = task.stage;
        if (!acc[s]) acc[s] = [];
        acc[s].push(task);
        return acc;
      }, {}),
    [tasks]
  );

  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPct = total ? Math.round((completedCount / total) * 100) : 0;
  const nextTask = getNextTask(tasks);
  const allStageValues = STAGE_ORDER.filter((s) => (tasksByStage[s]?.length ?? 0) > 0);
  const expandAll = () => setAccordionValue([...allStageValues]);
  const collapseAll = () => setAccordionValue([]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center pb-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">{project.company_name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Onboarding progress</p>
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-medium text-foreground">Overall Progress {progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Next task hero + CTA */}
      {nextTask ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Next task</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {nextTask.description ?? nextTask.title}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm font-medium text-foreground">{nextTask.title}</p>
            <Button
              onClick={() => completeMutation.mutate(nextTask.id)}
              disabled={completeMutation.isPending}
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      ) : (
        total > 0 && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              All caught up. No pending tasks.
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardContent className="pt-6">
          <StageProgress currentStage={project.current_stage} status={project.status} />
          {(project.target_go_live_date || project.projected_go_live_date) && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {project.target_go_live_date && (
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Target go-live: {new Date(project.target_go_live_date).toLocaleDateString('en-US')}
                </div>
              )}
              {project.projected_go_live_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Projected: {new Date(project.projected_go_live_date).toLocaleDateString('en-US')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {project.next_steps && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Next steps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.next_steps}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm">Your tasks</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Tasks and due dates by stage</p>
          </div>
          {allStageValues.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand all
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse all
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {project.tasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No tasks yet. Your implementation team will add them shortly.
            </div>
          ) : (
            <Accordion
              value={accordionValue}
              onValueChange={(v) => setAccordionValue(Array.isArray(v) ? v : v ? [v] : [])}
              multiple
              className="w-full"
            >
              {STAGE_ORDER.map((stage) => {
                const stageTasks = tasksByStage[stage] ?? [];
                if (stageTasks.length === 0) return null;
                return (
                  <AccordionItem key={stage} value={stage} className="border-b border-border px-5">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {STAGE_LABELS[stage]} ({stageTasks.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <ul className="space-y-2">
                        {stageTasks.map((task) => (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-4 text-sm"
                          >
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  task.status === 'completed' && 'text-muted-foreground line-through'
                                )}
                              >
                                {task.title}
                              </span>
                              {task.due_date && (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  Due {new Date(task.due_date).toLocaleDateString('en-US')}
                                </span>
                              )}
                            </div>
                            <TaskStatusBadge status={task.status} />
                            {task.status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Target } from 'lucide-react';
import { portalApi } from '../api/portal';
import { StageProgress } from '../components/ui/StageProgress';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Topbar } from '../components/layout/Topbar';
import { TaskStatusBadge } from '../components/ui/StatusBadge';

export function CustomerPortalProject() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: () => portalApi.getProject(projectId),
    enabled: !isNaN(projectId),
  });

  if (isPending) return <PageLoading />;

  if (isError || !project) {
    return (
      <div>
        <Topbar />
        <div className="px-6 py-6">
          <ErrorAlert message="Could not load your onboarding." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const tasksByStage = (project.tasks ?? []).reduce<Record<string, typeof project.tasks>>(
    (acc, task) => {
      const s = task.stage;
      if (!acc[s]) acc[s] = [];
      acc[s].push(task);
      return acc;
    },
    {}
  );

  return (
    <div>
      <Topbar />

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center pb-4 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-800">{project.company_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Onboarding progress</p>
        </div>

        <section className="card p-5">
          <StageProgress currentStage={project.current_stage} status={project.status} />
          {(project.target_go_live_date || project.projected_go_live_date) && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
              {project.target_go_live_date && (
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-slate-400" />
                  Target go-live: {new Date(project.target_go_live_date).toLocaleDateString('en-US')}
                </div>
              )}
              {project.projected_go_live_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Projected: {new Date(project.projected_go_live_date).toLocaleDateString('en-US')}
                </div>
              )}
            </div>
          )}
        </section>

        {project.next_steps && (
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Next steps</h2>
            <p className="text-sm text-slate-600">{project.next_steps}</p>
          </section>
        )}

        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Your tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tasks and due dates by stage</p>
          </div>
          {project.tasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No tasks yet. Your implementation team will add them shortly.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(tasksByStage).map(([stage, tasks]) => (
                <div key={stage}>
                  <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stage.replace('_', ' ')}
                    </span>
                  </div>
                  <ul className="px-5 py-3 space-y-2">
                    {(tasks ?? []).map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0">
                          <span
                            className={
                              task.status === 'completed'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-800'
                            }
                          >
                            {task.title}
                          </span>
                          {task.due_date && (
                            <span className="ml-2 text-slate-500 text-xs">
                              Due {new Date(task.due_date).toLocaleDateString('en-US')}
                            </span>
                          )}
                        </div>
                        <TaskStatusBadge status={task.status} />
                        {task.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

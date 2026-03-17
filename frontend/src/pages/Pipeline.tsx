import { useLayoutEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { STAGE_ORDER, STAGE_LABELS, type Project, type OnboardingStage } from '../types';

export function Pipeline() {
  const { setPageLayout } = usePageLayout();

  const { data: projects = [], isPending, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const byStage = useMemo(() => {
    const map = new Map<OnboardingStage, Project[]>();
    for (const stage of STAGE_ORDER) {
      map.set(stage, []);
    }
    for (const p of projects) {
      const list = map.get(p.current_stage);
      if (list) list.push(p);
      else map.set(p.current_stage, [p]);
    }
    return map;
  }, [projects]);

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Pipeline',
      subtitle: 'Projects by onboarding stage',
    });
  }, [setPageLayout]);

  if (isPending) return <PageLoading />;

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline"
        subtitle="Projects by onboarding stage. Drag context only; use project links to update."
      />

      {isError && (
        <ErrorAlert
          message="Could not load projects."
          onRetry={() => refetch()}
        />
      )}

      <div className="flex gap-4 overflow-x-auto pb-2 min-h-0">
        {STAGE_ORDER.map((stage, colIndex) => {
          const stageProjects = byStage.get(stage) ?? [];
          return (
            <div
              key={stage}
              className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card animate-in fade-in-0 duration-200"
              style={{ animationDelay: `${colIndex * 50}ms` }}
            >
              <div className="border-b border-border px-3 py-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {STAGE_LABELS[stage]}
                </h3>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stageProjects.length} project{stageProjects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[8rem]">
                {stageProjects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                    No projects in this stage.
                    <br />
                    <Link
                      to="/projects"
                      className="mt-1 inline-block text-primary hover:underline"
                    >
                      Add project
                    </Link>
                    {' · '}
                    <Link
                      to="/deals/import"
                      className="text-primary hover:underline"
                    >
                      Import deal
                    </Link>
                  </div>
                ) : (
                  stageProjects.map((project, index) => {
                    const customer = customerMap.get(project.customer_id);
                    const name =
                      project.name ??
                      customer?.company_name ??
                      `Project #${project.id}`;
                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="block rounded-lg border border-border bg-background p-2.5 text-sm transition-shadow duration-200 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <p className="font-medium text-foreground truncate">
                          {name}
                        </p>
                        {customer && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {customer.company_name}
                          </p>
                        )}
                        <div className="mt-2">
                          <RiskScoreBadge
                            score={project.risk_score ?? null}
                            level={project.risk_level ?? undefined}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}

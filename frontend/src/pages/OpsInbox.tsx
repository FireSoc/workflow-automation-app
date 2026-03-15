import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileWarning,
  ExternalLink,
  XCircle,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '@/components/ui/StatusBadge';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { opsInboxApi } from '../api/opsInbox';
import { cn } from '@/lib/utils';
import type { OpsInboxItemFromApi, OpsInboxItemType } from '../types';

function itemTypeLabel(t: OpsInboxItemType): string {
  switch (t) {
    case 'blocked_task':
      return 'Blocked';
    case 'overdue_task':
      return 'Overdue';
    case 'recommendation':
      return 'Recommendation';
    case 'project_alert':
      return 'At risk';
    default:
      return t;
  }
}

const KPI_ICON_CLASS = 'size-5 text-muted-foreground';

export function OpsInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const typeFilter = searchParams.get('type') ?? '';
  const stageFilter = searchParams.get('stage') ?? '';
  const customerIdParam = searchParams.get('customer');
  const customerIdFilter = customerIdParam ? parseInt(customerIdParam, 10) : null;

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [
      'ops-inbox',
      typeFilter || null,
      stageFilter || null,
      customerIdFilter ?? null,
    ],
    queryFn: () =>
      opsInboxApi.getInbox({
        type: (typeFilter as OpsInboxItemType) || undefined,
        stage: stageFilter || undefined,
        customer_id: customerIdFilter ?? undefined,
        limit: 500,
      }),
  });

  const dismissRecMutation = useMutation({
    mutationFn: ({ projectId, recommendationId }: { projectId: number; recommendationId: number }) =>
      projectsApi.dismissRecommendation(projectId, recommendationId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['ops-inbox'] });
    },
  });

  const totals = data?.totals ?? {
    blocked: 0,
    overdue: 0,
    recommendations: 0,
    at_risk_project_alerts: 0,
    at_risk_projects: 0,
    needs_attention_now: 0,
  };
  const filteredItems: OpsInboxItemFromApi[] = data?.items ?? [];

  const stages: Array<{ value: string; label: string }> = [
    { value: 'kickoff', label: 'Kickoff' },
    { value: 'setup', label: 'Setup' },
    { value: 'integration', label: 'Integration' },
    { value: 'training', label: 'Training' },
    { value: 'go_live', label: 'Go-Live' },
  ];

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  const selectClass = cn(
    'flex h-8 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ops Inbox</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Action queue: blocked tasks, overdue work, recommendations, and at-risk projects. Triage and open projects to act.
        </p>
      </div>

      {isError && (
        <ErrorAlert
          message="Could not load ops inbox. Is the backend running?"
          onRetry={() => refetch()}
        />
      )}

      {!isError && isPending && <PageLoading />}

      {!isError && !isPending && (
        <>
          <section aria-labelledby="inbox-stats-heading">
            <h2 id="inbox-stats-heading" className="sr-only">Inbox summary</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Card>
                <CardContent className="flex flex-row items-start gap-4 pt-6">
                  <div className="rounded-lg bg-muted p-2.5">
                    <AlertTriangle className="size-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Needs attention now</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totals.needs_attention_now}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-row items-start gap-4 pt-6">
                  <div className="rounded-lg bg-muted p-2.5">
                    <AlertCircle className={KPI_ICON_CLASS} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Blocked</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totals.blocked}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-row items-start gap-4 pt-6">
                  <div className="rounded-lg bg-muted p-2.5">
                    <Clock className={KPI_ICON_CLASS} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totals.overdue}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-row items-start gap-4 pt-6">
                  <div className="rounded-lg bg-muted p-2.5">
                    <FileWarning className={KPI_ICON_CLASS} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Recommendations</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totals.recommendations}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-row items-start gap-4 pt-6">
                  <div className="rounded-lg bg-muted p-2.5">
                    <AlertTriangle className="size-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">At-risk projects</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">{totals.at_risk_projects}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section aria-labelledby="inbox-filters-heading">
            <h2 id="inbox-filters-heading" className="sr-only">Filters</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Filter
              </span>
              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(e) => setFilter('type', e.target.value)}
                className={selectClass}
              >
                <option value="">All types</option>
                <option value="blocked_task">Blocked</option>
                <option value="overdue_task">Overdue</option>
                <option value="recommendation">Recommendation</option>
                <option value="project_alert">At risk</option>
              </select>
              <select
                aria-label="Filter by stage"
                value={stageFilter}
                onChange={(e) => setFilter('stage', e.target.value)}
                className={selectClass}
              >
                <option value="">All stages</option>
                {stages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by customer"
                value={customerIdFilter ?? ''}
                onChange={(e) => setFilter('customer', e.target.value)}
                className={selectClass}
              >
                <option value="">All customers</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <Card aria-labelledby="inbox-queue-heading">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <CardTitle id="inbox-queue-heading" className="text-base">
                Queue ({filteredItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title={
                      typeFilter || stageFilter || (customerIdFilter != null && !isNaN(customerIdFilter))
                        ? 'No items match filters'
                        : 'No items need attention'
                    }
                    description={
                      typeFilter || stageFilter || (customerIdFilter != null && !isNaN(customerIdFilter))
                        ? 'Try changing or clearing filters to see more items.'
                        : 'All onboarding projects are on track. Check back later or run risk checks on projects.'
                    }
                    icon={<CheckCircle2 className="h-12 w-12 text-muted-foreground" />}
                    action={
                      <Link to="/projects" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        View projects
                      </Link>
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5 py-3">Type</TableHead>
                      <TableHead className="px-5 py-3">Customer</TableHead>
                      <TableHead className="px-5 py-3">Project / Stage</TableHead>
                      <TableHead className="px-5 py-3">Risk</TableHead>
                      <TableHead className="px-5 py-3">Context</TableHead>
                      <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const projectName =
                        item.project.name ?? item.customer?.company_name ?? `Project #${item.project.id}`;
                      let context = '';
                      if (item.task) {
                        if (item.task.status === 'overdue' && item.task.due_date) {
                          context = `Due ${new Date(item.task.due_date).toLocaleDateString()}`;
                        }
                        if (item.task.blocker_flag && item.task.blocker_reason) {
                          context = context
                            ? `${context} · ${item.task.blocker_reason}`
                            : item.task.blocker_reason;
                        }
                      }
                      if (item.recommendation?.label) context = item.recommendation.label;
                      if (item.item_type === 'project_alert')
                        context = 'Project at risk — review tasks and blockers';

                      return (
                        <TableRow
                          key={`${item.item_type}-${item.project.id}-${item.task?.id ?? item.recommendation?.id ?? 'alert'}`}
                        >
                          <TableCell className="px-5 py-3">
                            <span className="font-medium text-foreground">
                              {itemTypeLabel(item.item_type)}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            {item.customer ? (
                              <span className="text-foreground">{item.customer.company_name}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {item.customer && (
                              <div className="mt-0.5">
                                <CustomerTypeBadge type={item.customer.customer_type} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <p className="font-medium text-foreground">{projectName}</p>
                            <div className="mt-0.5">
                              <StageBadge stage={item.project.current_stage} />
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <ProjectStatusBadge status={item.project.status} />
                            {item.project.risk_flag && (
                              <AlertTriangle
                                className="inline-block ml-1 h-3.5 w-3.5 text-destructive"
                                aria-label="At risk"
                              />
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-muted-foreground max-w-xs truncate" title={context}>
                            {context || '—'}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/projects/${item.project.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                                Open project <ExternalLink className="h-3 w-3" />
                              </Link>
                              {item.item_type === 'recommendation' && item.recommendation && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    dismissRecMutation.mutate({
                                      projectId: item.project.id,
                                      recommendationId: item.recommendation!.id,
                                    })
                                  }
                                  disabled={dismissRecMutation.isPending}
                                  className="text-muted-foreground"
                                  title="Dismiss recommendation"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Dismiss
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

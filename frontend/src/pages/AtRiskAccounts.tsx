import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '../components/ui/StatusBadge';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Topbar } from '../components/layout/Topbar';

export function AtRiskAccounts() {
  const { data: projects, isPending, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const atRisk = (projects ?? []).filter(
    (p) => p.status === 'at_risk' || p.risk_flag
  );
  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  if (isPending) return <PageLoading />;

  return (
    <div>
      <Topbar />

      <div className="px-6 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">At-Risk Accounts</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Onboarding projects that need attention: overdue tasks, blockers, or inactivity.
          </p>
        </div>

        {isError && (
          <ErrorAlert
            message="Could not load projects."
            onRetry={() => refetch()}
          />
        )}

        {!isError && atRisk.length === 0 && (
          <EmptyState
            title="No at-risk accounts"
            description="All onboarding projects are on track."
            icon={<AlertTriangle className="h-12 w-12 text-slate-300" />}
          />
        )}

        {!isError && atRisk.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                {atRisk.length} account{atRisk.length !== 1 ? 's' : ''} at risk
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Risk
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atRisk.map((project) => {
                  const customer = customerMap.get(project.customer_id);
                  return (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-800">
                            {customer?.company_name ?? `Customer #${project.customer_id}`}
                          </p>
                          {customer && (
                            <CustomerTypeBadge type={customer.customer_type} />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StageBadge stage={project.current_stage} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {project.risk_level ?? 'At risk'}
                        </div>
                        {project.health_summary && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                            {project.health_summary}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/projects/${project.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

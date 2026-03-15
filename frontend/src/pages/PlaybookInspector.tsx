import { useQuery } from '@tanstack/react-query';
import { BookOpen, Package } from 'lucide-react';
import { playbooksApi } from '../api/playbooks';
import { CustomerTypeBadge } from '../components/ui/StatusBadge';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Topbar } from '../components/layout/Topbar';
import type { OnboardingPlaybook } from '../types';

function PlaybookCard({ playbook }: { playbook: OnboardingPlaybook }) {
  const tasks = (playbook.default_tasks ?? []) as { stage?: string; title?: string }[];
  const byStage = tasks.reduce<Record<string, string[]>>((acc, t) => {
    const s = t.stage ?? 'other';
    if (!acc[s]) acc[s] = [];
    acc[s].push(t.title ?? '—');
    return acc;
  }, {});

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{playbook.name}</h3>
        <CustomerTypeBadge type={playbook.segment} />
      </div>
      {playbook.supported_products?.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Package className="h-3.5 w-3.5" />
          {playbook.supported_products.join(', ')}
        </div>
      )}
      <div className="text-xs text-slate-600 space-y-1">
        {Object.entries(byStage).map(([stage, titles]) => (
          <div key={stage}>
            <span className="font-medium text-slate-500 uppercase">{stage}</span>
            <ul className="list-disc list-inside ml-1 mt-0.5">
              {titles.slice(0, 5).map((title, i) => (
                <li key={i}>{title}</li>
              ))}
              {titles.length > 5 && <li className="text-slate-400">+{titles.length - 5} more</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlaybookInspector() {
  const { data: playbooks, isPending, isError, refetch } = useQuery({
    queryKey: ['playbooks'],
    queryFn: playbooksApi.list,
  });

  if (isPending) return <PageLoading />;

  return (
    <div>
      <Topbar />

      <div className="px-6 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Playbook Inspector</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Onboarding playbooks by segment and their default stages and tasks.
          </p>
        </div>

        {isError && (
          <ErrorAlert message="Could not load playbooks." onRetry={() => refetch()} />
        )}

        {!isError && (!playbooks || playbooks.length === 0) && (
          <EmptyState
            title="No playbooks"
            description="Create playbooks in the backend to drive onboarding project generation."
            icon={<BookOpen className="h-12 w-12 text-slate-300" />}
          />
        )}

        {!isError && playbooks && playbooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playbooks.map((p) => (
              <PlaybookCard key={p.id} playbook={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

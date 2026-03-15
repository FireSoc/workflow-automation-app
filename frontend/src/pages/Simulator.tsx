import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Play, GitCompare, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { simulationsApi } from '../api/simulations';
import { projectsApi } from '../api/projects';
import { SimulationResultPanel } from '../components/ui/SimulationResultPanel';
import { InboxPreview } from '../components/ui/InboxPreview';
import { BranchComparePanel } from '../components/ui/BranchComparePanel';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Topbar } from '../components/layout/Topbar';
import type {
  SimulationAssumptions,
  SimulationResponse,
  SimulationCompareResponse,
} from '../types';
import { ApiError } from '../api/client';

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="px-5 py-5">{children}</div>}
    </section>
  );
}

// ─── Assumption controls ───────────────────────────────────────────────────────

const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  customer_delay_days: 1,
  internal_delay_days: 0.5,
};

function AssumptionControls({
  assumptions,
  onChange,
}: {
  assumptions: SimulationAssumptions;
  onChange: (a: SimulationAssumptions) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
      <div>
        <label htmlFor="cust-delay" className="label">
          Customer delay (days)
        </label>
        <input
          id="cust-delay"
          className="input"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.customer_delay_days ?? 1}
          onChange={(e) =>
            onChange({ ...assumptions, customer_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-slate-500 mt-1">
          Expected slip for customer-required tasks.
        </p>
      </div>
      <div>
        <label htmlFor="int-delay" className="label">
          Internal delay (days)
        </label>
        <input
          id="int-delay"
          className="input"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.internal_delay_days ?? 0.5}
          onChange={(e) =>
            onChange({ ...assumptions, internal_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-slate-500 mt-1">
          Expected slip for internal tasks.
        </p>
      </div>
    </div>
  );
}

function SimError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

type Tab = 'simulate' | 'compare';

// ─── Main page ────────────────────────────────────────────────────────────────

export function Simulator() {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('simulate');
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(DEFAULT_ASSUMPTIONS);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const singleMutation = useMutation({
    mutationFn: (pid: number) =>
      simulationsApi.runFromProject(pid, assumptions),
    onSuccess: (data) => {
      setSingleResult(data);
      setCompareResult(null);
    },
  });

  const compareMutation = useMutation({
    mutationFn: async (pid: number) => {
      const baseline = await simulationsApi.getProjectBaseline(pid);
      return simulationsApi.compare({
        customer_type: baseline.customer_type,
        baseline_tasks: baseline.tasks,
        baseline_assumptions: assumptions,
        branches: [
          {
            name: 'Slow customer (3 day delay)',
            assumptions_override: { customer_delay_days: 3 },
          },
        ],
      });
    },
    onSuccess: (data) => {
      setCompareResult(data);
      setSingleResult(null);
    },
  });

  const [singleResult, setSingleResult] = useState<SimulationResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SimulationCompareResponse | null>(null);

  const isPending = singleMutation.isPending || compareMutation.isPending;
  const errorMsg =
    singleMutation.isError || compareMutation.isError
      ? (singleMutation.error instanceof ApiError
          ? singleMutation.error.message
          : compareMutation.error instanceof ApiError
          ? compareMutation.error.message
          : 'Simulation failed. Make sure the backend is running.')
      : null;

  const selectedProject = projects.find((p) => p.id === projectId);
  const canRun = projectId != null && selectedProject != null;

  return (
    <div>
      <Topbar />

      <div className="px-6 py-6 space-y-5 max-w-7xl">
        <div className="card px-5 py-4 bg-slate-900 text-white">
          <h1 className="text-base font-semibold">Simulator</h1>
          <p className="text-sm text-slate-300 mt-1">
            Pick a real project and run a risk simulation on its workflow. Optionally compare
            against a &quot;slow customer&quot; scenario to see how delays affect risk.
          </p>
        </div>

        <Section
          title="Select project"
          subtitle="Use the workflow from an existing onboarding project."
        >
          {projectsLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <LoadingSpinner size="sm" />
              Loading projects…
            </div>
          ) : (
            <div className="max-w-md">
              <label htmlFor="sim-project" className="label">
                Project
              </label>
              <select
                id="sim-project"
                className="select w-full"
                value={projectId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setProjectId(v === '' ? null : Number(v));
                  setSingleResult(null);
                  setCompareResult(null);
                }}
              >
                <option value="">— Select a project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? `Project #${p.id}`}
                  </option>
                ))}
              </select>
              {selectedProject && (
                <p className="text-xs text-slate-500 mt-1">
                  Simulating this project&apos;s current tasks and stages.
                </p>
              )}
            </div>
          )}
        </Section>

        <Section
          title="Assumptions"
          subtitle="Delay assumptions applied in the simulation."
          defaultOpen={false}
        >
          <AssumptionControls assumptions={assumptions} onChange={setAssumptions} />
        </Section>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {(['simulate', 'compare'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setTab(t)}
              >
                {t === 'simulate' ? 'Simulate' : 'Compare scenarios'}
              </button>
            ))}
          </div>

          {tab === 'simulate' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => projectId != null && singleMutation.mutate(projectId)}
              disabled={isPending || !canRun}
            >
              {singleMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run simulation
            </button>
          )}

          {tab === 'compare' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => projectId != null && compareMutation.mutate(projectId)}
              disabled={isPending || !canRun}
            >
              {compareMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <GitCompare className="h-4 w-4" />
              )}
              Run compare
            </button>
          )}

          {tab === 'compare' && (
            <p className="text-xs text-slate-500 max-w-sm">
              Compares current assumptions vs. &quot;Slow customer&quot; (3 day delay). Shows risk and duration deltas.
            </p>
          )}
        </div>

        {!canRun && (
          <p className="text-xs text-amber-600">Select a project above to run a simulation.</p>
        )}

        {errorMsg && <SimError message={errorMsg} />}

        {tab === 'simulate' && singleResult && (
          <>
            <Section title="Results" defaultOpen>
              <SimulationResultPanel result={singleResult} />
            </Section>
            {singleResult.inbox_preview && (
              <Section title="Virtual inbox preview" defaultOpen>
                <InboxPreview inbox={singleResult.inbox_preview} />
              </Section>
            )}
          </>
        )}

        {tab === 'compare' && compareResult && (
          <>
            <Section title="Comparison" defaultOpen>
              <BranchComparePanel compareResult={compareResult} />
            </Section>
            <Section
              title="Baseline results"
              subtitle="Full simulation for your current assumptions."
              defaultOpen={false}
            >
              <SimulationResultPanel result={compareResult.baseline} />
            </Section>
            {compareResult.baseline.inbox_preview && (
              <Section title="Baseline inbox" defaultOpen={false}>
                <InboxPreview inbox={compareResult.baseline.inbox_preview} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

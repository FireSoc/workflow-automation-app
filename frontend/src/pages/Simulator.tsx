import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Play, GitCompare, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { simulationsApi } from '../api/simulations';
import { projectsApi } from '../api/projects';
import { SimulationResultPanel } from '../components/ui/SimulationResultPanel';
import { InboxPreview } from '../components/ui/InboxPreview';
import { BranchComparePanel } from '../components/ui/BranchComparePanel';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  SimulationAssumptions,
  SimulationResponse,
  SimulationCompareResponse,
} from '../types';
import { ApiError } from '../api/client';

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
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <CardContent className="pt-5">{children}</CardContent>}
    </Card>
  );
}

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="cust-delay">Customer delay (days)</Label>
        <Input
          id="cust-delay"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.customer_delay_days ?? 1}
          onChange={(e) =>
            onChange({ ...assumptions, customer_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-muted-foreground">Expected slip for customer-required tasks.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="int-delay">Internal delay (days)</Label>
        <Input
          id="int-delay"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.internal_delay_days ?? 0.5}
          onChange={(e) =>
            onChange({ ...assumptions, internal_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-muted-foreground">Expected slip for internal tasks.</p>
      </div>
    </div>
  );
}

function SimError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-2 pt-4">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
        <span className="text-sm text-destructive">{message}</span>
      </CardContent>
    </Card>
  );
}

type Tab = 'simulate' | 'compare';

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
    <div className="p-6 space-y-5 max-w-7xl">
      <Card className="bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <CardContent className="pt-6">
          <h1 className="text-base font-semibold">Simulator</h1>
          <p className="text-sm text-white/80 mt-1">
            Pick a real project and run a risk simulation on its workflow. Optionally compare
            against a &quot;slow customer&quot; scenario to see how delays affect risk.
          </p>
        </CardContent>
      </Card>

      <Section
        title="Select project"
        subtitle="Use the workflow from an existing onboarding project."
      >
        {projectsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            Loading projects…
          </div>
        ) : (
          <div className="max-w-md space-y-2">
            <Label htmlFor="sim-project">Project</Label>
            <select
              id="sim-project"
              value={projectId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setProjectId(v === '' ? null : Number(v));
                setSingleResult(null);
                setCompareResult(null);
              }}
              className={cn(
                'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <option value="">— Select a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? `Project #${p.id}`}
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-xs text-muted-foreground">Simulating this project&apos;s current tasks and stages.</p>
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

      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="simulate">Simulate</TabsTrigger>
            <TabsTrigger value="compare">Compare scenarios</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'simulate' && (
          <Button
            onClick={() => projectId != null && singleMutation.mutate(projectId)}
            disabled={isPending || !canRun}
          >
            {singleMutation.isPending ? <LoadingSpinner size="sm" /> : <Play className="h-4 w-4" />}
            Run simulation
          </Button>
        )}

        {tab === 'compare' && (
          <Button
            onClick={() => projectId != null && compareMutation.mutate(projectId)}
            disabled={isPending || !canRun}
          >
            {compareMutation.isPending ? <LoadingSpinner size="sm" /> : <GitCompare className="h-4 w-4" />}
            Run compare
          </Button>
        )}

        {tab === 'compare' && (
          <p className="text-xs text-muted-foreground max-w-sm">
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
  );
}

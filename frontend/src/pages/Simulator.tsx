import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Play, GitCompare, AlertCircle, Sparkles } from 'lucide-react';
import { simulationsApi } from '../api/simulations';
import { projectsApi } from '../api/projects';
import { aiApi } from '../api/ai';
import { SimulationResultPanel } from '../components/ui/SimulationResultPanel';
import { InboxPreview } from '../components/ui/InboxPreview';
import { BranchComparePanel } from '../components/ui/BranchComparePanel';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { cn } from '@/lib/utils';
import type {
  SimulationAssumptions,
  SimulationResponse,
  SimulationCompareResponse,
  SimulationRecommendationsResponse,
} from '../types';
import { ApiError } from '../api/client';

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
        <span className="text-sm text-destructive">{message}</span>
      </CardContent>
    </Card>
  );
}

function AiRecommendationsBlock({
  aiRecommendations,
  aiPending,
  aiError,
  aiQuery,
  setAiQuery,
  onAsk,
}: {
  aiRecommendations: SimulationRecommendationsResponse | null;
  aiPending: boolean;
  aiError: boolean;
  aiQuery: string;
  setAiQuery: (q: string) => void;
  onAsk: () => void;
}) {
  return (
    <div className="space-y-4">
      {aiPending && !aiRecommendations && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          Loading AI recommendations…
        </div>
      )}
      {aiError && (
        <p className="text-sm text-destructive">Could not load recommendations.</p>
      )}
      {aiRecommendations?.recommendations && aiRecommendations.recommendations.length > 0 && (
        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
          {aiRecommendations.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      )}
      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="ai-query" className="text-xs text-muted-foreground">
          Ask a question about this simulation
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="ai-query"
            type="text"
            placeholder="e.g. Which branch is safest?"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAsk}
            disabled={aiPending || !aiQuery.trim()}
          >
            Ask
          </Button>
        </div>
        {aiRecommendations?.answer != null && aiRecommendations?.answer !== '' && (
          <p className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground">
            {aiRecommendations?.answer}
          </p>
        )}
      </div>
    </div>
  );
}

type Tab = 'simulate' | 'compare';

export function Simulator() {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('simulate');
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(DEFAULT_ASSUMPTIONS);
  const { setPageLayout } = usePageLayout();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const [singleResult, setSingleResult] = useState<SimulationResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SimulationCompareResponse | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<SimulationRecommendationsResponse | null>(null);
  const [aiQuery, setAiQuery] = useState('');

  const singleMutation = useMutation({
    mutationFn: (pid: number) =>
      simulationsApi.runFromProject(pid, assumptions),
    onSuccess: (data) => {
      setSingleResult(data);
      setCompareResult(null);
      setAiRecommendations(null);
      aiRecMutation.mutate({ result: data });
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
      setAiRecommendations(null);
      aiRecMutation.mutate({ result: data });
    },
  });

  const aiRecMutation = useMutation({
    mutationFn: (payload: { result: SimulationResponse | SimulationCompareResponse; query?: string }) =>
      aiApi.getSimulationRecommendations(payload),
    onSuccess: (data) => setAiRecommendations(data),
  });

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
  const hasResult = singleResult != null || compareResult != null;

  useEffect(() => {
    setPageLayout({
      title: 'Simulator',
      subtitle: 'Test timeline risk, see downstream impact, and review AI recommendations.',
      action: (
        <Button
          onClick={() => {
            if (tab === 'simulate' && projectId != null) singleMutation.mutate(projectId);
            if (tab === 'compare' && projectId != null) compareMutation.mutate(projectId);
          }}
          disabled={isPending || !canRun}
          className="gap-1.5"
        >
          {isPending ? (
            <LoadingSpinner size="sm" />
          ) : tab === 'compare' ? (
            <GitCompare className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          {tab === 'compare' ? 'Run compare' : 'Run simulation'}
        </Button>
      ),
    });
    // Exclude singleMutation/compareMutation: they change reference every render and cause infinite loop
  }, [setPageLayout, tab, canRun, isPending, projectId]);

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Simulator"
        subtitle="Test timeline risk, see downstream impact, and review AI recommendations."
        action={
          <Button
            onClick={() => {
              if (tab === 'simulate' && projectId != null) singleMutation.mutate(projectId);
              if (tab === 'compare' && projectId != null) compareMutation.mutate(projectId);
            }}
            disabled={isPending || !canRun}
            className="gap-1.5"
          >
            {isPending ? (
              <LoadingSpinner size="sm" />
            ) : tab === 'compare' ? (
              <GitCompare className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {tab === 'compare' ? 'Run compare' : 'Run simulation'}
          </Button>
        }
      />

      {hasResult && selectedProject && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            Project: {selectedProject.name ?? `#${selectedProject.id}`}
          </span>
          <span className="text-muted-foreground">
            {tab === 'simulate' ? 'Single run' : 'Comparison'}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <aside className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Select project" description="Use the workflow from an existing project." />
              {projectsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  Loading projects…
                </div>
              ) : (
                <div className="mt-4 space-y-2">
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
                    <p className="text-xs text-muted-foreground">
                      Simulating this project&apos;s current tasks and stages.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Assumptions" description="Delay assumptions applied in the simulation." />
              <div className="mt-4">
                <AssumptionControls assumptions={assumptions} onChange={setAssumptions} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simulate">Simulate</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>
              </Tabs>
              {tab === 'compare' && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Compares current assumptions vs. &quot;Slow customer&quot; (3 day delay).
                </p>
              )}
              <Button
                className="mt-4 w-full gap-1.5"
                onClick={() => {
                  if (tab === 'simulate' && projectId != null) singleMutation.mutate(projectId);
                  if (tab === 'compare' && projectId != null) compareMutation.mutate(projectId);
                }}
                disabled={isPending || !canRun}
              >
                {isPending ? (
                  <LoadingSpinner size="sm" />
                ) : tab === 'compare' ? (
                  <GitCompare className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {tab === 'compare' ? 'Run compare' : 'Run simulation'}
              </Button>
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 space-y-6">
          {!canRun && (
            <p className="text-xs text-amber-600">Select a project in the left panel to run a simulation.</p>
          )}
          {errorMsg && <SimError message={errorMsg} />}

          {tab === 'simulate' && singleResult && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <SectionHeader title="Results" description="Risk and timeline from the simulation." />
                  <div className="mt-4">
                    <SimulationResultPanel result={singleResult} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <SectionHeader
                    title="AI insights"
                    description="Recommendations and Q&A from the simulation."
                    action={<Sparkles className="size-4 text-primary" />}
                  />
                  <div className="mt-4">
                    <AiRecommendationsBlock
                      aiRecommendations={aiRecommendations}
                      aiPending={aiRecMutation.isPending}
                      aiError={aiRecMutation.isError}
                      aiQuery={aiQuery}
                      setAiQuery={setAiQuery}
                      onAsk={() => {
                        const q = aiQuery.trim();
                        if (q) aiRecMutation.mutate({ result: singleResult, query: q });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {singleResult.inbox_preview && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionHeader title="Virtual inbox preview" description="How work lands in the ops inbox." />
                    <div className="mt-4">
                      <InboxPreview inbox={singleResult.inbox_preview} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {tab === 'compare' && compareResult && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <SectionHeader title="Comparison" description="Baseline vs. slow customer scenario." />
                  <div className="mt-4">
                    <BranchComparePanel compareResult={compareResult} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <SectionHeader
                    title="AI insights"
                    description="Recommendations from the comparison."
                    action={<Sparkles className="size-4 text-primary" />}
                  />
                  <div className="mt-4">
                    <AiRecommendationsBlock
                      aiRecommendations={aiRecommendations}
                      aiPending={aiRecMutation.isPending}
                      aiError={aiRecMutation.isError}
                      aiQuery={aiQuery}
                      setAiQuery={setAiQuery}
                      onAsk={() => {
                        const q = aiQuery.trim();
                        if (q) aiRecMutation.mutate({ result: compareResult, query: q });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <SectionHeader title="Baseline results" description="Full simulation for current assumptions." />
                  <div className="mt-4">
                    <SimulationResultPanel result={compareResult.baseline} />
                  </div>
                </CardContent>
              </Card>

              {compareResult.baseline.inbox_preview && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionHeader title="Baseline inbox" description="Virtual inbox for baseline." />
                    <div className="mt-4">
                      <InboxPreview inbox={compareResult.baseline.inbox_preview} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

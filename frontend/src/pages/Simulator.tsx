import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Play,
  GitCompare,
  AlertCircle,
  Sparkles,
  X,
  ListOrdered,
  RotateCcw,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { simulationsApi } from '../api/simulations';
import { projectsApi } from '../api/projects';
import { aiApi } from '../api/ai';
import { SimulationResultPanel } from '../components/ui/SimulationResultPanel';
import { InboxPreview } from '../components/ui/InboxPreview';
import { BranchComparePanel, BranchEditor } from '../components/ui/BranchComparePanel';
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
import type {
  SimulationAssumptions,
  SimulationResponse,
  SimulationCompareResponse,
  SimulationRecommendationsResponse,
  BranchScenarioRequest,
} from '../types';
import { ApiError } from '../api/client';

const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  customer_delay_days: 1,
  internal_delay_days: 0.5,
};

const DEFAULT_BRANCHES: BranchScenarioRequest[] = [
  { name: 'Slow customer (3 day delay)', assumptions_override: { customer_delay_days: 3 }, task_overrides: [] },
];

// ─── Preset branch definitions ────────────────────────────────────────────────

const BRANCH_PRESETS: { label: string; branch: BranchScenarioRequest }[] = [
  {
    label: 'Slow customer',
    branch: {
      name: 'Slow customer (3 day delay)',
      assumptions_override: { customer_delay_days: 3 },
      task_overrides: [],
    },
  },
  {
    label: 'Fast customer',
    branch: {
      name: 'Fast customer (0.5 day delay)',
      assumptions_override: { customer_delay_days: 0.5 },
      task_overrides: [],
    },
  },
  {
    label: 'Delayed internal',
    branch: {
      name: 'Delayed internal (2 day slip)',
      assumptions_override: { internal_delay_days: 2 },
      task_overrides: [],
    },
  },
];

// ─── Assumption controls ──────────────────────────────────────────────────────

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

// ─── Error card ───────────────────────────────────────────────────────────────

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

// ─── Inline bold markdown renderer ───────────────────────────────────────────

function InlineMd({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function parseRec(text: string): { intro: string; bullets: string[] } {
  const parts = text.split(/ - (?=\*\*)/);
  return { intro: parts[0].replace(/:$/, '').trim(), bullets: parts.slice(1) };
}

// ─── AI recommendations block ─────────────────────────────────────────────────

function AiRecommendationsBlock({
  aiRecommendations,
  aiPending,
  aiError,
  aiQuery,
  setAiQuery,
  onAsk,
  suggestedQuestion,
}: {
  aiRecommendations: SimulationRecommendationsResponse | null;
  aiPending: boolean;
  aiError: boolean;
  aiQuery: string;
  setAiQuery: (q: string) => void;
  onAsk: () => void;
  suggestedQuestion?: string;
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
        <div className="space-y-3">
          {aiRecommendations.recommendations.map((rec, i) => {
            const { intro, bullets } = parseRec(rec);
            if (bullets.length > 0) {
              return (
                <div key={i} className="space-y-2">
                  {intro && (
                    <p className="text-sm text-muted-foreground">
                      <InlineMd text={intro} />
                    </p>
                  )}
                  <ul className="space-y-2">
                    {bullets.map((bullet, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>
                          <InlineMd text={bullet} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <InlineMd text={rec} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="ai-query" className="text-xs text-muted-foreground">
          Ask a question about this simulation
        </Label>

        {/* Part 5: Suggested question chip */}
        {suggestedQuestion && !aiQuery && (
          <button
            type="button"
            onClick={() => setAiQuery(suggestedQuestion)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            {suggestedQuestion}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="ai-query"
            type="text"
            placeholder={suggestedQuestion ?? 'e.g. Which branch is safest?'}
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && aiQuery.trim()) onAsk(); }}
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
            <InlineMd text={aiRecommendations.answer ?? ''} />
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'simulate' | 'compare';

export function Simulator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const didInitFromUrl = useRef(false);

  const [projectId, setProjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('simulate');
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(DEFAULT_ASSUMPTIONS);
  const [branches, setBranches] = useState<BranchScenarioRequest[]>(DEFAULT_BRANCHES);
  const { setPageLayout } = usePageLayout();

  // Part 7: On mount, read URL params into state (only once)
  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const pid = searchParams.get('projectId');
    const t = searchParams.get('tab');
    if (pid && !isNaN(Number(pid))) setProjectId(Number(pid));
    if (t === 'simulate' || t === 'compare') setTab(t as Tab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Part 3: Fetch baseline when Compare tab is active and a project is selected
  const { data: projectBaseline, isLoading: baselineLoading } = useQuery({
    queryKey: ['project-baseline', projectId],
    queryFn: () => simulationsApi.getProjectBaseline(projectId!),
    enabled: tab === 'compare' && projectId != null,
  });

  const [singleResult, setSingleResult] = useState<SimulationResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SimulationCompareResponse | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<SimulationRecommendationsResponse | null>(null);
  const [aiQuery, setAiQuery] = useState('');

  // Part 6: Snapshot of assumptions used in last run
  const [lastRunAssumptions, setLastRunAssumptions] = useState<SimulationAssumptions | null>(null);

  // Part 4: Dismiss state for Compare tip
  const [compareTipDismissed, setCompareTipDismissed] = useState(false);

  const singleMutation = useMutation({
    mutationFn: (pid: number) => simulationsApi.runFromProject(pid, assumptions),
    onSuccess: (data) => {
      setSingleResult(data);
      setCompareResult(null);
      setAiRecommendations(null);
      setAiQuery('');
      setLastRunAssumptions({ ...assumptions });
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
        branches: branches.length > 0 ? branches : DEFAULT_BRANCHES,
      });
    },
    onSuccess: (data) => {
      setCompareResult(data);
      setSingleResult(null);
      setAiRecommendations(null);
      setAiQuery('');
      setLastRunAssumptions({ ...assumptions });
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

  // Part 7: Sync project selection and tab to URL
  function handleProjectChange(newId: number | null) {
    setProjectId(newId);
    setSingleResult(null);
    setCompareResult(null);
    setLastRunAssumptions(null);
    const params = new URLSearchParams(searchParams);
    if (newId != null) params.set('projectId', String(newId));
    else params.delete('projectId');
    setSearchParams(params, { replace: true });
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    if (newTab === 'compare' && branches.length === 0) setBranches(DEFAULT_BRANCHES);
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    setSearchParams(params, { replace: true });
  }

  function runSimulation() {
    if (tab === 'simulate' && projectId != null) singleMutation.mutate(projectId);
    if (tab === 'compare' && projectId != null) compareMutation.mutate(projectId);
  }

  // Part 3: Preset handler — appends a preset branch
  function applyPreset(preset: BranchScenarioRequest) {
    setBranches((prev) => [...prev, { ...preset }]);
  }

  // Part 5: Suggested question depending on context
  const suggestedQuestion = compareResult
    ? 'Which branch is the safest path to go-live?'
    : singleResult
    ? 'What should I do first to reduce risk?'
    : undefined;

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Simulator',
      subtitle: 'Test timeline risk, see downstream impact, and review AI recommendations.',
      action: (
        <Button
          onClick={runSimulation}
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
  }, [setPageLayout, tab, canRun, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Simulator"
        subtitle="Test timeline risk, see downstream impact, and review AI recommendations."
        action={
          <Button onClick={runSimulation} disabled={isPending || !canRun} className="gap-1.5">
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

      {/* Part 6: Assumptions used + project context */}
      {hasResult && selectedProject && lastRunAssumptions && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            Project: {selectedProject.name ?? `#${selectedProject.id}`}
          </span>
          <span className="text-muted-foreground">
            {tab === 'simulate' ? 'Single run' : 'Comparison'}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Assumptions used: customer delay {lastRunAssumptions.customer_delay_days ?? 1} day(s) · internal delay {lastRunAssumptions.internal_delay_days ?? 0.5} day(s)
          </span>
        </div>
      )}

      {/* Compact control bar: project + assumptions + mode + run */}
      <Card className="border-border">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Label htmlFor="sim-project" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Project
              </Label>
              {projectsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Select
                  value={projectId != null ? String(projectId) : ''}
                  onValueChange={(v) => handleProjectChange(v === '' ? null : Number(v))}
                >
                  <SelectTrigger
                    id="sim-project"
                    size="sm"
                    className="min-w-[140px] max-w-[200px] w-full"
                  >
                    <SelectValue placeholder="— Select —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Select —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name ?? `#${p.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Settings2 className="h-3.5 w-3.5" />
                    Assumptions ({assumptions.customer_delay_days ?? 1}d / {(assumptions.internal_delay_days ?? 0.5)}d)
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-72 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Delay assumptions (baseline)</p>
                <AssumptionControls assumptions={assumptions} onChange={setAssumptions} />
              </DropdownMenuContent>
            </DropdownMenu>

            <Tabs value={tab} onValueChange={(v) => handleTabChange(v as Tab)}>
              <TabsList className="h-8 grid grid-cols-2">
                <TabsTrigger value="simulate" className="text-xs">Simulate</TabsTrigger>
                <TabsTrigger value="compare" className="text-xs">Compare</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={runSimulation}
              disabled={isPending || !canRun || (tab === 'compare' && branches.length === 0)}
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
          </div>

          {/* Compare: expandable branches section */}
          {tab === 'compare' && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Branches ({branches.length})</span>
                <div className="flex flex-wrap gap-1.5">
                  {BRANCH_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.branch)}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {baselineLoading && projectId != null ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  Loading baseline…
                </div>
              ) : (
                <BranchEditor
                  branches={branches}
                  baselineTasks={projectBaseline?.tasks ?? []}
                  onChange={setBranches}
                />
              )}
              {branches.length === 0 && (
                <p className="text-xs text-amber-500">Add at least one branch to run a comparison.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div key={tab} className="min-w-0 space-y-6 animate-in fade-in-0 duration-150">
          {/* Part 4: Better empty state */}
          {!canRun && (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-5 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Pick a project to get started
              </p>
              <p className="text-sm text-muted-foreground">
                Select a project from the left panel to simulate its current workflow with different
                delay assumptions. Use <strong className="text-foreground font-medium">Compare</strong> to
                test scenarios side-by-side and find the safest path to go-live.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  to="/projects/list"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  View all projects →
                </Link>
                <Link
                  to="/deals/import"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Create a project from Import deal →
                </Link>
              </div>
            </div>
          )}

          {errorMsg && <SimError message={errorMsg} />}

          {/* Part 4: Post-run tip to try Compare */}
          {tab === 'simulate' && singleResult && !compareTipDismissed && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <ListOrdered className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground flex-1">
                <strong>Tip:</strong> Switch to the{' '}
                <button
                  type="button"
                  onClick={() => handleTabChange('compare')}
                  className="text-primary underline underline-offset-2 hover:no-underline font-medium"
                >
                  Compare tab
                </button>{' '}
                to test different delay scenarios side-by-side and see which is safest.
              </p>
              <button
                type="button"
                onClick={() => setCompareTipDismissed(true)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Part 7: Run again button above results */}
          {hasResult && canRun && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={runSimulation}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? <LoadingSpinner size="sm" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Run again
              </Button>
            </div>
          )}

          {/* Simulate results: use horizontal space */}
          {tab === 'simulate' && singleResult && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="xl:col-span-2">
                <CardContent className="pt-3 px-0">
                  <div className="px-4">
                    <SectionHeader title="Results" description="Risk, timeline, and task breakdown from the simulation." />
                    <div className="mt-4">
                      <SimulationResultPanel result={singleResult} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-3 px-0">
                  <div className="px-4">
                  <SectionHeader
                    title="AI recommendations"
                    description="AI-generated insights and Q&A from the simulation."
                    action={<Sparkles className="size-4 text-primary" />}
                  />
                  <div className="mt-4">
                    <AiRecommendationsBlock
                      aiRecommendations={aiRecommendations}
                      aiPending={aiRecMutation.isPending}
                      aiError={aiRecMutation.isError}
                      aiQuery={aiQuery}
                      setAiQuery={setAiQuery}
                      suggestedQuestion={suggestedQuestion}
                      onAsk={() => {
                        const q = aiQuery.trim();
                        if (q) aiRecMutation.mutate({ result: singleResult, query: q });
                      }}
                    />
                  </div>
                  </div>
                </CardContent>
              </Card>

              {singleResult.inbox_preview ? (
                <Card>
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Virtual inbox preview" description="How work lands in the ops inbox." />
                      <div className="mt-4">
                        <InboxPreview inbox={singleResult.inbox_preview} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="hidden xl:block" aria-hidden />
              )}
            </div>
          )}

          {/* Compare results: horizontal layout */}
          {tab === 'compare' && compareResult && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="xl:col-span-2">
                <CardContent className="pt-3 px-0">
                  <div className="px-4">
                    <SectionHeader title="Scenario comparison" description="Baseline vs. your configured branches." />
                    <div className="mt-4">
                      <BranchComparePanel compareResult={compareResult} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-3 px-0">
                  <div className="px-4">
                    <SectionHeader
                      title="AI recommendations"
                      description="AI-generated insights from the comparison."
                      action={<Sparkles className="size-4 text-primary" />}
                    />
                    <div className="mt-4">
                      <AiRecommendationsBlock
                        aiRecommendations={aiRecommendations}
                        aiPending={aiRecMutation.isPending}
                        aiError={aiRecMutation.isError}
                        aiQuery={aiQuery}
                        setAiQuery={setAiQuery}
                        suggestedQuestion={suggestedQuestion}
                        onAsk={() => {
                          const q = aiQuery.trim();
                          if (q) aiRecMutation.mutate({ result: compareResult, query: q });
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-3 px-0">
                  <div className="px-4">
                    <SectionHeader title="Baseline results" description="Full simulation for the current baseline assumptions." />
                    <div className="mt-4">
                      <SimulationResultPanel result={compareResult.baseline} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {compareResult.baseline.inbox_preview && (
                <Card className="xl:col-span-2">
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Baseline inbox" description="Virtual inbox for the baseline scenario." />
                      <div className="mt-4">
                        <InboxPreview inbox={compareResult.baseline.inbox_preview} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>
    </PageContainer>
  );
}

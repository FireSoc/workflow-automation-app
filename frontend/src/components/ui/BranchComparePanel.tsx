import { useState } from 'react';
import {
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  SimulationCompareResponse,
  ComparisonSummary,
  BranchScenarioRequest,
  SimulationTaskInput,
  SimulationAssumptions,
} from '../../types';

// ─── Delta display helpers ────────────────────────────────────────────────────

function Delta({
  value,
  unit = '',
  lowerIsBetter = true,
}: {
  value: number;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  const improved = lowerIsBetter ? value < 0 : value > 0;
  const neutral = value === 0;

  if (neutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-slate-500">
        <Minus className="h-3.5 w-3.5" />
        <span>No change</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${improved ? 'text-emerald-600' : 'text-red-600'}`}
    >
      {improved ? (
        <TrendingDown className="h-3.5 w-3.5" />
      ) : (
        <TrendingUp className="h-3.5 w-3.5" />
      )}
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}
      {unit}
    </span>
  );
}

// ─── Comparison summary card ──────────────────────────────────────────────────

function ComparisonCard({
  summary,
  isBest,
}: {
  summary: ComparisonSummary;
  isBest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`rounded-lg border p-4 space-y-3 ${isBest ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}
      aria-label={`Branch: ${summary.branch_name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 truncate">{summary.branch_name}</h4>
          {isBest && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 flex-shrink-0">
              <Star className="h-3 w-3 fill-emerald-500" aria-hidden />
              Best
            </span>
          )}
          {summary.at_risk_changed && (
            <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 ring-1 ring-amber-200 flex-shrink-0">
              Risk status changed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="text-slate-500">Avg risk score</p>
          <Delta value={summary.risk_score_delta} />
        </div>
        <div className="space-y-0.5">
          <p className="text-slate-500">TTFV</p>
          <Delta value={summary.ttfv_delta_days} unit=" days" />
        </div>
        <div className="space-y-0.5">
          <p className="text-slate-500">Total duration</p>
          <Delta value={summary.total_duration_delta_days} unit=" days" />
        </div>
        <div className="space-y-0.5">
          <p className="text-slate-500">Risk signals</p>
          <Delta value={summary.risk_signal_delta} unit="" />
        </div>
      </div>

      {summary.top_improvements.length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 focus:outline-none"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Hide' : 'Show'} details
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {summary.top_improvements.map((imp, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                  <TrendingDown className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden />
                  {imp}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Branch editor (controls) ─────────────────────────────────────────────────

interface BranchEditorProps {
  branches: BranchScenarioRequest[];
  baselineTasks: SimulationTaskInput[];
  onChange: (branches: BranchScenarioRequest[]) => void;
}

function emptyBranch(index: number): BranchScenarioRequest {
  return { name: `Branch ${index + 1}`, assumptions_override: {}, task_overrides: [] };
}

export function BranchEditor({ branches, baselineTasks, onChange }: BranchEditorProps) {
  function updateBranch(i: number, patch: Partial<BranchScenarioRequest>) {
    onChange(branches.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function updateAssumption(
    i: number,
    key: keyof SimulationAssumptions,
    value: number,
  ) {
    const current = branches[i].assumptions_override ?? {};
    updateBranch(i, { assumptions_override: { ...current, [key]: value } });
  }

  function removeBranch(i: number) {
    onChange(branches.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {branches.map((branch, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <input
              className="input-legacy text-sm py-1 flex-1 max-w-xs h-8"
              type="text"
              placeholder="Branch name"
              value={branch.name}
              onChange={(e) => updateBranch(i, { name: e.target.value })}
              aria-label={`Branch ${i + 1} name`}
            />
            <button
              type="button"
              onClick={() => removeBranch(i)}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label={`Remove branch ${i + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Assumption overrides */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-legacy text-xs">Customer delay (days)</label>
              <input
                className="input-legacy text-xs py-1 h-7"
                type="number"
                step={0.5}
                min={0}
                value={branch.assumptions_override?.customer_delay_days ?? ''}
                placeholder="inherit"
                onChange={(e) =>
                  updateAssumption(i, 'customer_delay_days', Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="label-legacy text-xs">Internal delay (days)</label>
              <input
                className="input-legacy text-xs py-1 h-7"
                type="number"
                step={0.5}
                min={0}
                value={branch.assumptions_override?.internal_delay_days ?? ''}
                placeholder="inherit"
                onChange={(e) =>
                  updateAssumption(i, 'internal_delay_days', Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* Task due-date overrides — simple title + offset pairs */}
          <div>
            <p className="label-legacy text-xs mb-2">Override specific task deadlines (by title)</p>
            <div className="space-y-2">
              {(branch.task_overrides ?? []).map((ov, j) => (
                <div key={j} className="flex gap-2 items-center">
                  <select
                    className="select text-xs py-1 flex-1"
                    value={ov.title}
                    onChange={(e) => {
                      const newOvs = (branch.task_overrides ?? []).map((o, k) =>
                        k === j ? { ...o, title: e.target.value } : o,
                      );
                      updateBranch(i, { task_overrides: newOvs });
                    }}
                    aria-label={`Override task ${j + 1} title`}
                  >
                    <option value="">Select task…</option>
                    {baselineTasks.map((t) => (
                      <option key={t.title} value={t.title}>{t.title}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Due (days)</label>
                    <input
                      className="input-legacy text-xs py-1 w-16 text-center h-7"
                      type="number"
                      min={0}
                      value={ov.due_offset_days}
                      onChange={(e) => {
                        const newOvs = (branch.task_overrides ?? []).map((o, k) =>
                          k === j ? { ...o, due_offset_days: Number(e.target.value) } : o,
                        );
                        updateBranch(i, { task_overrides: newOvs });
                      }}
                      aria-label={`Override task ${j + 1} due offset`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newOvs = (branch.task_overrides ?? []).filter((_, k) => k !== j);
                      updateBranch(i, { task_overrides: newOvs });
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
                    aria-label={`Remove override ${j + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  const baseline = baselineTasks[0];
                  const stub: SimulationTaskInput = {
                    title: baseline?.title ?? '',
                    stage: baseline?.stage ?? 'kickoff',
                    due_offset_days: baseline?.due_offset_days ?? 7,
                    is_customer_required: baseline?.is_customer_required,
                    requires_setup_data: baseline?.requires_setup_data,
                    criticality: baseline?.criticality,
                    estimated_duration_days: baseline?.estimated_duration_days,
                    dependency_count: baseline?.dependency_count,
                    integration_required: baseline?.integration_required,
                    approval_layers: baseline?.approval_layers,
                  };
                  updateBranch(i, {
                    task_overrides: [...(branch.task_overrides ?? []), stub],
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Override a task
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn-secondary text-sm"
        onClick={() => onChange([...branches, emptyBranch(branches.length)])}
      >
        <Plus className="h-4 w-4" />
        Add Branch
      </button>
    </div>
  );
}

// ─── Main compare result panel ────────────────────────────────────────────────

interface Props {
  compareResult: SimulationCompareResponse;
}

export function BranchComparePanel({ compareResult }: Props) {
  // Identify best branch by lowest risk_score_delta
  const bestBranchName = compareResult.comparisons.reduce<string | null>((best, c) => {
    if (best === null) return c.branch_name;
    const bestDelta = compareResult.comparisons.find((x) => x.branch_name === best)?.risk_score_delta ?? 0;
    return c.risk_score_delta < bestDelta ? c.branch_name : best;
  }, null);

  return (
    <div className="space-y-5">
      {/* Overall recommendation */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <p className="font-semibold mb-0.5">Overall Recommendation</p>
        <p>{compareResult.overall_recommendation}</p>
      </div>

      {/* Per-branch cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {compareResult.comparisons.map((summary) => (
          <ComparisonCard
            key={summary.branch_name}
            summary={summary}
            isBest={summary.branch_name === bestBranchName}
          />
        ))}
      </div>
    </div>
  );
}

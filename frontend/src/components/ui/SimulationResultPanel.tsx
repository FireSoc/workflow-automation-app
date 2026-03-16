import { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import type {
  SimulationResponse,
  TaskAssessment,
  SimulationStageResult,
  SimulationRiskSignal,
  RiskBand,
} from '../../types';

// ─── Risk band styling ────────────────────────────────────────────────────────

const BAND_CONFIG: Record<
  RiskBand,
  { border: string; bg: string; text: string; badge: string; icon: React.ReactNode }
> = {
  Low: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />,
  },
  Moderate: {
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200',
    icon: <Info className="h-4 w-4 text-yellow-600" aria-hidden />,
  },
  Elevated: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />,
  },
  Critical: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    icon: <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden />,
  },
};

function RiskBadge({ band }: { band: RiskBand }) {
  const { badge, icon } = BAND_CONFIG[band];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>
      {icon}
      {band}
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

/**
 * Splits the backend summary string into readable bullet points.
 * Splits on ". " and "; " sentence boundaries, strips the [STATUS] prefix tag,
 * and filters out empty fragments.
 */
function parseSummaryBullets(summary: string): string[] {
  const cleaned = summary.replace(/^\[.*?\]\s*/, '');
  return cleaned
    .split(/[.;]\s+/)
    .map((s) => s.replace(/[.;]+$/, '').trim())
    .filter((s) => s.length > 0);
}

function SummaryCard({ result }: { result: SimulationResponse }) {
  const accentBorder = result.at_risk ? 'border-l-red-500' : 'border-l-emerald-500';
  const statusIcon = result.at_risk ? (
    <ShieldAlert className="h-4 w-4 text-red-500" aria-hidden />
  ) : (
    <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden />
  );
  const statusBadge = result.at_risk ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
      At risk
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
      On track
    </span>
  );

  const bullets = result.summary ? parseSummaryBullets(result.summary) : [];

  return (
    <section
      className={`rounded-lg border border-border border-l-4 ${accentBorder} bg-card pl-3 pr-3 pt-2 pb-4`}
      aria-labelledby="sim-summary-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h3 id="sim-summary-heading" className="text-sm font-semibold text-foreground flex items-center gap-2">
          {statusIcon}
          Simulation summary
        </h3>
        {statusBadge}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TTFV</p>
          <p className="text-xl font-bold text-foreground">{result.projected_ttfv_days}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total duration</p>
          <p className="text-xl font-bold text-foreground">{result.projected_total_days}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasks · Stages</p>
          <p className="text-xl font-bold text-foreground">{result.total_tasks}<span className="text-sm font-normal text-muted-foreground ml-1">tasks · {result.stages_simulated} stages</span></p>
        </div>
      </div>

      {bullets.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Details</p>
          <ul className="space-y-1.5">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ─── Stage-by-stage results ───────────────────────────────────────────────────

function StageRow({ stage }: { stage: SimulationStageResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    stage.blocker_tasks.length > 0 ||
    stage.overdue_tasks.length > 0 ||
    stage.gate_blocked_reason != null;

  const canAdvanceCls = stage.can_advance
    ? 'text-emerald-600'
    : 'text-amber-600';

  return (
    <li className="border-b border-border last:border-0">
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 py-2 items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground capitalize">
            {stage.stage.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-muted-foreground">
            {stage.projected_duration_days} days · {stage.total_tasks} tasks
          </p>
        </div>
        <span className={`text-xs font-medium flex items-center gap-1 ${canAdvanceCls}`}>
          {stage.can_advance ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {stage.can_advance ? 'Can advance' : 'Blocked'}
        </span>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 focus:outline-none"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="px-2 pb-3 space-y-2 text-xs">
          {stage.gate_blocked_reason && (
            <p className="text-destructive bg-destructive/10 rounded px-2 py-1">
              Gate blocked: {stage.gate_blocked_reason}
            </p>
          )}
          {stage.blocker_tasks.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Blockers</p>
              <ul className="space-y-0.5 list-disc list-inside">
                {stage.blocker_tasks.map((t) => (
                  <li key={t} className="text-foreground">{t}</li>
                ))}
              </ul>
            </div>
          )}
          {stage.overdue_tasks.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Overdue</p>
              <ul className="space-y-0.5 list-disc list-inside">
                {stage.overdue_tasks.map((t) => (
                  <li key={t} className="text-foreground">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function StageResultsSection({ stageResults }: { stageResults: SimulationStageResult[] }) {
  if (stageResults.length === 0) return null;
  return (
    <section aria-labelledby="stage-results-heading">
      <h3 id="stage-results-heading" className="text-sm font-semibold text-foreground mb-2">
        Stage breakdown
      </h3>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ul>
          {stageResults.map((s) => (
            <StageRow key={s.stage} stage={s} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Risk signals ─────────────────────────────────────────────────────────────

function RiskSignalsSection({ signals }: { signals: SimulationRiskSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <section aria-labelledby="risk-signals-heading">
      <h3 id="risk-signals-heading" className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
        Risk signals
      </h3>
      <ul className="space-y-2">
        {signals.map((s, i) => (
          <li
            key={i}
            className="rounded-lg border border-border border-l-4 border-l-destructive bg-card px-3 py-2 space-y-1 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground capitalize">{s.rule.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground capitalize">{s.stage.replace(/_/g, ' ')}</span>
              {s.task_title && (
                <span className="text-muted-foreground">— {s.task_title}</span>
              )}
            </div>
            {s.detail && <p className="text-muted-foreground leading-relaxed">{s.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Tasks needing attention (Critical/Elevated only) ──────────────────────────

function AttentionAlert({ assessments }: { assessments: TaskAssessment[] }) {
  const needsAttention = assessments.filter(
    (a) => a.risk_band === 'Critical' || a.risk_band === 'Elevated'
  );
  if (needsAttention.length === 0) return null;

  const hasCritical = needsAttention.some((a) => a.risk_band === 'Critical');
  const alertCls = hasCritical
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <section
      className={`rounded-lg border px-3 pt-2 pb-3 ${alertCls}`}
      aria-labelledby="attention-heading"
    >
      <h3 id="attention-heading" className="text-sm font-semibold flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
        Tasks needing attention
      </h3>
      <ul className="space-y-2">
        {needsAttention.map((a) => (
          <li key={a.task_title} className="text-sm flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{a.task_title}</span>
            <RiskBadge band={a.risk_band} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Task list with expandable reasons/fallback ───────────────────────────────

function TaskRow({ assessment }: { assessment: TaskAssessment }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    (assessment.top_reasons?.length ?? 0) > 0 || !!assessment.recommended_fallback;

  return (
    <li className="border-b border-border last:border-0">
      <div
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-1 sm:gap-3 px-2 py-2 sm:items-center"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{assessment.task_title}</p>
          <p className="text-xs text-muted-foreground capitalize">{assessment.stage.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center">
          <RiskBadge band={assessment.risk_band} />
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 focus:outline-none"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${assessment.task_title}`}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="px-2 pb-3 space-y-2 text-xs border-t border-border/40">
          {(assessment.top_reasons?.length ?? 0) > 0 && (
            <div className="pt-2">
              <p className="font-semibold text-muted-foreground mb-1">Why this risk level</p>
              <ul className="space-y-1">
                {assessment.top_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {assessment.recommended_fallback && (
            <div className="pt-1">
              <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Suggested action
              </p>
              <p className="text-foreground">{assessment.recommended_fallback}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function TaskList({ assessments }: { assessments: TaskAssessment[] }) {
  const sorted = [...assessments].sort((a, b) => b.action_priority_score - a.action_priority_score);

  return (
    <section aria-labelledby="task-list-heading">
      <h3 id="task-list-heading" className="text-sm font-semibold text-foreground mb-2">
        Tasks by priority
      </h3>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 px-2 py-1.5 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Task</span>
          <span>Risk</span>
          <span className="hidden sm:block" />
        </div>
        <ul>
          {sorted.map((a) => (
            <TaskRow key={a.task_title} assessment={a} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Main result panel ────────────────────────────────────────────────────────

interface Props {
  result: SimulationResponse;
}

export function SimulationResultPanel({ result }: Props) {
  const hasStages = result.stage_results && result.stage_results.length > 0;
  const hasSignals = result.risk_signals && result.risk_signals.length > 0;
  const hasTasks = result.task_assessments.length > 0;

  return (
    <div className="space-y-6">
      {/* Top row: summary + stage breakdown side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryCard result={result} />
        {hasStages ? (
          <StageResultsSection stageResults={result.stage_results!} />
        ) : (
          <div className="min-h-0" aria-hidden />
        )}
      </div>

      {/* Risk signals (backend recommendations are passed to AI context only, not shown here) */}
      {hasSignals && (
        <RiskSignalsSection signals={result.risk_signals!} />
      )}

      {/* Full width: attention + task list */}
      {hasTasks && (
        <>
          <AttentionAlert assessments={result.task_assessments} />
          <TaskList assessments={result.task_assessments} />
        </>
      )}
    </div>
  );
}

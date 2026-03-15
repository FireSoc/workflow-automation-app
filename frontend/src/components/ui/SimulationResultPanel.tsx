import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import type { SimulationResponse, TaskAssessment, RiskBand } from '../../types';

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
  Guarded: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
    icon: <Info className="h-4 w-4 text-blue-600" aria-hidden />,
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
      className={`rounded-lg border px-4 py-3 ${alertCls}`}
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

// ─── Compact task list (task + stage + risk severity only) ─────────────────────

function TaskList({ assessments }: { assessments: TaskAssessment[] }) {
  const sorted = [...assessments].sort((a, b) => b.action_priority_score - a.action_priority_score);

  return (
    <section aria-labelledby="task-list-heading">
      <h3 id="task-list-heading" className="text-sm font-semibold text-slate-800 mb-2">
        Tasks
      </h3>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
          <span>Task</span>
          <span>Risk severity</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {sorted.map((a) => (
            <li
              key={a.task_title}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-1 sm:gap-3 px-3 py-2 sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{a.task_title}</p>
                <p className="text-xs text-slate-500 capitalize">{a.stage.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center">
                <RiskBadge band={a.risk_band} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Recommendations panel ────────────────────────────────────────────────────

function RecommendationsPanel({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;
  return (
    <section aria-labelledby="recs-heading">
      <h3 id="recs-heading" className="text-sm font-semibold text-slate-800 mb-2">
        Key recommendations
      </h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-4 py-3">
        {recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </section>
  );
}

// ─── Main result panel ────────────────────────────────────────────────────────

interface Props {
  result: SimulationResponse;
}

export function SimulationResultPanel({ result }: Props) {
  return (
    <div className="space-y-6">
      {result.task_assessments.length > 0 && (
        <>
          <AttentionAlert assessments={result.task_assessments} />
          <TaskList assessments={result.task_assessments} />
        </>
      )}

      <RecommendationsPanel recommendations={result.recommendations} />
    </div>
  );
}

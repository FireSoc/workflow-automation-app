import type { RiskLevel } from '../../types';
import { cn } from '@/lib/utils';

const LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const LEVEL_CLASSES: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  medium: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  high: 'bg-red-100 text-red-700 ring-1 ring-red-200',
};

function scoreToLevel(score: number): RiskLevel {
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export interface RiskScoreBadgeProps {
  score: number | null;
  level?: RiskLevel | null;
  showScore?: boolean;
  className?: string;
}

/** Badge showing risk score and/or level for tables and cards. */
export function RiskScoreBadge({
  score,
  level: levelProp,
  showScore = true,
  className,
}: RiskScoreBadgeProps) {
  const level = levelProp ?? (score != null ? scoreToLevel(score) : null);
  if (score == null && !level) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        —
      </span>
    );
  }
  const displayLevel = level ? LEVEL_LABELS[level] : (score != null ? LEVEL_LABELS[scoreToLevel(score)] : null);
  const levelClass = level ? LEVEL_CLASSES[level] : score != null ? LEVEL_CLASSES[scoreToLevel(score)] : 'bg-muted text-muted-foreground ring-1 ring-border';

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {showScore && score != null && (
        <span className="tabular-nums text-xs font-medium text-foreground">
          {score}
        </span>
      )}
      {displayLevel && (
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            levelClass
          )}
        >
          {displayLevel}
        </span>
      )}
    </span>
  );
}

export interface RiskGaugeProps {
  score: number | null;
  className?: string;
}

/** Compact horizontal bar (0–100) with color bands: green < 40, yellow 40–70, red > 70. */
export function RiskGauge({ score, className }: RiskGaugeProps) {
  if (score == null) {
    return (
      <div
        className={cn('h-2 w-full rounded-full bg-muted', className)}
        aria-label="Risk score not set"
      />
    );
  }
  const clamped = Math.min(100, Math.max(0, score));
  const barColor =
    clamped < 40
      ? 'bg-emerald-500'
      : clamped < 70
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div
      className={cn('h-2 w-full min-w-[4rem] rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Risk score ${score}`}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-300', barColor)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

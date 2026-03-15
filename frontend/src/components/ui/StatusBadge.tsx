import type { ProjectStatus, TaskStatus, CustomerType, OnboardingStage } from '../../types';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'slate' | 'orange' | 'purple' | 'indigo';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  dot?: boolean;
}

export function Badge({ label, variant, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Active', variant: 'blue' },
    at_risk: { label: 'At Risk', variant: 'red' },
    blocked: { label: 'Blocked', variant: 'orange' },
    completed: { label: 'Completed', variant: 'green' },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} dot />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
    not_started: { label: 'Not Started', variant: 'slate' },
    in_progress: { label: 'In Progress', variant: 'blue' },
    completed: { label: 'Completed', variant: 'green' },
    overdue: { label: 'Overdue', variant: 'red' },
    blocked: { label: 'Blocked', variant: 'orange' },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} dot />;
}

const CUSTOMER_TYPE_BADGE: Record<CustomerType, { label: string; variant: BadgeVariant }> = {
  smb: { label: 'SMB', variant: 'indigo' },
  mid_market: { label: 'Mid-Market', variant: 'purple' },
  enterprise: { label: 'Enterprise', variant: 'purple' },
};

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  const config = CUSTOMER_TYPE_BADGE[type] ?? { label: type, variant: 'slate' as BadgeVariant };
  return <Badge label={config.label} variant={config.variant} />;
}

const STAGE_BADGE_MAP: Record<OnboardingStage, { label: string; variant: BadgeVariant }> = {
  kickoff: { label: 'Kickoff', variant: 'indigo' },
  setup: { label: 'Setup', variant: 'blue' },
  integration: { label: 'Integration', variant: 'purple' },
  training: { label: 'Training', variant: 'purple' },
  go_live: { label: 'Go-Live', variant: 'green' },
};

const UNKNOWN_STAGE_FALLBACK = { label: 'Unknown', variant: 'slate' as BadgeVariant };

export function StageBadge({ stage }: { stage: OnboardingStage }) {
  const config = stage ? STAGE_BADGE_MAP[stage] ?? UNKNOWN_STAGE_FALLBACK : UNKNOWN_STAGE_FALLBACK;
  const { label, variant } = config;
  return <Badge label={label} variant={variant} />;
}

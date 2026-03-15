import {
  CheckCircle2,
  FolderOpen,
  ListTodo,
  TrendingUp,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Trophy,
  Ban,
} from 'lucide-react';
import type { OnboardingEvent, EventType } from '../../types';
import { EmptyState } from './EmptyState';

const EVENT_META: Partial<Record<EventType, { icon: React.ElementType; color: string; label: string }>> = {
  deal_ingested: { icon: FolderOpen, color: 'text-blue-500 bg-blue-50', label: 'Deal Ingested' },
  project_created: { icon: FolderOpen, color: 'text-blue-500 bg-blue-50', label: 'Project Created' },
  playbook_selected: { icon: ListTodo, color: 'text-indigo-500 bg-indigo-50', label: 'Playbook Selected' },
  tasks_generated: { icon: ListTodo, color: 'text-indigo-500 bg-indigo-50', label: 'Tasks Generated' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', label: 'Task Completed' },
  project_advanced: { icon: TrendingUp, color: 'text-brand-500 bg-brand-50', label: 'Stage Advanced' },
  reminder_triggered: { icon: Bell, color: 'text-amber-500 bg-amber-50', label: 'Reminder' },
  risk_flag_added: { icon: AlertTriangle, color: 'text-red-500 bg-red-50', label: 'Risk Flagged' },
  risk_flag_cleared: { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-50', label: 'Risk Cleared' },
  risk_score_changed: { icon: AlertTriangle, color: 'text-red-500 bg-red-50', label: 'Risk Updated' },
  project_completed: { icon: Trophy, color: 'text-green-500 bg-green-50', label: 'Completed' },
  stage_blocked: { icon: Ban, color: 'text-orange-500 bg-orange-50', label: 'Stage Blocked' },
  blocker_detected: { icon: Ban, color: 'text-orange-500 bg-orange-50', label: 'Blocker' },
  stage_delayed: { icon: Bell, color: 'text-amber-500 bg-amber-50', label: 'Stage Delayed' },
  escalation_triggered: { icon: AlertTriangle, color: 'text-red-500 bg-red-50', label: 'Escalation' },
};

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface EventFeedProps {
  events: OnboardingEvent[];
  maxItems?: number;
}

export function EventFeed({ events, maxItems }: EventFeedProps) {
  const displayed = maxItems ? [...events].reverse().slice(0, maxItems) : [...events].reverse();

  if (displayed.length === 0) {
    return <EmptyState title="No activity yet" description="Project activity will appear here as the onboarding progresses." />;
  }

  return (
    <ol className="space-y-0" aria-label="Project activity">
      {displayed.map((event, idx) => {
        const meta = EVENT_META[event.event_type] ?? {
          icon: FolderOpen,
          color: 'text-slate-500 bg-slate-50',
          label: event.event_type,
        };
        const Icon = meta.icon;

        return (
          <li key={event.id} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1.5 ${meta.color} flex-shrink-0`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {idx < displayed.length - 1 && (
                <div className="w-px flex-1 bg-slate-100 my-1 min-h-4" />
              )}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-700">{meta.label}</p>
                <time
                  dateTime={event.created_at}
                  className="text-xs text-slate-400 flex-shrink-0"
                >
                  {formatRelativeTime(event.created_at)}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{event.message}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type CustomerType = 'smb' | 'enterprise';

export type OnboardingStage = 'kickoff' | 'setup' | 'integration' | 'training' | 'go_live';

export type ProjectStatus = 'active' | 'at_risk' | 'blocked' | 'completed';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked';

export type RiskLevel = 'low' | 'medium' | 'high';

export type EventType =
  | 'deal_ingested'
  | 'project_created'
  | 'playbook_selected'
  | 'tasks_generated'
  | 'task_completed'
  | 'project_advanced'
  | 'reminder_triggered'
  | 'risk_flag_added'
  | 'risk_flag_cleared'
  | 'risk_score_changed'
  | 'project_completed'
  | 'stage_blocked'
  | 'blocker_detected'
  | 'stage_delayed'
  | 'escalation_triggered';

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  company_name: string;
  customer_type: CustomerType;
  industry: string | null;
  primary_contacts: unknown[] | null;
  onboarding_status: string | null;
  current_risk_level: string | null;
  health_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  customer_id: number;
  source_deal_id: number | null;
  playbook_id: number | null;
  name: string | null;
  current_stage: OnboardingStage;
  status: ProjectStatus;
  risk_flag: boolean;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  kickoff_date: string | null;
  target_go_live_date: string | null;
  projected_go_live_date: string | null;
  health_summary: string | null;
  next_best_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCustomer extends Project {
  customer?: Customer;
}

export interface Task {
  id: number;
  project_id: number;
  stage: OnboardingStage;
  title: string;
  description: string | null;
  assigned_to: string | null;
  owner_type: string | null;
  owner_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  dependency_ids: number[] | null;
  blocker_flag: boolean;
  blocker_reason: string | null;
  completed_at: string | null;
  task_type: string | null;
  required_for_stage_completion: boolean;
  is_customer_required: boolean;
  requires_setup_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingEvent {
  id: number;
  project_id: number;
  task_id: number | null;
  event_type: EventType;
  message: string;
  created_at: string;
}

export interface RiskSignal {
  id: number;
  project_id: number;
  signal_type: string;
  description: string;
  severity: string | null;
  created_at: string;
}

export interface Recommendation {
  id: number;
  project_id: number;
  task_id: number | null;
  action_type: string;
  priority: number;
  dismissed: boolean;
  label: string | null;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  events: OnboardingEvent[];
  risk_signals: RiskSignal[];
  recommendations: Recommendation[];
}

export interface OnboardingPlaybook {
  id: number;
  name: string;
  segment: CustomerType;
  supported_products: string[];
  default_stages: unknown[];
  default_tasks: unknown[];
  branching_rules: unknown;
  duration_rules: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPortalProjectView {
  id: number;
  company_name: string;
  current_stage: OnboardingStage;
  status: ProjectStatus;
  target_go_live_date: string | null;
  projected_go_live_date: string | null;
  kickoff_date: string | null;
  tasks: Task[];
  next_steps: string;
  milestones: string[];
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface CustomerCreate {
  company_name: string;
  customer_type: CustomerType;
  industry?: string | null;
  primary_contacts?: unknown[] | null;
}

export interface ProjectCreate {
  customer_id: number;
  name?: string | null;
  notes?: string;
}

export interface TaskCompleteResponse {
  task: Task;
  stage_advanced: boolean;
  new_stage: OnboardingStage | null;
  project_completed: boolean;
  message: string;
}

export interface OverdueCheckResponse {
  overdue_count: number;
  reminder_events_created: number;
  message: string;
}

export interface RiskCheckResponse {
  risk_flag: boolean;
  was_already_flagged: boolean;
  reason: string | null;
  message: string;
}

export interface RiskRead {
  risk_score: number;
  risk_level: RiskLevel;
  risk_flag: boolean;
  explanations: string[];
}

export interface ProjectSummaryResponse {
  what_is_complete: string;
  what_is_blocked: string;
  why_risk_elevated: string;
  what_happens_next: string;
  go_live_realistic: string;
}

export interface DealIngestPayload {
  crm_source: string;
  company_name: string;
  segment: CustomerType;
  products_purchased?: string[];
  target_go_live_date?: string | null;
  contract_start_date?: string | null;
  implementation_owner?: string | null;
  csm_owner?: string | null;
  special_requirements?: string | null;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const STAGE_ORDER: OnboardingStage[] = ['kickoff', 'setup', 'integration', 'training', 'go_live'];

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  kickoff: 'Kickoff',
  setup: 'Setup',
  integration: 'Integration',
  training: 'Training',
  go_live: 'Go-Live',
};

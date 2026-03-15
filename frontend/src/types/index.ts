// ─── Enums ────────────────────────────────────────────────────────────────────

export type CustomerType = 'smb' | 'mid_market' | 'enterprise';

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

// ─── Simulation v2 — Request types ─────────────────────────────────────────────

export type RiskBand = 'Low' | 'Guarded' | 'Elevated' | 'Critical';

export type InboxEventType =
  | 'email_sent'
  | 'awaiting_reply'
  | 'reply_received'
  | 'reminder_sent'
  | 'deadline_warning'
  | 'deadline_missed';

export interface SimulationTaskInput {
  title: string;
  stage: OnboardingStage;
  due_offset_days: number;
  required_for_stage_completion?: boolean;
  is_customer_required?: boolean;
  requires_setup_data?: boolean;
  current_status?: TaskStatus;
  delay_days?: number;
  criticality?: number;
  estimated_duration_days?: number;
  dependency_count?: number;
  integration_required?: boolean;
  approval_layers?: number;
}

export interface SimulationAssumptions {
  avg_customer_delay_days?: number;
  avg_internal_delay_days?: number;
  setup_data_delay_days?: number;
  customer_delay_days?: number;
  internal_delay_days?: number;
}

export interface SimulationRequest {
  customer_type: string;
  tasks: SimulationTaskInput[];
  assumptions?: SimulationAssumptions;
}

// ─── Simulation v2 — Response types ──────────────────────────────────────────

export interface TaskAssessment {
  task_title: string;
  stage: OnboardingStage;
  slack_risk_score: number;
  external_dependency_score: number;
  dependency_chain_score: number;
  complexity_score: number;
  risk_score: number;
  risk_band: RiskBand;
  urgency_score: number;
  criticality_score: number;
  action_priority_score: number;
  top_reasons: string[];
  recommended_fallback: string;
}

export interface VirtualInboxMessage {
  day: number;
  event_type: InboxEventType;
  subject: string;
  body_preview: string;
  task_title: string | null;
  risk_band: RiskBand | null;
}

export interface VirtualInboxPreview {
  sender_label: string;
  recipient_label: string;
  sent_messages: VirtualInboxMessage[];
  received_messages: VirtualInboxMessage[];
}

export interface SimulationRiskSignal {
  rule: string;
  stage: OnboardingStage;
  task_title: string | null;
  detail: string;
}

export interface SimulationStageResult {
  stage: OnboardingStage;
  total_tasks: number;
  required_tasks: number;
  customer_required_tasks: number;
  setup_data_tasks: number;
  projected_duration_days: number;
  blocker_tasks: string[];
  overdue_tasks: string[];
  can_advance: boolean;
  gate_blocked_reason: string | null;
}

export interface SimulationResponse {
  customer_type: string;
  total_tasks: number;
  stages_simulated: number;
  projected_ttfv_days: number;
  projected_total_days: number;
  at_risk: boolean;
  risk_signals: SimulationRiskSignal[];
  stage_results: SimulationStageResult[];
  recommendations: string[];
  summary: string;
  task_assessments: TaskAssessment[];
  inbox_preview: VirtualInboxPreview | null;
}

export interface BranchScenarioRequest {
  name: string;
  assumptions_override?: SimulationAssumptions;
  task_overrides?: SimulationTaskInput[];
}

export interface BranchScenarioResult {
  name: string;
  result: SimulationResponse;
}

export interface ComparisonSummary {
  branch_name: string;
  risk_score_delta: number;
  ttfv_delta_days: number;
  total_duration_delta_days: number;
  at_risk_changed: boolean;
  risk_signal_delta: number;
  top_improvements: string[];
}

export interface SimulationCompareRequest {
  customer_type: string;
  baseline_tasks: SimulationTaskInput[];
  baseline_assumptions?: SimulationAssumptions;
  branches: BranchScenarioRequest[];
}

export interface SimulationCompareResponse {
  customer_type: string;
  baseline: SimulationResponse;
  branches: BranchScenarioResult[];
  comparisons: ComparisonSummary[];
  overall_recommendation: string;
}

export interface ProjectBaselineResponse {
  customer_type: string;
  tasks: SimulationTaskInput[];
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

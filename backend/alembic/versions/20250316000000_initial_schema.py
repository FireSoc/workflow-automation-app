"""initial_schema

Revision ID: 20250316000000
Revises:
Create Date: 2025-03-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20250316000000"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL enum types (create_type=False so we never double-create).
customertype = postgresql.ENUM("smb", "mid_market", "enterprise", name="customertype", create_type=False)
dealstatus = postgresql.ENUM("open", "closed_won", "closed_lost", name="dealstatus", create_type=False)
onboardingstage = postgresql.ENUM(
    "kickoff", "setup", "integration", "training", "go_live", name="onboardingstage", create_type=False
)
projectstatus = postgresql.ENUM(
    "active", "at_risk", "blocked", "completed", name="projectstatus", create_type=False
)
risklevel = postgresql.ENUM("low", "medium", "high", name="risklevel", create_type=False)
taskstatus = postgresql.ENUM(
    "not_started", "in_progress", "completed", "overdue", "blocked", name="taskstatus", create_type=False
)
eventtype = postgresql.ENUM(
    "deal_ingested", "project_created", "playbook_selected", "tasks_generated",
    "task_completed", "project_advanced", "reminder_triggered", "risk_flag_added",
    "risk_flag_cleared", "risk_score_changed", "project_completed", "stage_blocked",
    "blocker_detected", "stage_delayed", "escalation_triggered",
    name="eventtype", create_type=False,
)
recommendationactiontype = postgresql.ENUM(
    "remind_customer_admin", "escalate_blocker", "reschedule_training",
    "shift_projected_go_live", "assign_technical_specialist",
    name="recommendationactiontype", create_type=False,
)


def _create_enum_if_not_exists(name: str, values: str) -> None:
    """Run CREATE TYPE ... AS ENUM; ignore if type already exists."""
    op.execute(
        f"DO $$ BEGIN CREATE TYPE {name} AS ENUM ({values}); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )


def upgrade() -> None:
    # Create PostgreSQL enum types only if they don't exist (idempotent).
    _create_enum_if_not_exists("customertype", "'smb', 'mid_market', 'enterprise'")
    _create_enum_if_not_exists("dealstatus", "'open', 'closed_won', 'closed_lost'")
    _create_enum_if_not_exists(
        "onboardingstage", "'kickoff', 'setup', 'integration', 'training', 'go_live'"
    )
    _create_enum_if_not_exists("projectstatus", "'active', 'at_risk', 'blocked', 'completed'")
    _create_enum_if_not_exists("risklevel", "'low', 'medium', 'high'")
    _create_enum_if_not_exists(
        "taskstatus", "'not_started', 'in_progress', 'completed', 'overdue', 'blocked'"
    )
    _create_enum_if_not_exists("tasktype", "'internal', 'customer'")
    _create_enum_if_not_exists(
        "eventtype",
        "'deal_ingested', 'project_created', 'playbook_selected', 'tasks_generated', "
        "'task_completed', 'project_advanced', 'reminder_triggered', 'risk_flag_added', "
        "'risk_flag_cleared', 'risk_score_changed', 'project_completed', 'stage_blocked', "
        "'blocker_detected', 'stage_delayed', 'escalation_triggered'",
    )
    _create_enum_if_not_exists(
        "recommendationactiontype",
        "'remind_customer_admin', 'escalate_blocker', 'reschedule_training', "
        "'shift_projected_go_live', 'assign_technical_specialist'",
    )

    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("customer_type", customertype, nullable=False),
        sa.Column("industry", sa.String(255), nullable=True),
        sa.Column("primary_contacts", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("onboarding_status", sa.String(64), nullable=True),
        sa.Column("current_risk_level", sa.String(32), nullable=True),
        sa.Column("health_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customers_id"), "customers", ["id"], unique=False)

    op.create_table(
        "onboarding_playbooks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("segment", customertype, nullable=False),
        sa.Column("supported_products", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("default_stages", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("default_tasks", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("branching_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_rules", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboarding_playbooks_id"), "onboarding_playbooks", ["id"], unique=False)
    op.create_index(op.f("ix_onboarding_playbooks_name"), "onboarding_playbooks", ["name"], unique=False)
    op.create_index(op.f("ix_onboarding_playbooks_segment"), "onboarding_playbooks", ["segment"], unique=False)

    op.create_table(
        "crm_deals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("crm_source", sa.String(128), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("segment", customertype, nullable=False),
        sa.Column("products_purchased", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("target_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("contract_start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("implementation_owner", sa.String(255), nullable=True),
        sa.Column("csm_owner", sa.String(255), nullable=True),
        sa.Column("special_requirements", sa.Text(), nullable=True),
        sa.Column("deal_status", dealstatus, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crm_deals_id"), "crm_deals", ["id"], unique=False)
    op.create_index(op.f("ix_crm_deals_crm_source"), "crm_deals", ["crm_source"], unique=False)
    op.create_index(op.f("ix_crm_deals_segment"), "crm_deals", ["segment"], unique=False)
    op.create_index(op.f("ix_crm_deals_deal_status"), "crm_deals", ["deal_status"], unique=False)

    op.create_table(
        "onboarding_projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("source_deal_id", sa.Integer(), nullable=True),
        sa.Column("playbook_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("current_stage", onboardingstage, nullable=False),
        sa.Column("status", projectstatus, nullable=False),
        sa.Column("risk_flag", sa.Boolean(), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column("risk_level", risklevel, nullable=True),
        sa.Column("kickoff_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("target_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("projected_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("health_summary", sa.Text(), nullable=True),
        sa.Column("next_best_action", sa.String(500), nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_deal_id"], ["crm_deals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["playbook_id"], ["onboarding_playbooks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboarding_projects_id"), "onboarding_projects", ["id"], unique=False)
    op.create_index(op.f("ix_onboarding_projects_customer_id"), "onboarding_projects", ["customer_id"], unique=False)
    op.create_index(op.f("ix_onboarding_projects_source_deal_id"), "onboarding_projects", ["source_deal_id"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("stage", onboardingstage, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assigned_to", sa.String(255), nullable=True),
        sa.Column("owner_type", sa.String(32), nullable=True),
        sa.Column("owner_id", sa.String(255), nullable=True),
        sa.Column("status", taskstatus, nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dependency_ids", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("blocker_flag", sa.Boolean(), nullable=False),
        sa.Column("blocker_reason", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("task_type", sa.String(32), nullable=True),
        sa.Column("required_for_stage_completion", sa.Boolean(), nullable=False),
        sa.Column("is_customer_required", sa.Boolean(), nullable=False),
        sa.Column("requires_setup_data", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["onboarding_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_id"), "tasks", ["id"], unique=False)
    op.create_index(op.f("ix_tasks_project_id"), "tasks", ["project_id"], unique=False)

    op.create_table(
        "onboarding_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("event_type", eventtype, nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["onboarding_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboarding_events_id"), "onboarding_events", ["id"], unique=False)
    op.create_index(op.f("ix_onboarding_events_project_id"), "onboarding_events", ["project_id"], unique=False)

    op.create_table(
        "risk_signals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("signal_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["onboarding_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_risk_signals_id"), "risk_signals", ["id"], unique=False)
    op.create_index(op.f("ix_risk_signals_project_id"), "risk_signals", ["project_id"], unique=False)
    op.create_index(op.f("ix_risk_signals_signal_type"), "risk_signals", ["signal_type"], unique=False)

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("action_type", recommendationactiontype, nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("dismissed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["onboarding_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recommendations_id"), "recommendations", ["id"], unique=False)
    op.create_index(op.f("ix_recommendations_project_id"), "recommendations", ["project_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recommendations_project_id"), table_name="recommendations")
    op.drop_index(op.f("ix_recommendations_id"), table_name="recommendations")
    op.drop_table("recommendations")
    op.drop_index(op.f("ix_risk_signals_signal_type"), table_name="risk_signals")
    op.drop_index(op.f("ix_risk_signals_project_id"), table_name="risk_signals")
    op.drop_index(op.f("ix_risk_signals_id"), table_name="risk_signals")
    op.drop_table("risk_signals")
    op.drop_index(op.f("ix_onboarding_events_project_id"), table_name="onboarding_events")
    op.drop_index(op.f("ix_onboarding_events_id"), table_name="onboarding_events")
    op.drop_table("onboarding_events")
    op.drop_index(op.f("ix_tasks_project_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index(op.f("ix_onboarding_projects_source_deal_id"), table_name="onboarding_projects")
    op.drop_index(op.f("ix_onboarding_projects_customer_id"), table_name="onboarding_projects")
    op.drop_index(op.f("ix_onboarding_projects_id"), table_name="onboarding_projects")
    op.drop_table("onboarding_projects")
    op.drop_index(op.f("ix_crm_deals_deal_status"), table_name="crm_deals")
    op.drop_index(op.f("ix_crm_deals_segment"), table_name="crm_deals")
    op.drop_index(op.f("ix_crm_deals_crm_source"), table_name="crm_deals")
    op.drop_index(op.f("ix_crm_deals_id"), table_name="crm_deals")
    op.drop_table("crm_deals")
    op.drop_index(op.f("ix_onboarding_playbooks_segment"), table_name="onboarding_playbooks")
    op.drop_index(op.f("ix_onboarding_playbooks_name"), table_name="onboarding_playbooks")
    op.drop_index(op.f("ix_onboarding_playbooks_id"), table_name="onboarding_playbooks")
    op.drop_table("onboarding_playbooks")
    op.drop_index(op.f("ix_customers_id"), table_name="customers")
    op.drop_table("customers")

    op.execute("DROP TYPE IF EXISTS recommendationactiontype")
    op.execute("DROP TYPE IF EXISTS eventtype")
    op.execute("DROP TYPE IF EXISTS taskstatus")
    op.execute("DROP TYPE IF EXISTS tasktype")
    op.execute("DROP TYPE IF EXISTS onboardingstage")
    op.execute("DROP TYPE IF EXISTS risklevel")
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.execute("DROP TYPE IF EXISTS dealstatus")
    op.execute("DROP TYPE IF EXISTS customertype")

"""
Seed onboarding playbooks for SMB and Enterprise. Run from backend directory:

    cd backend && python scripts/seed_playbooks.py

Or from repo root with PYTHONPATH=backend:

    PYTHONPATH=backend python backend/scripts/seed_playbooks.py

Idempotent: creates a playbook per segment only if one does not already exist.
"""

import sys
from pathlib import Path

# Ensure backend is on path so app imports resolve
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.db.session import SessionLocal, init_db
from app.models.enums import CustomerType, STAGE_ORDER
from app.models.onboarding_playbook import OnboardingPlaybook
from app.schemas.playbook import PlaybookCreate
from app.schemas.playbook_payload import TaskTemplate
from app.services.playbook_seed_service import create_playbook_from_payload

STAGE_ORDER_STR = [s.value for s in STAGE_ORDER]

DURATION_RULES = {
    "kickoff": 7,
    "setup": 14,
    "integration": 14,
    "training": 7,
    "go_live": 3,
}

SMB_PLAYBOOK = PlaybookCreate(
    name="SMB Standard",
    segment=CustomerType.SMB,
    supported_products=["core", "basic"],
    default_stages=STAGE_ORDER_STR,
    default_tasks=[
        TaskTemplate(
            stage="kickoff",
            title="Sign contract and collect billing info",
            description="Customer signs and returns contract; collect payment details.",
            assigned_to="implementation_owner",
            due_offset_days=3,
            required_for_stage_completion=True,
            is_customer_required=True,
            task_type="customer",
        ),
        TaskTemplate(
            stage="kickoff",
            title="Schedule kickoff call",
            description="Confirm kickoff date and attendees.",
            assigned_to="implementation_owner",
            due_offset_days=5,
            required_for_stage_completion=True,
            task_type="internal",
        ),
        TaskTemplate(
            stage="kickoff",
            title="Send welcome pack",
            description="Email welcome pack and getting-started guide.",
            assigned_to="csm_owner",
            due_offset_days=7,
            required_for_stage_completion=True,
            task_type="internal",
        ),
        TaskTemplate(
            stage="setup",
            title="Provision account and configure base settings",
            description="Create tenant and apply segment defaults.",
            assigned_to="implementation_owner",
            due_offset_days=7,
            required_for_stage_completion=True,
            task_type="internal",
        ),
        TaskTemplate(
            stage="setup",
            title="Customer completes profile and preferences",
            description="Customer fills out profile in portal.",
            assigned_to="csm_owner",
            due_offset_days=10,
            required_for_stage_completion=True,
            is_customer_required=True,
            requires_setup_data=True,
            task_type="customer",
        ),
    ],
    duration_rules=DURATION_RULES,
)

ENTERPRISE_PLAYBOOK = PlaybookCreate(
    name="Enterprise Standard",
    segment=CustomerType.ENTERPRISE,
    supported_products=["enterprise", "core", "advanced"],
    default_stages=STAGE_ORDER_STR,
    default_tasks=[
        TaskTemplate(
            stage="kickoff",
            title="Execute MSA and order form",
            description="Legal and procurement sign-off; collect signed docs.",
            assigned_to="implementation_owner",
            due_offset_days=5,
            required_for_stage_completion=True,
            is_customer_required=True,
            task_type="customer",
        ),
        TaskTemplate(
            stage="kickoff",
            title="Stakeholder kickoff and project charter",
            description="Kickoff meeting; agree charter and timeline.",
            assigned_to="implementation_owner",
            due_offset_days=7,
            required_for_stage_completion=True,
            task_type="internal",
        ),
        TaskTemplate(
            stage="kickoff",
            title="Technical discovery questionnaire",
            description="Customer completes discovery form (integrations, SSO, data).",
            assigned_to="implementation_owner",
            due_offset_days=10,
            required_for_stage_completion=True,
            is_customer_required=True,
            requires_setup_data=True,
            task_type="customer",
        ),
        TaskTemplate(
            stage="setup",
            title="Provision environment and SSO configuration",
            description="Create tenant; configure SSO per discovery.",
            assigned_to="implementation_owner",
            due_offset_days=14,
            required_for_stage_completion=True,
            task_type="internal",
        ),
        TaskTemplate(
            stage="setup",
            title="Security and compliance review",
            description="Share security docs; customer confirms compliance requirements.",
            assigned_to="implementation_owner",
            due_offset_days=14,
            required_for_stage_completion=True,
            task_type="internal",
        ),
    ],
    duration_rules=DURATION_RULES,
)

PLAYBOOKS = [SMB_PLAYBOOK, ENTERPRISE_PLAYBOOK]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        for payload in PLAYBOOKS:
            existing = (
                db.query(OnboardingPlaybook)
                .filter(OnboardingPlaybook.segment == payload.segment)
                .first()
            )
            if existing:
                print(f"Playbook for segment {payload.segment.value} already exists: {existing.name} (id={existing.id})")
                continue
            playbook = create_playbook_from_payload(db, payload)
            print(f"Created playbook: {playbook.name} (segment={playbook.segment.value}, id={playbook.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()

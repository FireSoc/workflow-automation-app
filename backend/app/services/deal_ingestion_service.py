"""Ingest closed-won CRM deal: create deal, upsert account, select playbook, create project, generate tasks."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.crm_deal import CRMDeal
from app.models.customer import Customer
from app.models.enums import CustomerType, DealStatus, EventType, OnboardingStage, ProjectStatus
from app.models.onboarding_playbook import OnboardingPlaybook
from app.models.onboarding_project import OnboardingProject
from app.services.event_service import log_event
from app.services.playbook_selection_service import select_playbook
from app.services.workflow_service import _generate_tasks_for_stage


def _upsert_customer(
    db: Session,
    company_name: str,
    segment: CustomerType,
    implementation_owner: str | None = None,
    csm_owner: str | None = None,
) -> Customer:
    """Find customer by company_name or create new."""
    customer = (
        db.query(Customer)
        .filter(Customer.company_name == company_name)
        .first()
    )
    if customer:
        customer.customer_type = segment
        customer.updated_at = datetime.now(timezone.utc)
        db.flush()
        return customer

    customer = Customer(
        company_name=company_name,
        customer_type=segment,
        industry=None,
        primary_contacts=None,
    )
    db.add(customer)
    db.flush()
    return customer


def ingest_closed_won_deal(
    db: Session,
    *,
    crm_source: str,
    company_name: str,
    segment: CustomerType,
    products_purchased: list[str] | None = None,
    target_go_live_date: datetime | None = None,
    contract_start_date: datetime | None = None,
    implementation_owner: str | None = None,
    csm_owner: str | None = None,
    special_requirements: str | None = None,
) -> tuple[CRMDeal, Customer, OnboardingProject]:
    """
    Ingest a closed-won deal: persist deal, upsert customer, select playbook,
    create onboarding project, generate kickoff tasks, emit events.
    Returns (deal, customer, project).
    """
    now = datetime.now(timezone.utc)
    products = products_purchased or []

    deal = CRMDeal(
        crm_source=crm_source,
        company_name=company_name,
        segment=segment,
        products_purchased=products,
        target_go_live_date=target_go_live_date,
        contract_start_date=contract_start_date,
        implementation_owner=implementation_owner,
        csm_owner=csm_owner,
        special_requirements=special_requirements,
        deal_status=DealStatus.CLOSED_WON,
    )
    db.add(deal)
    db.flush()

    customer = _upsert_customer(
        db, company_name, segment, implementation_owner, csm_owner
    )
    db.flush()

    playbook = select_playbook(
        db, segment, products_purchased=products, special_requirements=special_requirements
    )

    project = OnboardingProject(
        customer_id=customer.id,
        source_deal_id=deal.id,
        playbook_id=playbook.id if playbook else None,
        name=None,
        current_stage=OnboardingStage.KICKOFF,
        status=ProjectStatus.ACTIVE,
        risk_flag=False,
        kickoff_date=now,
        target_go_live_date=target_go_live_date,
        projected_go_live_date=target_go_live_date,
        notes=None,
    )
    db.add(project)
    db.flush()

    log_event(
        db,
        project_id=project.id,
        event_type=EventType.DEAL_INGESTED,
        message=f"Deal ingested: {company_name} from {crm_source}. Onboarding project created.",
    )
    if playbook:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.PLAYBOOK_SELECTED,
            message=f"Playbook '{playbook.name}' selected for segment {segment.value}.",
        )

    log_event(
        db,
        project_id=project.id,
        event_type=EventType.PROJECT_CREATED,
        message=f"Onboarding project created for {company_name} ({segment.value}).",
    )

    tasks = _generate_tasks_for_stage(
        db,
        project,
        segment,
        OnboardingStage.KICKOFF,
        playbook=playbook,
        implementation_owner=implementation_owner,
        csm_owner=csm_owner,
        kickoff_date=now,
        target_go_live_date=target_go_live_date,
    )
    if tasks:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.TASKS_GENERATED,
            message=f"{len(tasks)} task(s) generated for stage '{OnboardingStage.KICKOFF.value}'.",
        )

    db.commit()
    db.refresh(deal)
    db.refresh(customer)
    db.refresh(project)
    return deal, customer, project

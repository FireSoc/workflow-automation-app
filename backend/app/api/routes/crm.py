import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.schemas.deal import DealIngestPayload, DealRead
from app.services.deal_ingestion_service import ingest_closed_won_deal

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.post(
    "/deals/ingest",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest closed-won deal and create onboarding project",
)
def ingest_deal(
    payload: DealIngestPayload,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> dict:
    """
    When a CRM deal is marked Closed Won, call this to:
    - Persist the deal
    - Create or update customer account
    - Select onboarding playbook (by segment/products/requirements)
    - Create onboarding project with kickoff stage and generated tasks
    - Emit events (deal_ingested, playbook_selected, project_created, tasks_generated)
    """
    try:
        deal, customer, project = ingest_closed_won_deal(
            db,
            owner_id=current_user,
            crm_source=payload.crm_source,
            company_name=payload.company_name,
            segment=payload.segment,
            products_purchased=payload.products_purchased or [],
            target_go_live_date=payload.target_go_live_date,
            contract_start_date=payload.contract_start_date,
            implementation_owner=payload.implementation_owner,
            csm_owner=payload.csm_owner,
            special_requirements=payload.special_requirements,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Deal ingestion failed: {e!s}",
        ) from e

    from app.schemas.project import ProjectRead

    return {
        "deal": DealRead.model_validate(deal),
        "customer_id": customer.id,
        "project": ProjectRead.model_validate(project),
        "message": "Deal ingested; onboarding project created.",
    }

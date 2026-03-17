"""
Decision Sandbox simulation endpoints.

POST /simulations/risk
    Run a fully ad-hoc, stateless risk simulation against an arbitrary
    task set and assumption profile. No project needs to exist.
    v2: response now includes per-task assessments (risk_band, top_reasons,
    recommended_fallback) and an ephemeral virtual inbox preview.

POST /simulations/risk/from-project/{project_id}
    Simulate against the current state of a persisted project (its
    existing tasks, stages, and statuses), then apply delay assumptions
    on top. Useful for "what-if" analysis on live onboarding projects.

POST /simulations/risk/compare
    Run a baseline simulation plus one or more scenario branches (with
    different assumptions or task overrides) and return a delta comparison
    summary. Fully stateless — no project needs to exist.
    Use this to answer: "Does sending the doc request 2 days earlier reduce
    risk significantly compared to our baseline?"
"""

import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.models.customer import Customer
from app.models.onboarding_project import OnboardingProject
from app.schemas.simulation import (
    ProjectBaselineResponse,
    SimulationAssumptions,
    SimulationCompareRequest,
    SimulationCompareResponse,
    SimulationRequest,
    SimulationResponse,
)
from app.services.simulation_service import (
    get_project_baseline,
    run_compare,
    run_simulation,
    simulate_from_project,
)

router = APIRouter(prefix="/simulations", tags=["Simulations"])


@router.post(
    "/risk",
    response_model=SimulationResponse,
    summary="Run a stateless decision-sandbox risk simulation (v2)",
)
def simulate_risk(payload: SimulationRequest) -> SimulationResponse:
    """
    Supply your own list of task definitions and assumption parameters.

    The engine runs the full deterministic risk analysis and returns:
    - Per-stage results with projected durations and gate blockers.
    - Risk signals (overdue threshold, stalled, multi-overdue).
    - **v2:** Per-task assessments: risk_band (Low/Moderate/Elevated/Critical),
      risk score, urgency score, criticality score, top_reasons (explainability),
      recommended_fallback, and action_priority_score.
    - **v2:** Ephemeral virtual inbox preview showing simulated outbound emails,
      customer replies, reminders, and deadline alerts derived from the task set.
    - Ranked recommendations incorporating task-level fallback playbooks.

    No database access is required — fully stateless.
    """
    if not payload.tasks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one task is required to run a simulation.",
        )

    return run_simulation(
        customer_type=payload.customer_type,
        tasks=payload.tasks,
        assumptions=payload.assumptions,
    )


@router.get(
    "/project/{project_id}/baseline",
    response_model=ProjectBaselineResponse,
    summary="Get a project's workflow as simulation baseline (for compare or display)",
)
def get_project_baseline_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> ProjectBaselineResponse:
    """
    Returns the project's customer_type and its tasks as SimulationTaskInput list.
    Use this to run compare scenarios against a real project's workflow.
    """
    project = (
        db.query(OnboardingProject)
        .join(Customer, OnboardingProject.customer_id == Customer.id)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == project_id, Customer.owner_id == current_user)
        .first()
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )
    customer_type, tasks = get_project_baseline(project)
    return ProjectBaselineResponse(customer_type=customer_type, tasks=tasks)


@router.post(
    "/risk/from-project/{project_id}",
    response_model=SimulationResponse,
    summary="Run a risk simulation against a persisted project's current state",
)
def simulate_risk_from_project(
    project_id: int,
    assumptions: SimulationAssumptions = Body(default_factory=SimulationAssumptions),
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> SimulationResponse:
    """
    Loads the project and all its tasks from the database, then runs the
    full v2 decision-sandbox simulation on top of their current status.

    Optionally supply assumption overrides via the request body (all
    fields have sensible defaults — an empty body is valid).

    Use this to answer: "Given where this project is right now, what
    happens if customers are consistently N days late?"
    """
    project = (
        db.query(OnboardingProject)
        .join(Customer, OnboardingProject.customer_id == Customer.id)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == project_id, Customer.owner_id == current_user)
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )

    if not project.tasks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Project {project_id} has no tasks to simulate against.",
        )

    return simulate_from_project(project, assumptions)


@router.post(
    "/risk/compare",
    response_model=SimulationCompareResponse,
    summary="Compare a baseline workflow against scenario branches (v2)",
)
def compare_branches(payload: SimulationCompareRequest) -> SimulationCompareResponse:
    """
    Run the baseline simulation plus one or more scenario branches and return
    a delta comparison summary. All branches are fully stateless — no project
    or database access is required.

    Each branch can override:
    - **assumptions_override**: swap the delay assumptions (e.g. test a
      'fast-customer' scenario with customer_delay_days=0.5).
    - **task_overrides**: replace specific tasks by title match (e.g. move
      a doc-request deadline 2 days earlier) while keeping all other tasks.

    The response includes:
    - baseline simulation result (with v2 task assessments + inbox).
    - per-branch simulation results.
    - per-branch ComparisonSummary with risk_score_delta, ttfv_delta_days,
      total_duration_delta_days, signal count delta, and top_improvements.
    - overall_recommendation pointing to the branch with the lowest risk.

    Example use-case: "Does sending the document request on day 3 instead of
    day 5 meaningfully reduce deadline risk compared to the baseline plan?"
    """
    if not payload.baseline_tasks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one baseline task is required to run a comparison.",
        )

    return run_compare(
        customer_type=payload.customer_type,
        baseline_tasks=payload.baseline_tasks,
        baseline_assumptions=payload.baseline_assumptions,
        branches=payload.branches,
    )

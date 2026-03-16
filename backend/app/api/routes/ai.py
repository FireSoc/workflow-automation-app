"""
AI-powered summary and recommendation endpoints.
Uses OpenAI gpt-4o-mini. All routes return 200 with fallback content if LLM is unavailable.
"""

from fastapi import APIRouter, HTTPException, status

from app.schemas.ai import (
    SimulationRecommendationsRequest,
    SimulationRecommendationsResponse,
)
from app.services.ai_service import (
    answer_simulation_question,
    generate_simulation_recommendations,
)
from app.services.simulation_service import run_compare, run_simulation

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/simulation/recommendations",
    response_model=SimulationRecommendationsResponse,
    summary="AI recommendations from simulation or compare result",
)
def post_simulation_recommendations(
    payload: SimulationRecommendationsRequest,
) -> SimulationRecommendationsResponse:
    """
    Provide either a precomputed result (result) or inputs to run a simulation
    (run_simulation or run_compare). Returns a short summary and 3–5 concrete
    recommendations. Optional query returns an answer (e.g. which branch is safest).
    Always returns 200; uses deterministic fallbacks if the LLM is unavailable.
    """
    if payload.result is not None:
        result = payload.result
        context_size = 0
    elif payload.run_simulation is not None:
        req = payload.run_simulation
        if not req.tasks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one task is required to run a simulation.",
            )
        result = run_simulation(
            customer_type=req.customer_type,
            tasks=req.tasks,
            assumptions=req.assumptions,
        )
        context_size = len(req.tasks)
    else:
        assert payload.run_compare is not None
        req = payload.run_compare
        if not req.baseline_tasks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one baseline task is required to run a comparison.",
            )
        result = run_compare(
            customer_type=req.customer_type,
            baseline_tasks=req.baseline_tasks,
            baseline_assumptions=req.baseline_assumptions,
            branches=req.branches,
        )
        context_size = len(req.baseline_tasks) + len(req.branches)

    summary, recommendations = generate_simulation_recommendations(
        result, context_size=context_size
    )
    answer = None
    if payload.query and payload.query.strip():
        answer = answer_simulation_question(result, payload.query.strip())

    return SimulationRecommendationsResponse(
        summary=summary,
        recommendations=recommendations,
        answer=answer,
    )

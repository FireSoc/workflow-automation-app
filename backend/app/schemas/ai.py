"""Request/response schemas for AI summary and simulation recommendation endpoints."""

from pydantic import BaseModel, Field, model_validator

from app.schemas.simulation import (
    SimulationCompareRequest,
    SimulationCompareResponse,
    SimulationRequest,
    SimulationResponse,
)


class RiskSummaryResponse(BaseModel):
    """Response for GET /projects/{id}/risk/ai-summary."""

    risk_summary: str = Field(..., description="Short actionable summary for ops manager.")


class SimulationRecommendationsResponse(BaseModel):
    """Response for POST /ai/simulation/recommendations."""

    summary: str = Field(default="", description="Brief summary of the simulation outcome.")
    recommendations: list[str] = Field(
        default_factory=list,
        description="3–5 concrete recommendations for the ops team.",
    )
    answer: str | None = Field(
        default=None,
        description="Present when query was provided; answer to the user question.",
    )


class SimulationRecommendationsRequest(BaseModel):
    """
    Request for POST /ai/simulation/recommendations.
    Provide exactly one of: result (precomputed), run_simulation, or run_compare.
    Optional query for Q&A (e.g. "Which branch is safest?").
    """

    result: SimulationResponse | SimulationCompareResponse | None = Field(
        default=None,
        description="Precomputed simulation or compare result to summarize.",
    )
    run_simulation: SimulationRequest | None = Field(
        default=None,
        description="Run a single simulation first, then generate recommendations.",
    )
    run_compare: SimulationCompareRequest | None = Field(
        default=None,
        description="Run a compare first, then generate recommendations.",
    )
    query: str | None = Field(
        default=None,
        description="Optional question about the simulation (e.g. which branch to prefer).",
    )

    @model_validator(mode="after")
    def exactly_one_source(self) -> "SimulationRecommendationsRequest":
        has_result = self.result is not None
        has_run_sim = self.run_simulation is not None
        has_run_compare = self.run_compare is not None
        if sum([has_result, has_run_sim, has_run_compare]) != 1:
            raise ValueError(
                "Provide exactly one of: result, run_simulation, or run_compare."
            )
        return self

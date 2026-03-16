"""
AI summary and simulation recommendation service.
Uses existing risk/summary/simulation data; calls OpenAI only for phrasing.
Always returns a valid response (fallback on LLM failure).
"""

import logging

from app.schemas.project import ProjectSummaryResponse, RiskRead
from app.schemas.simulation import (
    SimulationCompareResponse,
    SimulationResponse,
)
from app.services.openai_service import chat_completion, normalize_text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Risk summary (project risk + summary -> short ops analyst summary)
# ---------------------------------------------------------------------------

RISK_SYSTEM = (
    "You are an onboarding ops analyst. You are given risk and summary data and optional "
    "project/customer context. Write 2–4 short, direct, actionable sentences for an ops manager. "
    "Reference the project or customer by name when provided. Do not speculate beyond the data."
)


def _build_risk_context(
    risk: RiskRead,
    summary: ProjectSummaryResponse,
    project_context: dict | None = None,
) -> str:
    parts = []
    if project_context:
        if project_context.get("name") is not None or project_context.get("current_stage") is not None:
            name = project_context.get("name") or "(unnamed)"
            stage = project_context.get("current_stage") or "unknown"
            parts.append(f"Project: '{name}'; Stage: {stage}.")
        if project_context.get("company_name") is not None:
            company = project_context.get("company_name")
            industry = project_context.get("industry") or "unknown industry"
            parts.append(f"Customer: {company} ({industry}).")
        if project_context.get("target_go_live_date"):
            parts.append(f"Target go-live: {project_context['target_go_live_date']}.")
        blockers = project_context.get("blockers") or []
        if blockers:
            blocker_strs = [f"'{b['title']}'" + (f" ({b['reason']})" if b.get("reason") else "") for b in blockers[:5]]
            parts.append("Active blockers: " + ", ".join(blocker_strs) + ".")
    parts.extend([
        f"Risk score: {risk.risk_score}; level: {risk.risk_level.value}; flagged: {risk.risk_flag}.",
        "Explanations: " + "; ".join(risk.explanations) if risk.explanations else "No explanations.",
        f"What is complete: {summary.what_is_complete}",
        f"What is blocked: {summary.what_is_blocked}",
        f"Why risk elevated: {summary.why_risk_elevated}",
        f"What happens next: {summary.what_happens_next}",
        f"Go-live realistic: {summary.go_live_realistic}",
    ])
    return "\n".join(parts)


def generate_project_risk_summary(
    risk: RiskRead,
    summary: ProjectSummaryResponse,
    *,
    project_id: int | None = None,
    project_context: dict | None = None,
) -> str:
    """
    Produce a short AI summary from project risk and summary.
    On LLM failure, returns summary.why_risk_elevated or a generic fallback.
    """
    context = _build_risk_context(risk, summary, project_context=project_context)
    out = chat_completion(RISK_SYSTEM, context)
    if out:
        text = normalize_text(out)
        if text:
            if project_id is not None:
                logger.debug("risk_ai_summary project_id=%s len=%d", project_id, len(text))
            return text
    # Fallback: use existing summary field or generic
    fallback = (summary.why_risk_elevated or "").strip()
    if not fallback:
        fallback = "Summary unavailable."
    return fallback


# ---------------------------------------------------------------------------
# Simulation recommendations (single or compare result -> 3–5 bullets)
# ---------------------------------------------------------------------------

SIM_REC_SYSTEM = (
    "You are an onboarding ops analyst reviewing a simulation for a specific project. "
    "You are given projected timelines, per-stage breakdowns, and per-task risk assessments. "
    "Produce 3–5 concrete, named recommendations (reference specific task titles and stages "
    "where relevant). Be direct. Do not speculate beyond the data. Use clear bullets."
)


def _serialize_simulation_response(resp: SimulationResponse) -> str:
    lines = [
        f"Customer type: {resp.customer_type}; at_risk: {resp.at_risk}",
        f"Projected time-to-first-value: {resp.projected_ttfv_days:.1f} days",
        f"Projected total onboarding: {resp.projected_total_days:.1f} days",
        f"Summary: {resp.summary}",
        f"Total tasks: {resp.total_tasks}; stages: {resp.stages_simulated}",
    ]
    if resp.stage_results:
        lines.append("Stage projections:")
        for sr in resp.stage_results:
            status = "BLOCKED" if not sr.can_advance else "ok"
            lines.append(
                f"  {sr.stage.value}: {sr.projected_duration_days:.1f}d, "
                f"{sr.customer_required_tasks} customer-req tasks, [{status}]"
            )
            if sr.gate_blocked_reason:
                lines.append(f"    Gate: {sr.gate_blocked_reason}")
            if sr.blocker_tasks:
                lines.append(f"    Blockers: {', '.join(sr.blocker_tasks[:5])}")
    if resp.task_assessments:
        elevated = [t for t in resp.task_assessments if t.risk_band in ("Elevated", "Critical")]
        lines.append(f"High-risk tasks ({len(elevated)}):")
        for t in elevated[:8]:
            reasons = "; ".join(t.top_reasons[:2]) if t.top_reasons else "—"
            lines.append(f"  [{t.risk_band}] '{t.task_title}' ({t.stage.value}): {reasons}")
            lines.append(f"    Action: {t.recommended_fallback}")
    lines.append(f"Risk signals: {len(resp.risk_signals)}")
    for s in resp.risk_signals[:10]:
        lines.append(f"  - {s.rule}: {s.detail}")
    if resp.recommendations:
        lines.append("Recommendations from engine:")
        for r in resp.recommendations[:10]:
            lines.append(f"  - {r}")
    return "\n".join(lines)


def _serialize_compare_response(resp: SimulationCompareResponse) -> str:
    lines = [
        f"Customer type: {resp.customer_type}",
        f"Overall recommendation: {resp.overall_recommendation}",
        "Baseline:",
        _serialize_simulation_response(resp.baseline),
        "Branches and comparisons:",
    ]
    for comp in resp.comparisons:
        lines.append(
            f"  Branch '{comp.branch_name}': risk_score_delta={comp.risk_score_delta:.1f}, "
            f"ttfv_delta_days={comp.ttfv_delta_days:.1f}, at_risk_changed={comp.at_risk_changed}"
        )
        for imp in (comp.top_improvements or [])[:5]:
            lines.append(f"    - {imp}")
    return "\n".join(lines)


def _fallback_recommendations_from_response(resp: SimulationResponse) -> list[str]:
    recs = list(resp.recommendations or [])[:5]
    if not recs and resp.summary:
        recs = [resp.summary]
    if not recs:
        recs = ["Review simulation output and task deadlines."]
    return recs


def _fallback_recommendations_from_compare(resp: SimulationCompareResponse) -> list[str]:
    recs = [resp.overall_recommendation] if resp.overall_recommendation else []
    recs.extend(_fallback_recommendations_from_response(resp.baseline))
    return recs[:5] if recs else ["Review branch comparison and apply the recommended branch."]


def generate_simulation_recommendations(
    result: SimulationResponse | SimulationCompareResponse,
    *,
    context_size: int = 0,
) -> tuple[str, list[str]]:
    """
    From a simulation or compare result, return (summary, recommendations).
    On LLM failure, returns deterministic summary and recommendations from the result.
    """
    if isinstance(result, SimulationCompareResponse):
        context = _serialize_compare_response(result)
        fallback_summary = result.overall_recommendation or ""
        fallback_recs = _fallback_recommendations_from_compare(result)
    else:
        context = _serialize_simulation_response(result)
        fallback_summary = result.summary or ""
        fallback_recs = _fallback_recommendations_from_response(result)

    out = chat_completion(SIM_REC_SYSTEM, context)
    if out:
        text = normalize_text(out)
        if text:
            # Parse bullets into list (lines starting with - or * or numbered)
            recs: list[str] = []
            for line in text.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("- ") or line.startswith("* "):
                    recs.append(line[2:].strip())
                elif line and line[0].isdigit() and "." in line[:3]:
                    rest = line.split(".", 1)[-1].strip()
                    if rest:
                        recs.append(rest)
                elif recs or "recommend" in line.lower() or "next" in line.lower():
                    recs.append(line)
            if recs:
                if context_size:
                    logger.debug("simulation_recommendations context_len=%d recs=%d", context_size, len(recs))
                return (recs[0] if recs else fallback_summary, recs[:5])

    return (fallback_summary, fallback_recs)


SIM_QA_SYSTEM = (
    "You are an onboarding ops analyst. Answer the user's question using only the "
    "provided simulation data. Reference specific tasks, stages, or numbers from the "
    "data when answering. Keep answers to 2–4 sentences unless the question requires more."
)


def answer_simulation_question(
    result: SimulationResponse | SimulationCompareResponse,
    query: str,
) -> str:
    """
    Answer a natural-language question about the simulation/compare result.
    On LLM failure, returns overall_recommendation or first deterministic recommendation.
    """
    if isinstance(result, SimulationCompareResponse):
        context = _serialize_compare_response(result)
        fallback = result.overall_recommendation or ""
    else:
        context = _serialize_simulation_response(result)
        fallback = (result.recommendations or [result.summary or ""])[0] if (result.recommendations or result.summary) else "See simulation recommendations."
    user_msg = f"Simulation data:\n{context}\n\nQuestion: {query}"
    out = chat_completion(SIM_QA_SYSTEM, user_msg)
    if out:
        text = normalize_text(out)
        if text:
            return text
    return fallback

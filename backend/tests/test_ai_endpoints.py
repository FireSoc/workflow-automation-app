"""
Tests for AI endpoints: risk AI summary and simulation recommendations.
OpenAI is mocked so no real API calls are made.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

# Minimal SimulationResponse for "result" mode tests
def _minimal_simulation_response() -> dict:
    return {
        "customer_type": "smb",
        "total_tasks": 1,
        "stages_simulated": 1,
        "projected_ttfv_days": 2.0,
        "projected_total_days": 5.0,
        "at_risk": False,
        "risk_signals": [],
        "stage_results": [
            {
                "stage": "kickoff",
                "total_tasks": 1,
                "required_tasks": 1,
                "customer_required_tasks": 0,
                "setup_data_tasks": 0,
                "projected_duration_days": 5.0,
                "blocker_tasks": [],
                "overdue_tasks": [],
                "can_advance": True,
                "gate_blocked_reason": None,
            }
        ],
        "recommendations": ["Complete kickoff tasks on time."],
        "summary": "Low risk run.",
        "task_assessments": [],
        "inbox_preview": None,
    }


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def project_id_for_risk(client):
    """Create a customer and project; return project id for risk AI summary tests."""
    cr = client.post(
        "/customers",
        json={"company_name": "Test Co", "customer_type": "smb"},
    )
    assert cr.status_code == 201
    customer_id = cr.json()["id"]
    pr = client.post("/projects", json={"customer_id": customer_id})
    assert pr.status_code == 201
    return pr.json()["id"]


class TestRiskAiSummary:
    """GET /projects/{id}/risk/ai-summary."""

    def test_returns_generated_summary_on_success(self, client, project_id_for_risk):
        with patch(
            "app.services.ai_service.chat_completion",
            return_value="Project is on track. Complete kickoff tasks by next week.",
        ):
            r = client.get(f"/projects/{project_id_for_risk}/risk/ai-summary")
        assert r.status_code == 200
        data = r.json()
        assert "risk_summary" in data
        assert "on track" in data["risk_summary"] or "kickoff" in data["risk_summary"].lower()

    def test_returns_fallback_when_llm_fails(self, client, project_id_for_risk):
        with patch("app.services.ai_service.chat_completion", return_value=None):
            r = client.get(f"/projects/{project_id_for_risk}/risk/ai-summary")
        assert r.status_code == 200
        data = r.json()
        assert "risk_summary" in data
        assert len(data["risk_summary"]) > 0

    def test_returns_404_for_unknown_project(self, client):
        with patch("app.services.ai_service.chat_completion", return_value="x"):
            r = client.get("/projects/99999/risk/ai-summary")
        assert r.status_code == 404


class TestSimulationRecommendations:
    """POST /ai/simulation/recommendations."""

    def test_result_mode_returns_recommendations(self, client):
        with patch(
            "app.services.ai_service.chat_completion",
            return_value="- Prioritise kickoff.\n- Watch deadlines.\n- Review next week.",
        ):
            r = client.post(
                "/ai/simulation/recommendations",
                json={"result": _minimal_simulation_response()},
            )
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert "summary" in data
        assert len(data["recommendations"]) >= 1
        assert data["answer"] is None

    def test_run_simulation_mode_runs_then_returns_recommendations(self, client):
        payload = {
            "run_simulation": {
                "customer_type": "smb",
                "tasks": [
                    {
                        "title": "Test Task",
                        "stage": "kickoff",
                        "due_offset_days": 5,
                        "assumptions": {},
                    }
                ],
                "assumptions": {},
            }
        }
        with patch(
            "app.services.ai_service.chat_completion",
            return_value="- Do A.\n- Do B.\n- Do C.",
        ):
            r = client.post("/ai/simulation/recommendations", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert "summary" in data

    def test_run_compare_mode_returns_recommendations(self, client):
        payload = {
            "run_compare": {
                "customer_type": "smb",
                "baseline_tasks": [
                    {
                        "title": "Base Task",
                        "stage": "kickoff",
                        "due_offset_days": 5,
                    }
                ],
                "baseline_assumptions": {},
                "branches": [
                    {
                        "name": "fast",
                        "assumptions_override": {"customer_delay_days": 0},
                    }
                ],
            }
        }
        with patch(
            "app.services.ai_service.chat_completion",
            return_value="- Prefer fast branch.\n- Monitor risk.",
        ):
            r = client.post("/ai/simulation/recommendations", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert "summary" in data

    def test_optional_query_returns_answer(self, client):
        with patch(
            "app.services.ai_service.chat_completion",
            side_effect=[
                "- Rec one.\n- Rec two.",
                "The baseline is safest for this scenario.",
            ],
        ):
            r = client.post(
                "/ai/simulation/recommendations",
                json={
                    "result": _minimal_simulation_response(),
                    "query": "Which branch is safest?",
                },
            )
        assert r.status_code == 200
        data = r.json()
        assert "answer" in data
        assert data["answer"] is not None
        assert "safest" in data["answer"].lower() or "baseline" in data["answer"].lower()

    def test_validation_requires_exactly_one_source(self, client):
        r = client.post(
            "/ai/simulation/recommendations",
            json={},
        )
        assert r.status_code == 422
        r2 = client.post(
            "/ai/simulation/recommendations",
            json={
                "result": _minimal_simulation_response(),
                "run_simulation": {"customer_type": "smb", "tasks": [], "assumptions": {}},
            },
        )
        assert r2.status_code == 422

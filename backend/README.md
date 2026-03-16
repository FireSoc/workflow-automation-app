# Agile — Onboarding Workflow Engine (Backend)

A production-style FastAPI backend for automating customer onboarding workflows. Agile automatically creates tasks, assigns owners, tracks stage progression, sends reminder events, and flags stalled projects.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | FastAPI |
| ORM | SQLAlchemy 2.x (mapped columns) |
| Validation | Pydantic v2 |
| Database | SQLite (MVP) |
| Runtime | Python 3.12+ |

---

## Project structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app factory + router wiring
│   ├── core/
│   │   └── config.py           # App settings (env-overridable)
│   ├── db/
│   │   ├── base.py             # SQLAlchemy DeclarativeBase
│   │   └── session.py          # Engine, SessionLocal, init_db()
│   ├── models/
│   │   ├── enums.py            # All domain enums + STAGE_ORDER
│   │   ├── customer.py
│   │   ├── onboarding_project.py
│   │   ├── task.py
│   │   ├── workflow_template.py
│   │   └── workflow_event.py
│   ├── schemas/
│   │   ├── customer.py
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── workflow_event.py
│   │   └── seed.py
│   ├── services/
│   │   ├── event_service.py    # Central event logger
│   │   ├── workflow_service.py # Template selection, task gen, stage progression
│   │   ├── task_service.py     # Task completion + gate trigger
│   │   ├── reminder_service.py # Overdue detection + reminder events
│   │   ├── risk_service.py     # Risk evaluation + flagging
│   │   └── seed_service.py     # Default templates + sample data
│   └── api/
│       ├── deps.py             # DB session dependency
│       └── routes/
│           ├── customers.py
│           ├── projects.py
│           ├── tasks.py
│           └── seed.py
└── requirements.txt
```

---

## Local setup

```bash
# 1. From the backend/ directory, activate your virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the server
uvicorn app.main:app --reload
```

The SQLite database (`agile.db`) is created automatically on first startup.

Interactive API docs: http://127.0.0.1:8000/docs

---

## Seed the database

Seed default workflow templates plus two sample customers and projects:

```bash
curl -X POST http://127.0.0.1:8000/seed
```

This is **idempotent** — calling it multiple times will not duplicate data.

---

## Workflow overview

```
Customer created
    └── POST /projects (customer_id)
            ├── selects WorkflowTemplate by customer type
            ├── creates kickoff-stage tasks
            └── logs: project_created, tasks_generated

POST /tasks/{id}/complete
    ├── marks task completed
    ├── evaluates stage gate
    │       ├── pass → advances to next stage, generates new tasks
    │       │         logs: project_advanced, tasks_generated
    │       └── blocked → logs: stage_blocked
    └── if all stages done → project_completed

POST /projects/{id}/check-overdue
    └── marks overdue tasks, logs reminder events

POST /projects/{id}/check-risk
    └── evaluates risk rules, sets risk_flag + at_risk status
```

---

## API reference

### Customers

| Method | Path | Description |
|---|---|---|
| `POST` | `/customers` | Create a customer |
| `GET` | `/customers` | List all customers |
| `GET` | `/customers/{id}` | Get a single customer |

### Projects

| Method | Path | Description |
|---|---|---|
| `POST` | `/projects` | Create onboarding project for a customer |
| `GET` | `/projects` | List all projects |
| `GET` | `/projects/{id}` | Project detail with tasks and events |
| `GET` | `/projects/{id}/tasks` | All tasks for a project |
| `GET` | `/projects/{id}/events` | Workflow event log for a project |
| `POST` | `/projects/{id}/check-overdue` | Find overdue tasks and create reminder events |
| `POST` | `/projects/{id}/check-risk` | Evaluate and flag at-risk projects |

### Tasks

| Method | Path | Description |
|---|---|---|
| `POST` | `/tasks/{id}/complete` | Mark a task complete; triggers stage gate logic |

### Seed

| Method | Path | Description |
|---|---|---|
| `POST` | `/seed` | Seed templates, sample customers, and sample projects |

---

## Customer types and stages

**Customer types:** `smb`, `enterprise`

**Stage order:** `kickoff → setup → training → go_live`

### SMB workflow (lighter, faster)
- Kickoff: Kickoff Form (customer-required), Welcome Email
- Setup: Basic Setup (requires setup data), Admin Invite
- Training: Product Walkthrough
- Go-Live: Go-Live Check, Customer Sign-Off (customer-required)

### Enterprise workflow (complex, gated)
- Kickoff: Kickoff Call, Technical Discovery Questionnaire (customer-required), Executive Alignment Email
- Setup: Security Review (requires setup data), SSO/SAML Configuration, Admin Invite, Integration Setup, Data Migration Review
- Training: Admin Training Session, Team Training, Customer Training Confirmation (customer-required), Champions Enablement
- Go-Live: Go-Live Readiness Review, Hypercare Monitoring Setup, Executive Sign-Off (customer-required), Success Plan Handoff

---

## Stage gate rules

A stage will **not advance** until:
1. All `required_for_stage_completion` tasks are completed.
2. All `is_customer_required` tasks are completed (customer-owned deliverables).
3. All `requires_setup_data` tasks are completed (setup data must be present).

---

## Risk flagging rules

A project is flagged `at_risk` when **any** of the following are true:

| Rule | Threshold (configurable) |
|---|---|
| A required task overdue beyond threshold | 3 days |
| Project has had no updates (stalled) | 7 days |
| Multiple required tasks are simultaneously overdue | ≥ 2 tasks |

Thresholds can be overridden via environment variables or `.env`:

```
RISK_OVERDUE_THRESHOLD_DAYS=3
RISK_STALLED_THRESHOLD_DAYS=7
RISK_REQUIRED_OVERDUE_COUNT=2
```

---

## AI endpoints (OpenAI gpt-4o-mini)

AI summary and recommendation routes use a shared OpenAI client. Set the API key in the environment (e.g. in `.env`):

```
OPENAI_API_KEY=sk-...
```

Optional: `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_TIMEOUT_SECONDS` (default `10.0`).

**Routes:**

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/projects/{id}/risk/ai-summary` | Short AI summary for ops from project risk + summary. Always 200; fallback to `why_risk_elevated` or "Summary unavailable" if LLM fails. |
| `POST` | `/ai/simulation/recommendations` | Send either a precomputed `result` (SimulationResponse or SimulationCompareResponse) or inputs to run first (`run_simulation` or `run_compare`). Returns `summary` and `recommendations`; optional `query` returns `answer`. Always 200; fallback uses deterministic recommendations from the simulation. |

**Example — risk AI summary:**

```bash
curl http://127.0.0.1:8000/projects/1/risk/ai-summary
```

**Example — simulation recommendations (run then summarize):**

```bash
curl -X POST http://127.0.0.1:8000/ai/simulation/recommendations \
  -H "Content-Type: application/json" \
  -d '{"run_simulation":{"customer_type":"smb","tasks":[{"title":"Setup","stage":"kickoff","due_offset_days":5}],"assumptions":{}}}'
```

These endpoints are intended for internal or authenticated use; do not log full project names or PII in LLM request/response logs.

---

## Typical test flow

```bash
# 1. Seed
curl -X POST http://127.0.0.1:8000/seed

# 2. View the Enterprise project detail (id=2)
curl http://127.0.0.1:8000/projects/2

# 3. Complete a task
curl -X POST http://127.0.0.1:8000/tasks/3/complete

# 4. Check for overdue tasks
curl -X POST http://127.0.0.1:8000/projects/2/check-overdue

# 5. Evaluate risk
curl -X POST http://127.0.0.1:8000/projects/2/check-risk

# 6. View the event log
curl http://127.0.0.1:8000/projects/2/events
```

# Playbook schema and usage

Playbooks are segment-scoped onboarding blueprints. They define **default stages** and **default tasks** (task templates) used to generate onboarding projects when a deal is ingested or a project is created manually. Playbooks are **created only via the seed script** (`backend/scripts/seed_playbooks.py`); there is no public API to create playbooks.

## Purpose

- **Segment:** Each playbook targets one customer segment (`smb` or `enterprise`). Deal ingestion selects a playbook by segment and product overlap.
- **Stages:** Ordered list of onboarding stages (kickoff → setup → integration → training → go_live). Must match `OnboardingStage` values.
- **Task templates:** For each stage, the playbook defines a list of task templates. When a project enters a stage, the system creates concrete `Task` rows from these templates (with assignees and due dates resolved from the deal or project).
- **Duration rules:** Optional map of stage → expected days. Used for due-date defaults and for stage-slippage detection (e.g. "stage exceeded expected duration").

## Strict schema

All playbook creation goes through the **PlaybookCreate** Pydantic model and its nested **TaskTemplate** model. Validation is enforced in one place so that scripts (and any future AI layer) use the same contract.

### TaskTemplate (one entry in `default_tasks`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stage` | `"kickoff"` \| `"setup"` \| `"integration"` \| `"training"` \| `"go_live"` | Yes | Must match an `OnboardingStage` value. |
| `title` | string | Yes | Task title. |
| `description` | string \| null | No | Task description. |
| `assigned_to` | string \| null | No | Literal name or placeholder: `"implementation_owner"` or `"csm_owner"` (resolved at project/task generation from the deal). |
| `due_offset_days` | int \| null | No | Days from stage start for due date. If omitted, falls back to `duration_rules[stage]` or 7. |
| `dependency_ids` | list[int] \| null | No | IDs of tasks that must complete first (for future use). |
| `owner_type` | string \| null | No | e.g. `"internal"`, `"customer"`. |
| `owner_id` | string \| null | No | External owner id if needed. |
| `required_for_stage_completion` | bool | No (default true) | If true, stage gate requires this task to be completed before advancing. |
| `is_customer_required` | bool | No (default false) | If true, treated as a hard blocker until the customer completes it. |
| `requires_setup_data` | bool | No (default false) | If true, stage gate blocks until setup data is submitted. |
| `task_type` | string \| null | No | e.g. `"internal"`, `"customer"`. |

### default_stages

- Type: `list[str]`
- Must be non-empty.
- Each entry must be one of: `"kickoff"`, `"setup"`, `"integration"`, `"training"`, `"go_live"`.
- Typically mirrors the global `STAGE_ORDER` (kickoff, setup, integration, training, go_live).

### duration_rules

- Type: `dict[str, int] | null`
- Keys must be valid stage values (same as above).
- Values are expected duration in days for that stage (used for due dates and slippage detection).

### PlaybookCreate (top-level)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name (e.g. "SMB Standard"). |
| `segment` | `CustomerType` | Yes | `smb` or `enterprise`. |
| `supported_products` | list[string] | No (default []) | Products this playbook supports; used for matching on deal ingest. |
| `default_stages` | list[str] | Yes | Ordered list of stage IDs (validated). |
| `default_tasks` | list[TaskTemplate] | Yes | Task templates for one or more stages. |
| `duration_rules` | dict[str, int] \| null | No | Stage → days. |
| `branching_rules` | list \| dict \| null | No | Reserved for future use (e.g. SSO/API branching). |

## JSON examples

**Single task template:**

```json
{
  "stage": "kickoff",
  "title": "Sign contract",
  "due_offset_days": 3,
  "assigned_to": "implementation_owner",
  "required_for_stage_completion": true,
  "is_customer_required": true,
  "task_type": "customer"
}
```

**duration_rules:**

```json
{
  "kickoff": 7,
  "setup": 14,
  "integration": 14,
  "training": 7,
  "go_live": 3
}
```

## Creating playbooks

1. Run the seed script from the backend directory:
   ```bash
   cd backend && python scripts/seed_playbooks.py
   ```
   This ensures one playbook per segment (SMB, Enterprise) exists; it skips creation if a playbook for that segment is already present.

2. To add another segment or variant later: extend the `PLAYBOOKS` list in `backend/scripts/seed_playbooks.py` with another `PlaybookCreate` payload (and add a new `CustomerType` enum value if the segment is new). No API or frontend change is required.

## AI-ready design

The same `PlaybookCreate` and `TaskTemplate` models can be used later to:

- Validate AI-generated playbook JSON via `PlaybookCreate.model_validate(...)`.
- Power an internal or admin-only "suggest playbook" or "generate variant" flow that returns or applies playbook-shaped data without exposing a public create endpoint.

Validation lives in a single path (Pydantic schemas and `create_playbook_from_payload`), so any producer of playbook data (script or AI) stays consistent with what the project and task generators expect.

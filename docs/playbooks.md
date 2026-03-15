# Playbook schema and usage

Playbooks are segment-scoped onboarding blueprints. They define **default stages** and **default tasks** (task templates) used to generate onboarding projects when a deal is ingested or a project is created manually. Playbooks are **created only via the seed script** (`backend/scripts/seed_playbooks.py`); there is no public API to create playbooks.

## Purpose

- **Segment:** Each playbook is associated with one customer segment (`smb`, `mid_market`, or `enterprise`). Multiple playbooks can exist per segment (e.g. "SMB Standard" and "CRM Deal" both use segment `smb`). Deal ingestion and manual project creation select a playbook by **deterministic hard rules** (see below).
- **Stages:** Ordered list of onboarding stages (kickoff → setup → integration → training → go_live). Must match `OnboardingStage` values.
- **Task templates:** For each stage, the playbook defines a list of task templates. When a project enters a stage, the system creates concrete `Task` rows from these templates (with assignees and due dates resolved from the deal or project).
- **Duration rules:** Optional map of stage → expected days. Used for due-date defaults and for stage-slippage detection (e.g. "stage exceeded expected duration").

## Playbook selection (deterministic rules)

Selection is implemented in `backend/app/services/playbook_selection_service.py`. Rules use `segment`, `products_purchased`, `special_requirements`, and `crm_source`. **Rule order** (first match wins):

1. **Mid-market segment** → playbook **"Mid-Market Standard"**.
2. **CRM signal** (e.g. `crm_source` contains "Salesforce", "HubSpot", "Manual", or product/requirement keywords like "crm") → **"CRM Deal"** (cross-segment).
3. **Compliance signal** (`special_requirements` contains e.g. "compliance", "HIPAA", "SOC2", "GDPR", "regulated") → **"Compliance/Regulated"** (cross-segment).
4. **Segment default** → **"SMB Standard"** (smb), **"Mid-Market Standard"** (mid_market), **"Enterprise Standard"** (enterprise).

If the target playbook is missing in the DB, the service falls back to the segment default by name, then to a fixed ordered list of playbook names. Manual project creation uses the same selector with segment only (no deal payload), so it always resolves to the segment default playbook.

**Example routing:**

- Deal with `segment=smb`, `crm_source=Salesforce` → **CRM Deal**.
- Deal with `segment=enterprise`, `special_requirements=HIPAA compliance` → **Compliance/Regulated**.
- Deal with `segment=mid_market`, no special requirements → **Mid-Market Standard**.
- Deal with `segment=enterprise`, no CRM/compliance signals → **Enterprise Standard**.

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
| `segment` | `CustomerType` | Yes | `smb`, `mid_market`, or `enterprise`. |
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
   Idempotent by **playbook name**: each named playbook is created only if it does not already exist. Multiple playbooks per segment are allowed (e.g. "SMB Standard" and "CRM Deal" for segment `smb`). Seeded playbooks: **SMB Standard**, **Mid-Market Standard**, **Enterprise Standard**, **CRM Deal**, **Compliance/Regulated**.

2. To add another playbook: extend the `PLAYBOOKS` list in `backend/scripts/seed_playbooks.py` with another `PlaybookCreate` payload. If the playbook is selected by rules, update `playbook_selection_service.py` (e.g. add a new target name and rule). Add a new `CustomerType` enum value only if introducing a new segment.

## AI-ready design

The same `PlaybookCreate` and `TaskTemplate` models can be used later to:

- Validate AI-generated playbook JSON via `PlaybookCreate.model_validate(...)`.
- Power an internal or admin-only "suggest playbook" or "generate variant" flow that returns or applies playbook-shaped data without exposing a public create endpoint.

Validation lives in a single path (Pydantic schemas and `create_playbook_from_payload`), so any producer of playbook data (script or AI) stays consistent with what the project and task generators expect.

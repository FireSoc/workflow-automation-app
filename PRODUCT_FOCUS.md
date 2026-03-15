# Product Focus — Onboarding Ops Co-pilot

When adding new features or components, align with this document (see **Reference for future work** below).

**One-line:** An AI-assisted onboarding ops co-pilot that helps teams run and automate customer onboarding workflows, with clear risk, next-best actions, and a single place to see what needs attention.

---

## Who this product is for

- **Buyer:** Companies that run customer onboarding (e.g. CS / onboarding / implementation teams).
- **Their job:** Turn won deals into structured onboarding projects, move customers through stages, and avoid stalls and missed go-lives.
- **This product:** Gives them playbook-driven projects, risk and recommendations, (future) an ops inbox, and AI assistance. Deal ingestion connects their CRM so projects are created automatically when deals close.

---

## Core concepts

| Concept | Meaning |
|--------|--------|
| **Playbook** | Segment-scoped blueprint (stages + task templates). Determines what tasks exist when a project is created or advances. |
| **Project** | One onboarding journey for one customer. Has stages (kickoff → setup → integration → training → go_live), tasks, risk, and recommendations. |
| **Deal ingestion** | When a deal is closed in the customer's CRM, their system (or Zapier etc.) POSTs to our API. We create deal record, customer, project, and kickoff tasks in one step. No manual "create project" required. |
| **Risk** | Score (0–100), level, and explainable reasons (overdue, blockers, inactivity, go-live pressure). Should be kept up to date automatically. |
| **Recommendations / next-best action** | Rule-based (and later AI) suggestions: remind customer, escalate blocker, reschedule training, shift go-live, etc. |
| **Customer portal** | Read-only view for the end customer (the company being onboarded) to see their progress and next steps. |

---

## Direction (future)

- **Ops Inbox / Action queue:** One view aggregating overdue tasks, blockers, and recommendations so "what needs attention" is obvious.
- **AI:** Summarise risk, suggest next-best actions, triage the inbox, and (later) draft customer-facing messages.
- **Deal ingestion visibility:** A visible "Import deal" flow in the UI and/or clear docs + webhook/sync so something happens when their CRM sends a deal.

---

## Reference for future work

When adding features or new components, align with this document:

- **New flows/UI:** Do they help the onboarding team run workflows, see risk, or take action? Do they fit the co-pilot and (future) inbox/AI direction?
- **New APIs:** Are they for the team (internal), for the end customer (portal), or for external systems (e.g. CRM ingest)?
- **Deal ingestion:** Any new "create project" path should be consistent with playbook selection and event logging; the canonical path from CRM is `POST /crm/deals/ingest`.

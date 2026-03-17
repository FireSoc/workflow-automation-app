"""
Seed onboarding playbooks for SMB, Mid-Market, Enterprise, CRM Deal, and Compliance/Regulated.
Run from backend directory:

    cd backend && python scripts/seed_playbooks.py

Or from repo root with PYTHONPATH=backend:

    PYTHONPATH=backend python backend/scripts/seed_playbooks.py

Idempotent: creates each playbook by name only if it does not already exist.
Playbooks are also seeded automatically on backend startup; this script is for one-off use.
"""

import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.db.session import SessionLocal, init_db
from app.services.playbook_seed_service import ensure_playbooks_seeded


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        ensure_playbooks_seeded(db)
        print("Playbooks seeded (idempotent).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

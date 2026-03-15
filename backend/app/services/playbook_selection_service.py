"""Select onboarding playbook by segment, products, and special requirements."""

from sqlalchemy.orm import Session

from app.models.enums import CustomerType
from app.models.onboarding_playbook import OnboardingPlaybook


def select_playbook(
    db: Session,
    segment: CustomerType,
    products_purchased: list[str] | None = None,
    special_requirements: str | None = None,
) -> OnboardingPlaybook | None:
    """
    Select the best-matching playbook for a deal.
    Rules: match segment first; prefer playbooks whose supported_products overlap
    with products_purchased; consider special_requirements (e.g. SSO, API) for branching.
    """
    products = products_purchased or []
    query = db.query(OnboardingPlaybook).filter(OnboardingPlaybook.segment == segment)

    candidates = list(query.all())
    if not candidates:
        return None

    # Prefer playbook whose supported_products overlap with products_purchased
    if products:
        scored = []
        for p in candidates:
            supported = set(p.supported_products or [])
            overlap = len(supported & set(products))
            scored.append((overlap, p))
        scored.sort(key=lambda x: -x[0])
        if scored and scored[0][0] >= 0:
            return scored[0][1]

    # Fallback: first playbook for segment
    return candidates[0]

"""Select onboarding playbook by deterministic hard rules (segment, products, requirements, crm_source)."""

from sqlalchemy.orm import Session

from app.models.enums import CustomerType
from app.models.onboarding_playbook import OnboardingPlaybook

# Canonical playbook names (must match seed_playbooks.py).
PLAYBOOK_NAMES = {
    "SMB Standard",
    "Mid-Market Standard",
    "Enterprise Standard",
    "CRM Deal",
    "Compliance/Regulated",
}

# Segment default playbook name (used when no variant rule matches).
SEGMENT_DEFAULT_PLAYBOOK: dict[CustomerType, str] = {
    CustomerType.SMB: "SMB Standard",
    CustomerType.MID_MARKET: "Mid-Market Standard",
    CustomerType.ENTERPRISE: "Enterprise Standard",
}

# Deterministic fallback order if target playbook is missing in DB.
FALLBACK_PLAYBOOK_ORDER = [
    "SMB Standard",
    "Mid-Market Standard",
    "Enterprise Standard",
    "CRM Deal",
    "Compliance/Regulated",
]

CRM_KEYWORDS = frozenset(
    {"crm", "salesforce", "hubspot", "dynamics", "pipedrive", "zoho", "manual"}
)
COMPLIANCE_KEYWORDS = frozenset(
    {"compliance", "regulated", "hipaa", "soc2", "gdpr", "pci", "finra", "iso27001"}
)


def _normalize_text(s: str | None) -> str:
    return (s or "").lower().strip()


def _has_crm_signal(
    crm_source: str | None,
    products_purchased: list[str],
    special_requirements: str | None,
) -> bool:
    """True if deal appears CRM-led (source or product/requirement keywords)."""
    norm_source = _normalize_text(crm_source)
    if any(kw in norm_source for kw in CRM_KEYWORDS):
        return True
    norm_products = " ".join(p.lower() for p in products_purchased)
    if any(kw in norm_products for kw in CRM_KEYWORDS):
        return True
    norm_req = _normalize_text(special_requirements)
    return any(kw in norm_req for kw in CRM_KEYWORDS)


def _has_compliance_signal(special_requirements: str | None) -> bool:
    """True if special_requirements indicate compliance/regulated needs."""
    norm = _normalize_text(special_requirements)
    return any(kw in norm for kw in COMPLIANCE_KEYWORDS)


def _target_playbook_name(
    segment: CustomerType,
    products_purchased: list[str],
    special_requirements: str | None,
    crm_source: str | None,
) -> str:
    """
    Deterministic rule order to pick target playbook name.
    Order: mid_market segment -> CRM signal -> compliance signal -> segment default.
    """
    # 1) Mid-market segment uses Mid-Market Standard by default (no variant override by CRM/compliance here;
    #    we could add CRM/compliance overrides for mid_market if desired).
    if segment == CustomerType.MID_MARKET:
        return "Mid-Market Standard"

    # 2) CRM-led deal -> CRM Deal (cross-segment)
    if _has_crm_signal(crm_source, products_purchased, special_requirements):
        return "CRM Deal"

    # 3) Compliance/regulated -> Compliance/Regulated (cross-segment)
    if _has_compliance_signal(special_requirements):
        return "Compliance/Regulated"

    # 4) Segment default
    return SEGMENT_DEFAULT_PLAYBOOK.get(segment, "SMB Standard")


def _get_playbook_by_name(db: Session, name: str) -> OnboardingPlaybook | None:
    return db.query(OnboardingPlaybook).filter(OnboardingPlaybook.name == name).first()


def select_playbook(
    db: Session,
    segment: CustomerType,
    products_purchased: list[str] | None = None,
    special_requirements: str | None = None,
    crm_source: str | None = None,
) -> OnboardingPlaybook | None:
    """
    Select playbook by deterministic hard rules. Uses segment, products_purchased,
    special_requirements, and crm_source. Returns the first matching playbook
    by name; if missing, falls back to segment default then to fixed fallback order.
    """
    products = products_purchased or []
    target_name = _target_playbook_name(
        segment, products, special_requirements, crm_source
    )
    playbook = _get_playbook_by_name(db, target_name)
    if playbook:
        return playbook
    # Fallback: segment default
    default_name = SEGMENT_DEFAULT_PLAYBOOK.get(segment, "SMB Standard")
    if default_name != target_name:
        playbook = _get_playbook_by_name(db, default_name)
        if playbook:
            return playbook
    # Final fallback: first existing playbook in fixed order
    for name in FALLBACK_PLAYBOOK_ORDER:
        playbook = _get_playbook_by_name(db, name)
        if playbook:
            return playbook
    return db.query(OnboardingPlaybook).first()

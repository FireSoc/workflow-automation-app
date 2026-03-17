"""add owner_id to customers and crm_deals

Revision ID: 20250317000000
Revises: 20250316000000
Create Date: 2025-03-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250317000000"
down_revision: Union[str, None] = "20250316000000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column("owner_id", sa.UUID(), nullable=True),
    )
    op.create_index("ix_customers_owner_id", "customers", ["owner_id"], unique=False)

    op.add_column(
        "crm_deals",
        sa.Column("owner_id", sa.UUID(), nullable=True),
    )
    op.create_index("ix_crm_deals_owner_id", "crm_deals", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_crm_deals_owner_id", table_name="crm_deals")
    op.drop_column("crm_deals", "owner_id")

    op.drop_index("ix_customers_owner_id", table_name="customers")
    op.drop_column("customers", "owner_id")

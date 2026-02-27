"""add scim column to user table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-13 14:19:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column already exists before adding (idempotent migration)
    conn = op.get_bind()
    columns = [col["name"] for col in conn.execute(sa.text("PRAGMA table_info('user')")).mappings()]
    if "scim" not in columns:
        op.add_column("user", sa.Column("scim", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "scim")

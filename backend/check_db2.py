"""Verify database tables exist."""
from app.database import engine, Base
from app.models.requirement import Requirement
from app.models.work_order import WorkOrder

Base.metadata.create_all(bind=engine)

import sqlalchemy
insp = sqlalchemy.inspect(engine)
tables = insp.get_table_names()
print("Tables:", tables)

for t in tables:
    cols = insp.get_columns(t)
    for c in cols:
        print(f"  {c['name']:20} {str(c['type']):30}")

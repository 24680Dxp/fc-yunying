"""Quick verification script for backend."""
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

import sqlalchemy

insp = sqlalchemy.inspect(engine)
tables = insp.get_table_names()
print("Tables created:", tables)

for t in tables:
    cols = insp.get_columns(t)
    print(f"\n  {t}:")
    for c in cols:
        print(f"    {c['name']:20} {str(c['type']):30} nullable={c['nullable']}")

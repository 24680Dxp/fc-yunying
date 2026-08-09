"""SQLite → PostgreSQL 数据迁移脚本

用法（在服务器 /usr/share/tengine/html/backend 执行）：
    DATABASE_URL=postgresql://fcadmin:fc123456@127.0.0.1/fc_yunying \
    /usr/bin/python3.8 migrate_to_pg.py
"""

import os
import sys

import sqlalchemy as sa

# ---------- 连接 ----------
SQLITE_URL = "sqlite:///./operation.db"
PG_URL = os.getenv("DATABASE_URL")
if not PG_URL:
    print("ERROR: 请设置 DATABASE_URL 环境变量")
    print("示例: DATABASE_URL=postgresql://fcadmin:fc123456@127.0.0.1/fc_yunying")
    sys.exit(1)

sqlite_engine = sa.create_engine(SQLITE_URL)
pg_engine = sa.create_engine(PG_URL)

# ---------- 获取所有表名 ----------
insp = sa.inspect(sqlite_engine)
table_names = insp.get_table_names()
print(f"SQLite 表: {table_names}")

# ---------- 在 PG 中建表 ----------
from app.database import Base
Base.metadata.create_all(bind=pg_engine)
print("PostgreSQL 表已创建")

# ---------- 逐表迁移 ----------
# ---------- 只迁移项目数据表（排除 agent 等无关表） ----------
PROJECT_TABLES = {"users", "work_orders", "requirements", "historical_work_orders"}

with sqlite_engine.connect() as src, pg_engine.connect() as dst:
    for table_name in table_names:
        if table_name not in PROJECT_TABLES:
            print(f"  {table_name}: 非项目表，跳过")
            continue

        # 检查 PG 中是否已有数据
        cnt = dst.execute(sa.text(f"SELECT COUNT(*) FROM \"{table_name}\"")).scalar()
        if cnt > 0:
            print(f"  {table_name}: 已有 {cnt} 条，跳过")
            continue

        # 读取 SQLite 数据
        rows = src.execute(sa.text(f"SELECT * FROM \"{table_name}\"")).fetchall()
        if not rows:
            print(f"  {table_name}: 0 条，跳过")
            continue

        columns = rows[0]._fields
        for row in rows:
            data = dict(zip(columns, row))
            dst.execute(sa.text(
                f"INSERT INTO \"{table_name}\" ({', '.join(columns)}) "
                f"VALUES ({', '.join(':' + c for c in columns)})"
            ), data)

        dst.commit()
        print(f"  {table_name}: 迁移 {len(rows)} 条")

print("\n迁移完成!")

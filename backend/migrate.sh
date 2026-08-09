#!/bin/bash
# 在服务器上执行：bash /tmp/migrate.sh
cd /usr/share/tengine/html/backend
export DATABASE_URL=postgresql://fcadmin:***@127.0.0.1/fc_yunying
/usr/bin/python3.8 migrate_to_pg.py

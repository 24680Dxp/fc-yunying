from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, requirements, work_orders, statistics
from app.database import Base, engine
from app.models.user import User
from app.auth import hash_password

# Create all tables on startup
Base.metadata.create_all(bind=engine)

# 初始化管理员账号（如果不存在）
from app.database import SessionLocal
db = SessionLocal()
if not db.query(User).filter(User.username == "admin").first():
    admin = User(
        username="admin",
        hashed_password=hash_password("admin123"),
        display_name="管理员",
        role="admin",
    )
    db.add(admin)
    db.commit()
if not db.query(User).filter(User.username == "user").first():
    normal = User(
        username="user",
        hashed_password=hash_password("user123"),
        display_name="普通用户",
        role="user",
    )
    db.add(normal)
    db.commit()
db.close()

app = FastAPI(title="FC项目交互支撑系统", version="1.0.0", docs_url="/docs")

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(requirements.router)
app.include_router(work_orders.router)
app.include_router(statistics.router)


@app.get("/")
def root():
    return {"message": "FC项目交互支撑系统 API", "version": "1.0.0"}

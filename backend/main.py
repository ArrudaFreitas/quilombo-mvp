import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from db import init_db
from routes.public import router as public_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

app = FastAPI(title="Quilombo.org API", version="0.1.0")

# Sem CORSMiddleware: tudo é servido na mesma origem via nginx (Host carrega o tenant).

app.include_router(public_router)
app.include_router(auth_router)
app.include_router(admin_router)

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}

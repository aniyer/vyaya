"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import init_db, SessionLocal
from .models import Category, DEFAULT_CATEGORIES
from .routers import receipts, dashboard

settings = get_settings()


def seed_categories():
    """Seed default categories if they don't exist."""
    db = SessionLocal()
    try:
        existing = db.query(Category).count()
        if existing == 0:
            for cat_data in DEFAULT_CATEGORIES:
                category = Category(**cat_data)
                db.add(category)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    init_db()
    seed_categories()
    
    # Ensure receipts directory exists
    settings.receipts_dir.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown (cleanup if needed)


app = FastAPI(
    title=settings.app_name,
    description="Self-hosted receipt management and expense tracking",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(receipts.router)
app.include_router(dashboard.router)

# Mount static files for receipt images
app.mount(
    "/static/receipts",
    StaticFiles(directory=str(settings.receipts_dir)),
    name="receipts",
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "app": settings.app_name,
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "ok"}

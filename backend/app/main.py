from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, todos, tags
from app.core.redis import redis_client
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.initialize()
    yield
    # Shutdown
    await redis_client.close()
    await engine.dispose()


app = FastAPI(
    title="Fabbi Todo API",
    description="JWT Authentication + CRUD Todo List API",
    version="1.0.0",
    lifespan=lifespan,
)

# BUG-12 FIX: Cannot use allow_origins=["*"] together with allow_credentials=True
# per the CORS spec — browsers will block such requests. Use explicit origins instead.
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Frontend dev server
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(todos.router, prefix="/api/v1/todos", tags=["Todos"])
app.include_router(tags.router, prefix="/api/v1/tags", tags=["Tags"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

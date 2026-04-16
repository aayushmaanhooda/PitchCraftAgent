import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add src/ to path so sibling packages (pipeline, etc.) are importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.db import create_db_and_tables
from routers import auth, agent


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

v1 = APIRouter(prefix="/v1")
v1.include_router(auth.router)
v1.include_router(agent.router)

app.include_router(v1)


@app.get("/")
def root():
    return {"message": "I am PitchCraft.ai root"}


@app.get("/health")
def health_check():
    return {
        "message": "Health i ok",
        "server": "fastapi cloud is running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="localhost", port=8000, reload=True)

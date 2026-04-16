from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Anchor the .env path to this file's location so it resolves the same way
# regardless of the CWD Python was launched from.
# config.py -> parents[3] = backend/ (where .env lives)
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
    )
    HF_TOKEN: str
    GEMINI_API_KEY: str
    OPENAI_API_KEY: str
    CLAUDE_API_KEY: str
    TAVILY_API_KEY: str
    NEON_CONNECTION_STRING: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_SECURE: bool = False  # dev default; set True in prod
    COOKIE_NAME: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str 
    FRONTEND_URL: str 
    LLM_CACHE_DIR: str = "/llm-cache"
    MODEL_ID: str = "black-forest-labs/FLUX.1-dev"
    FLUX_CACHE_DIR: str = "/model-cache"
    MODAL_LLM_APP_NAME: str = "vllm-gemma"
    MODAL_FLUX_APP_NAME: str = "pptx-image-pipeline"


    # tracing
    LANGSMITH_TRACING: bool = True
    LANGSMITH_ENDPOINT:str = "https://api.smith.langchain.com"
    LANGSMITH_API_KEY: str
    LANGSMITH_PROJECT:str = "pitchCraft"

@lru_cache()
def get_settings():
    return Settings()
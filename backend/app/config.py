from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_ROAST_MODEL: str = "gpt-4o-mini"
    DB_URL: str = "sqlite:///./quant.db"
    DATA_CACHE_DIR: str = "./data_cache"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"

    @property
    def cache_dir(self) -> Path:
        p = Path(self.DATA_CACHE_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

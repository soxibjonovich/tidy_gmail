from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    GOOGLE_CLIENT_ID: str
    GOOGLE_SECRET: str
    DATABASE_URL: str
    FERNET_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str

    model_config = SettingsConfigDict(env_file=ENV_FILE)


settings = Settings()

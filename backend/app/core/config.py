from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SentinelOps"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    SQLITE_DB_PATH: str = "sqlite.db"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"sqlite+aiosqlite:///./{self.SQLITE_DB_PATH}"

    # Groq
    GROQ_API_KEY: str = ""

    # Security
    SECRET_KEY: str = "dev-secret-key-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

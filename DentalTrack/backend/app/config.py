from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://dentaltrack:dentaltrack_secret@db:5432/dentaltrack"
    PDF_OUTPUT_DIR: str = "/app/reports"

    class Config:
        env_file = ".env"


settings = Settings()

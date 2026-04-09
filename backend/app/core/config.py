"""Application configuration for the backend scaffold."""

from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    app_name: str
    api_host: str
    api_port: int
    api_version: str
    neo4j_uri: str | None
    neo4j_username: str | None
    neo4j_password: str | None
    gemini_api_key: str | None
    ws_path: str
    product_language: str
    phase: str


settings = Settings(
    app_name=os.getenv("APP_NAME", "Jarvis Nebula"),
    api_host=os.getenv("API_HOST", "127.0.0.1"),
    api_port=int(os.getenv("API_PORT", "8000")),
    api_version="0.3.0",
    neo4j_uri=os.getenv("NEO4J_URI"),
    neo4j_username=os.getenv("NEO4J_USERNAME"),
    neo4j_password=os.getenv("NEO4J_PASSWORD"),
    gemini_api_key=os.getenv("GEMINI_API_KEY"),
    ws_path="/ws",
    product_language="en",
    phase="phase6_voice_commands",
)

from pathlib import Path

from dotenv import set_key
from pydantic_settings import BaseSettings

ENV_PATH = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    device_id: str = ""
    device_ip: str = ""
    local_key: str = ""
    poll_interval: int = 5
    mock_device: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


class SettingsHolder:
    def __init__(self):
        self.settings = Settings()

    def reload(self, **kwargs):
        self.settings = Settings(**kwargs)


def write_env(values: dict) -> None:
    for key, value in values.items():
        set_key(str(ENV_PATH), key.upper(), str(value))


settings_holder = SettingsHolder()

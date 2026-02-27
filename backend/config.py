from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    device_id: str = ""
    device_ip: str = ""
    local_key: str = ""
    poll_interval: int = 5
    mock_device: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

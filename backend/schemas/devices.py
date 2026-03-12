from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    name: str
    device_type: str = "dehumidifier"
    device_id: str = ""
    device_ip: str = ""
    local_key: str = ""
    poll_interval: int = Field(default=5, ge=1, le=300)
    is_mock: bool = True
    room_id: int | None = None


class DeviceUpdate(BaseModel):
    name: str | None = None
    device_id: str | None = None
    device_ip: str | None = None
    local_key: str | None = None
    poll_interval: int | None = Field(default=None, ge=1, le=300)
    is_mock: bool | None = None
    room_id: int | None = None
    enabled: bool | None = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    device_type: str
    device_id: str
    device_ip: str
    poll_interval: int
    is_mock: bool
    room_id: int | None
    enabled: bool

    model_config = {"from_attributes": True}


class CommandRequest(BaseModel):
    command: str
    args: dict = Field(default_factory=dict)

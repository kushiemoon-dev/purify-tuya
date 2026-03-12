from pydantic import BaseModel, Field


class AutomationCreate(BaseModel):
    name: str
    trigger_type: str  # "threshold" | "schedule"
    trigger_config: dict = Field(default_factory=dict)
    action_type: str  # "device_command"
    action_config: dict = Field(default_factory=dict)
    cooldown: int = Field(default=300, ge=0)
    enabled: bool = True


class AutomationUpdate(BaseModel):
    name: str | None = None
    trigger_type: str | None = None
    trigger_config: dict | None = None
    action_type: str | None = None
    action_config: dict | None = None
    cooldown: int | None = Field(default=None, ge=0)
    enabled: bool | None = None


class AutomationResponse(BaseModel):
    id: int
    name: str
    trigger_type: str
    trigger_config: dict
    action_type: str
    action_config: dict
    cooldown: int
    enabled: bool

    model_config = {"from_attributes": True}

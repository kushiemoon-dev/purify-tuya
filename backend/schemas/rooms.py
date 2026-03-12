from pydantic import BaseModel


class RoomCreate(BaseModel):
    name: str
    icon: str = "home"
    sort_order: int = 0


class RoomUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    sort_order: int | None = None


class RoomResponse(BaseModel):
    id: int
    name: str
    icon: str
    sort_order: int

    model_config = {"from_attributes": True}

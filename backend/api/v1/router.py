from fastapi import APIRouter

from api.v1.automations import router as automations_router
from api.v1.devices import router as devices_router
from api.v1.history import router as history_router
from api.v1.notifications import router as notifications_router
from api.v1.rooms import router as rooms_router

v1_router = APIRouter(prefix="/purify/api/v1")
v1_router.include_router(devices_router)
v1_router.include_router(rooms_router)
v1_router.include_router(history_router)
v1_router.include_router(automations_router)
v1_router.include_router(notifications_router)

import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="home")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    devices: Mapped[list["DeviceModel"]] = relationship(back_populates="room")


class DeviceModel(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="dehumidifier"
    )
    device_id: Mapped[str] = mapped_column(String(100), default="")
    device_ip: Mapped[str] = mapped_column(String(50), default="")
    local_key: Mapped[str] = mapped_column(String(100), default="")
    poll_interval: Mapped[int] = mapped_column(Integer, default=5)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    room: Mapped[Room | None] = relationship(back_populates="devices")
    readings: Mapped[list["Reading"]] = relationship(back_populates="device")


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    metric: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    device: Mapped[DeviceModel] = relationship(back_populates="readings")

    __table_args__ = (
        Index("ix_readings_device_metric_ts", "device_id", "metric", "timestamp"),
    )


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_config: Mapped[str] = mapped_column(Text, default="{}")
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action_config: Mapped[str] = mapped_column(Text, default="{}")
    cooldown: Mapped[int] = mapped_column(Integer, default=300)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id"), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

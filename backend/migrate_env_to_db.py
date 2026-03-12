"""One-time migration: creates a DB device record from the .env single-device config.

Run AFTER 'alembic upgrade head' has created the tables.
"""

import asyncio

from sqlalchemy import select

from config import settings_holder
from db.engine import async_session
from db.models import DeviceModel


async def migrate():
    s = settings_holder.settings

    async with async_session() as session:
        # Check if devices already exist
        result = await session.execute(select(DeviceModel))
        if result.scalars().first() is not None:
            print("Database already has devices — skipping migration.")
            return

        device = DeviceModel(
            name="Dehumidifier" if not s.mock_device else "Mock Dehumidifier",
            device_type="dehumidifier",
            device_id=s.device_id,
            device_ip=s.device_ip,
            local_key=s.local_key,
            poll_interval=s.poll_interval,
            is_mock=s.mock_device,
        )
        session.add(device)
        await session.commit()
        print(f"Migrated .env device to DB as id={device.id} ({device.name})")


if __name__ == "__main__":
    asyncio.run(migrate())

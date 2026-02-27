<div align="center">

# Purify

### Local control for your Meaco dehumidifier — no cloud required

[![License](https://img.shields.io/github/license/kushiemoon-dev/purify-tuya?style=flat-square&color=gray)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
![Linux](https://img.shields.io/badge/Linux-any-FCC624?style=flat-square&logo=linux&logoColor=black)

</div>

---

## Overview

**Purify** is a PWA for controlling a Meaco MeacoDry Arete Two 10L dehumidifier/air purifier over your local network via the Tuya protocol. No cloud account, no internet dependency — just direct LAN communication with your device.

---

## Features

- **Real-time WebSocket** — Live device state pushed to all connected clients
- **SVG Humidity Gauge** — Animated radial gauge showing current humidity
- **Humidity History** — Rolling chart of the last 60 readings
- **Mode Control** — Manual, Laundry, Sleep, and Purify modes
- **Timer & On-Timer** — Off-timer (1–24h) and scheduled on-timer
- **Child Lock** — Toggle child lock remotely
- **Tank & Defrost Status** — Visual indicators for tank-full and defrosting states
- **Glass-morphism UI** — Frosted-glass design built with Alpine.js
- **PWA Offline** — Installable as a Progressive Web App
- **Mock Mode** — Develop and demo without a real device
- **DPS Discovery** — Logs unknown Tuya data points for reverse engineering

---

## Install

```bash
git clone https://github.com/kushiemoon-dev/purify-tuya.git
cd purify-tuya/backend

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure your device (see Configuration below)
cp .env.example .env

uvicorn main:app --host 127.0.0.1 --port 8000
```

Open **http://localhost:8000/purify/** in your browser.

---

## Configuration

All settings are read from environment variables or a `.env` file in `backend/`.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEVICE_ID` | _(required)_ | Tuya device ID |
| `DEVICE_IP` | _(required)_ | Device IP on your LAN |
| `LOCAL_KEY` | _(required)_ | Tuya local encryption key |
| `POLL_INTERVAL` | `5` | Seconds between device polls |
| `MOCK_DEVICE` | `true` | Use simulated device (no hardware needed) |

To obtain your Tuya credentials, follow the [tinytuya setup guide](https://github.com/jasonacox/tinytuya#setup).

---

## How It Works

```
Browser (PWA)
     │
     ▼
  FastAPI
  /purify/*
     │
     ├── REST API ──► Device commands (power, mode, humidity, timers)
     │
     └── WebSocket ──► Real-time state broadcast
            │
            ▼
      tinytuya (LAN)
            │
            ▼
    Meaco Dehumidifier
    (Tuya protocol v3.3)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/purify/api/state` | Current device state |
| `GET` | `/purify/api/raw-dps` | Raw Tuya data points |
| `GET` | `/purify/api/humidity-history` | Last 60 humidity readings |
| `POST` | `/purify/api/power` | `{"on": true}` — Toggle power |
| `POST` | `/purify/api/humidity` | `{"value": 50}` — Set target (35–70, multiples of 5) |
| `POST` | `/purify/api/mode` | `{"mode": "manual"}` — Set mode |
| `POST` | `/purify/api/child-lock` | `{"on": true}` — Toggle child lock |
| `POST` | `/purify/api/timer` | `{"hours": "3h"}` — Set off-timer |
| `POST` | `/purify/api/on-timer` | `{"hours": "8h"}` — Set on-timer |
| `WS` | `/purify/ws` | Live state updates via WebSocket |

---

## Deployment

### systemd

```bash
sudo cp purify.service /etc/systemd/system/
sudo systemctl enable --now purify
```

### Apache Reverse Proxy

```bash
sudo cp deploy/purify-apache.conf /etc/httpd/conf/conf.d/purify.conf
sudo systemctl reload httpd
```

Requires `mod_proxy`, `mod_proxy_http`, and `mod_proxy_wstunnel`.

---

## Credits

- [tinytuya](https://github.com/jasonacox/tinytuya) — Local Tuya device communication
- [FastAPI](https://fastapi.tiangolo.com) — Python web framework
- [Alpine.js](https://alpinejs.dev) — Lightweight reactive UI

---

## Disclaimer

Purify is not affiliated with, endorsed by, or connected to Meaco, Tuya, or any device manufacturer. Use at your own risk.

---

<div align="center">

**MIT License** · [Releases](https://github.com/kushiemoon-dev/purify-tuya/releases) · [Issues](https://github.com/kushiemoon-dev/purify-tuya/issues)

</div>

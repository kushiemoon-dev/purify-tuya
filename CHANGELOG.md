# Changelog

## v2.1.0 (2026-06-18)

### Changed
- Completed the cutover to the multi-device React frontend: the old single-device Alpine.js PWA backend (`device.py`, `models.py`, `routes.py`, `config.py`) was removed, and the README rewritten to document the new dashboard, driver plugin architecture, automations, rooms, notifications, and history/charts. The legacy single-device v0 API is preserved for backward compatibility.

## v2.0.0 (2026-03-12)

### Features
- Initial public release of Purify: a self-hosted PWA for controlling a Tuya-based dehumidifier/air purifier over the local network.
- Settings UI, PWA offline fix, and general UX improvements.
- French/English/German internationalisation toggle.
- Multi-device architecture and React frontend work started, alongside a test suite and CI pipeline (completed in v2.1.0).

### Internal
- README, tests, CI/CD, and LICENSE added for the public release.
- Lint errors and CI coverage paths fixed.

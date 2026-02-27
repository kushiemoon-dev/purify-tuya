const SETTINGS_URL = '/purify/api/settings'

async function fetchSettings() {
  const response = await fetch(SETTINGS_URL)
  if (!response.ok) {
    throw new Error('Failed to load settings')
  }
  return response.json()
}

async function postSettings(data) {
  const response = await fetch(SETTINGS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to save settings')
  }
  return response.json()
}

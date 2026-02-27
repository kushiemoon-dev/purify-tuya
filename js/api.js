const API_BASE = '/purify/api'

async function sendCommand(endpoint, body) {
  const response = await fetch(API_BASE + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Command failed')
  }
  return response.json()
}

function setPower(on) {
  return sendCommand('/power', { on })
}

function setHumidity(value) {
  return sendCommand('/humidity', { value: parseInt(value, 10) })
}

function setMode(mode) {
  return sendCommand('/mode', { mode })
}

function setChildLock(on) {
  return sendCommand('/child-lock', { on })
}

function setTimer(hours) {
  return sendCommand('/timer', { hours })
}

function setOnTimer(hours) {
  return sendCommand('/on-timer', { hours })
}

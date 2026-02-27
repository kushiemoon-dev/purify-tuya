function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = protocol + '//' + location.host + '/purify/ws'
  let retryDelay = 1000
  let ws = null

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      retryDelay = 1000
      Alpine.store('device').setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        Alpine.store('device').update(data)
      } catch (_) {}
    }

    ws.onclose = () => {
      Alpine.store('device').setConnected(false)
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  connect()
}

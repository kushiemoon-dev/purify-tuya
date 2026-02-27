document.addEventListener('alpine:init', () => {
  Alpine.store('device', {
    connected: false,
    state: JSON.parse(localStorage.getItem('purify_state') || 'null'),
    lastUpdated: null,

    update(newState) {
      this.state = newState
      this.lastUpdated = Date.now()
      localStorage.setItem('purify_state', JSON.stringify(newState))
    },

    setConnected(value) {
      this.connected = value
    },
  })
})

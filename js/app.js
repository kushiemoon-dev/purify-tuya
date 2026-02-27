document.addEventListener('alpine:init', () => {
  Alpine.data('purifyApp', () => ({
    sending: false,
    error: null,

    get s() {
      return Alpine.store('device').state
    },

    get connected() {
      return Alpine.store('device').connected
    },

    get faultAlerts() {
      if (!this.s) return []
      const alerts = []
      if (this.s.tank_full) alerts.push({ type: 'error', message: 'Reservoir plein' })
      if (this.s.defrosting) alerts.push({ type: 'warning', message: 'Degivrage en cours' })
      return alerts
    },

    async send(fn) {
      this.sending = true
      this.error = null
      try {
        await fn()
      } catch (e) {
        this.error = e.message
        setTimeout(() => { this.error = null }, 3000)
      } finally {
        this.sending = false
      }
    },

    togglePower() {
      if (!this.s) return
      this.send(() => setPower(!this.s.switch))
    },

    changeHumidity(event) {
      const value = parseInt(event.target.value, 10)
      this.send(() => setHumidity(value))
    },

    changeMode(event) {
      this.send(() => setMode(event.target.value))
    },

    toggleChildLock() {
      if (!this.s) return
      this.send(() => setChildLock(!this.s.child_lock))
    },

    changeTimer(event) {
      this.send(() => setTimer(event.target.value))
    },

    changeOnTimer(event) {
      this.send(() => setOnTimer(event.target.value))
    },

    snapHumidity(event) {
      const input = event.target
      const value = Math.round(parseInt(input.value, 10) / 5) * 5
      input.value = value
    },
  }))
})

document.addEventListener('alpine:initialized', () => {
  connectWebSocket()
})

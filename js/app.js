document.addEventListener('alpine:init', () => {
  Alpine.data('purifyApp', () => ({
    pending: {},
    error: null,
    _now: Date.now(),
    _ticker: null,
    settingsOpen: false,
    settingsForm: null,
    settingsLoading: false,
    settingsError: null,
    settingsSuccess: false,

    init() {
      this._ticker = setInterval(() => { this._now = Date.now() }, 5000)
    },

    destroy() {
      if (this._ticker) clearInterval(this._ticker)
    },

    get s() {
      return Alpine.store('device').state
    },

    get connected() {
      return Alpine.store('device').connected
    },

    get humidityHistory() {
      return Alpine.store('device').humidityHistory
    },

    get lastUpdatedText() {
      const lu = Alpine.store('device').lastUpdated
      if (!lu) return ''
      const t = Alpine.store('i18n').t.bind(Alpine.store('i18n'))
      const diff = Math.floor((this._now - lu) / 1000)
      if (diff < 10) return t('time.now')
      if (diff < 60) return t('time.seconds', { n: diff })
      const mins = Math.floor(diff / 60)
      return t('time.minutes', { n: mins })
    },

    _sparklineCoords() {
      const h = this.humidityHistory
      if (h.length < 2) return null
      const w = 300, ht = 40, pad = 2
      const vals = h.map(p => p.v)
      const min = vals.reduce((a, b) => Math.min(a, b), Infinity) - 2
      const max = vals.reduce((a, b) => Math.max(a, b), -Infinity) + 2
      const range = max - min || 1
      return h.map((p, i) => {
        const x = (i / (h.length - 1)) * w
        const y = ht - pad - ((p.v - min) / range) * (ht - pad * 2)
        return x.toFixed(1) + ',' + y.toFixed(1)
      })
    },

    get sparklinePoints() {
      const coords = this._sparklineCoords()
      return coords ? coords.join(' ') : ''
    },

    get sparklineArea() {
      const coords = this._sparklineCoords()
      if (!coords) return ''
      return '0,40 ' + coords.join(' ') + ' 300,40'
    },

    get faultAlerts() {
      if (!this.s) return []
      const t = Alpine.store('i18n').t.bind(Alpine.store('i18n'))
      const alerts = []
      if (this.s.tank_full) alerts.push({ type: 'error', message: t('alert.tankFull') })
      if (this.s.defrosting) alerts.push({ type: 'warning', message: t('alert.defrosting') })
      return alerts
    },

    isPending(key) {
      return !!this.pending[key]
    },

    async send(key, fn, patch) {
      if (this.pending[key]) return
      this.pending = { ...this.pending, [key]: true }
      this.error = null
      const store = Alpine.store('device')
      if (patch) store.optimisticUpdate(patch)
      try {
        await fn()
      } catch (e) {
        if (patch) store.rollback()
        this.error = e.message
        setTimeout(() => { this.error = null }, 3000)
      } finally {
        const { [key]: _, ...rest } = this.pending
        this.pending = rest
      }
    },

    togglePower() {
      if (!this.s) return
      const next = !this.s.switch
      this.send('power', () => setPower(next), { switch: next })
    },

    changeHumidity(event) {
      const value = parseInt(event.target.value, 10)
      this.send('humidity', () => setHumidity(value), { humidity_set: value })
    },

    changeMode(mode) {
      this.send('mode', () => setMode(mode), { mode })
    },

    toggleChildLock() {
      if (!this.s) return
      const next = !this.s.child_lock
      this.send('child_lock', () => setChildLock(next), { child_lock: next })
    },

    changeTimer(hours) {
      this.send('timer', () => setTimer(hours), { countdown_set: hours })
    },

    changeOnTimer(hours) {
      this.send('on_timer', () => setOnTimer(hours), { on_timer: hours })
    },

    snapHumidity(event) {
      const input = event.target
      const value = Math.round(parseInt(input.value, 10) / 5) * 5
      input.value = value
    },

    async openSettings() {
      this.settingsOpen = true
      this.settingsError = null
      this.settingsSuccess = false
      this.settingsLoading = true
      try {
        this.settingsForm = await fetchSettings()
        this.settingsForm.local_key = ''
      } catch (e) {
        this.settingsError = e.message
      } finally {
        this.settingsLoading = false
      }
    },

    closeSettings() {
      this.settingsOpen = false
      this.settingsForm = null
      this.settingsError = null
      this.settingsSuccess = false
    },

    async saveSettings() {
      if (!this.settingsForm) return
      this.settingsLoading = true
      this.settingsError = null
      this.settingsSuccess = false
      try {
        await postSettings(this.settingsForm)
        this.settingsSuccess = true
        setTimeout(() => { this.settingsSuccess = false }, 3000)
      } catch (e) {
        this.settingsError = e.message
      } finally {
        this.settingsLoading = false
      }
    },
  }))
})

document.addEventListener('alpine:initialized', () => {
  connectWebSocket()
})

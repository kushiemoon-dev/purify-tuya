document.addEventListener('alpine:init', () => {
  Alpine.store('device', {
    connected: false,
    state: JSON.parse(localStorage.getItem('purify_state') || 'null'),
    humidityHistory: [],
    lastUpdated: null,
    _rollbackState: null,

    update(newState) {
      this._rollbackState = null
      if (Array.isArray(newState.humidity_history)) {
        this.humidityHistory = newState.humidity_history
      }
      const { humidity_history: _, ...stateOnly } = newState
      this.state = stateOnly
      this.lastUpdated = Date.now()
      localStorage.setItem('purify_state', JSON.stringify(stateOnly))
    },

    optimisticUpdate(patch) {
      if (!this.state) return
      this._rollbackState = { ...this.state }
      this.state = { ...this.state, ...patch }
    },

    rollback() {
      if (this._rollbackState) {
        this.state = this._rollbackState
        this._rollbackState = null
      }
    },

    setConnected(value) {
      this.connected = value
    },
  })

  Alpine.store('theme', {
    // null = OS default, 'dark', 'light'
    current: localStorage.getItem('purify_theme') || null,

    init() {
      this._apply()
    },

    cycle() {
      if (this.current === null) {
        this.current = 'dark'
      } else if (this.current === 'dark') {
        this.current = 'light'
      } else {
        this.current = null
      }
      if (this.current === null) {
        localStorage.removeItem('purify_theme')
      } else {
        localStorage.setItem('purify_theme', this.current)
      }
      this._apply()
    },

    _apply() {
      if (this.current) {
        document.documentElement.setAttribute('data-theme', this.current)
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    },
  })
})

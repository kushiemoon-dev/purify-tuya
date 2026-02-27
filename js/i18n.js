document.addEventListener('alpine:init', () => {
  const translations = {
    fr: {
      status: { on: 'En marche', off: 'Eteint', connected: 'Connecte', disconnected: 'Deconnecte' },
      offline: { banner: 'Connexion perdue \u2014 reconnexion...' },
      loading: "En attente de l'appareil...",
      gauge: { label: 'Humidite' },
      humidity: { target: 'Humidite cible' },
      mode: { label: 'Mode', manual: 'Manuel', laundry: 'Linge', sleep: 'Nuit', purify: 'Purif.' },
      timer: { off: 'Minuterie arret', on: 'Minuterie allumage' },
      childLock: 'Verrouillage enfant',
      time: { now: 'Maintenant', seconds: 'Il y a {n}s', minutes: 'Il y a {n}min' },
      alert: { tankFull: 'Reservoir plein', defrosting: 'Degivrage en cours' },
      settings: {
        title: 'Parametres',
        keyPlaceholder: 'Laisser vide pour garder la cle actuelle',
        polling: 'Intervalle de sondage (secondes)',
        mock: 'Mode simulation',
        saving: 'Enregistrement...',
        save: 'Enregistrer',
        saved: 'Parametres enregistres',
      },
    },
    en: {
      status: { on: 'Running', off: 'Off', connected: 'Connected', disconnected: 'Disconnected' },
      offline: { banner: 'Connection lost \u2014 reconnecting...' },
      loading: 'Waiting for device...',
      gauge: { label: 'Humidity' },
      humidity: { target: 'Target humidity' },
      mode: { label: 'Mode', manual: 'Manual', laundry: 'Laundry', sleep: 'Sleep', purify: 'Purify' },
      timer: { off: 'Off timer', on: 'On timer' },
      childLock: 'Child lock',
      time: { now: 'Now', seconds: '{n}s ago', minutes: '{n}min ago' },
      alert: { tankFull: 'Tank full', defrosting: 'Defrosting' },
      settings: {
        title: 'Settings',
        keyPlaceholder: 'Leave empty to keep current key',
        polling: 'Polling interval (seconds)',
        mock: 'Simulation mode',
        saving: 'Saving...',
        save: 'Save',
        saved: 'Settings saved',
      },
    },
    de: {
      status: { on: 'Läuft', off: 'Aus', connected: 'Verbunden', disconnected: 'Getrennt' },
      offline: { banner: 'Verbindung verloren \u2014 Neuverbindung...' },
      loading: 'Warte auf Gerät...',
      gauge: { label: 'Feuchtigkeit' },
      humidity: { target: 'Ziel-Feuchtigkeit' },
      mode: { label: 'Modus', manual: 'Manuell', laundry: 'Wäsche', sleep: 'Nacht', purify: 'Reinig.' },
      timer: { off: 'Aus-Timer', on: 'Ein-Timer' },
      childLock: 'Kindersicherung',
      time: { now: 'Jetzt', seconds: 'Vor {n}s', minutes: 'Vor {n}min' },
      alert: { tankFull: 'Tank voll', defrosting: 'Abtauen läuft' },
      settings: {
        title: 'Einstellungen',
        keyPlaceholder: 'Leer lassen um aktuellen Schlüssel zu behalten',
        polling: 'Abfrageintervall (Sekunden)',
        mock: 'Simulationsmodus',
        saving: 'Speichern...',
        save: 'Speichern',
        saved: 'Einstellungen gespeichert',
      },
    },
  }

  const LOCALES = ['fr', 'en', 'de']

  function detectLocale() {
    const stored = localStorage.getItem('purify_locale')
    if (LOCALES.includes(stored)) return stored
    const lang = (navigator.language || '').slice(0, 2)
    return LOCALES.includes(lang) ? lang : 'fr'
  }

  Alpine.store('i18n', {
    locale: detectLocale(),

    t(key, params) {
      const keys = key.split('.')
      let val = translations[this.locale]
      for (const k of keys) {
        if (val == null) return key
        val = val[k]
      }
      if (typeof val !== 'string') return key
      if (params) {
        return val.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
      }
      return val
    },

    toggle() {
      const i = LOCALES.indexOf(this.locale)
      this.locale = LOCALES[(i + 1) % LOCALES.length]
      localStorage.setItem('purify_locale', this.locale)
      document.documentElement.lang = this.locale
    },

    init() {
      document.documentElement.lang = this.locale
    },
  })
})

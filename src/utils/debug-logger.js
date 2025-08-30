/**
 * File-Based Debug Logger
 * Saves debug information to downloadable files for analysis
 */

class DebugLogger {
  constructor() {
    this.logs = []
    this.sessionStart = null
    this.sessionEnd = null
    this.sessionActive = false
    this.maxLogs = 1000 // Prevent memory issues
  }

  start() {
    this.sessionStart = Date.now()
    this.sessionActive = true
    this.log('DEBUG_SESSION_START', {
      timestamp: new Date().toISOString(),
      duration: 0
    })
  }

  stop() {
    this.sessionEnd = Date.now()
    this.sessionActive = false
    this.log('DEBUG_SESSION_END', {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.sessionStart
    })
  }

  log(event, data = {}) {
    if (!this.sessionActive) return

    const logEntry = {
      timestamp: Date.now() - this.sessionStart,
      event,
      data,
      time: new Date().toISOString()
    }

    this.logs.push(logEntry)

    // Prevent memory issues by limiting log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest entry
    }

    // Also log to console for immediate feedback
    console.log(`[DEBUG] ${event}:`, data)
  }

  downloadLogs(filename = 'pause-debug-logs.json') {
    const jsonData = JSON.stringify(this.logs, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)

    console.log(`Downloaded ${this.logs.length} debug entries to ${filename}`)
  }

  saveToLocalStorage(key = 'pause_debug_logs') {
    localStorage.setItem(key, JSON.stringify(this.logs))
    console.log(`Saved ${this.logs.length} debug entries to localStorage.${key}`)
  }

  loadFromLocalStorage(key = 'pause_debug_logs') {
    const data = localStorage.getItem(key)
    if (data) {
      this.logs = JSON.parse(data)
      console.log(`Loaded ${this.logs.length} debug entries from localStorage.${key}`)
      return this.logs
    }
    return []
  }

  clear() {
    this.logs = []
    console.log('Debug logs cleared')
  }

  getSummary() {
    const summary = {
      totalEvents: this.logs.length,
      sessionDuration: this.sessionStart ? Date.now() - this.sessionStart : 0,
      eventTypes: {},
      pauseStateChanges: [],
      errors: []
    }

    this.logs.forEach(log => {
      // Count event types
      summary.eventTypes[log.event] = (summary.eventTypes[log.event] || 0) + 1

      // Track pause state changes
      if (log.event.includes('PAUSE') || log.event.includes('RESUME')) {
        summary.pauseStateChanges.push(log)
      }

      // Collect errors
      if (log.event.includes('ERROR') || log.data.error) {
        summary.errors.push(log)
      }
    })

    return summary
  }
}

// Export for use in other modules
export { DebugLogger }

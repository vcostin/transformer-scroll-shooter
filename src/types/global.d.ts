// Global type definitions for the gamedev-prima project

/**
 * Debug Logger interface for structured logging
 */
interface DebugLogger {
  start(): void
  stop(): void
  log(event: string, data?: any): void
  downloadLogs(filename?: string): void
  saveToLocalStorage(key?: string): void
  loadFromLocalStorage(key?: string): any[]
  clear(): void
  getSummary(): {
    totalEvents: number
    sessionDuration: number
    eventTypes: Record<string, number>
    pauseStateChanges: any[]
    errors: any[]
  }
  logs: Array<{
    timestamp: number
    event: string
    data: any
    time: string
  }>
  sessionActive: boolean
}

/**
 * Extend the Window interface to include our global debug logger
 */
declare global {
  interface Window {
    gameDebugLogger?: DebugLogger
  }
}

export {}

/**
 * Logging utilities
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private level: LogLevel

  constructor() {
    this.level = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
  }

  setLevel(level: LogLevel) {
    this.level = level
  }

  debug(message: string, context?: LogContext) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, context || '')
    }
  }

  info(message: string, context?: LogContext) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, context || '')
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, context || '')
    }
  }

  error(message: string, context?: LogContext) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, context || '')
    }
  }

  // Request logging
  logRequest(method: string, path: string, status: number, duration?: number) {
    const durationStr = duration ? `${duration}ms` : 'N/A'
    this.info(`${method} ${path}`, { status, duration: durationStr })
  }

  // API logging
  logAPI(endpoint: string, method: string, status: number, duration?: number) {
    this.logRequest(method, endpoint, status, duration)
  }
}

export const logger = new Logger()






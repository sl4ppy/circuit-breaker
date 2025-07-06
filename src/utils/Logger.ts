// Circuit Breaker - Centralized Logging System
// Structured logging with levels and production filtering

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private isProduction: boolean = false;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    if (this.isProduction) {
      this.logLevel = LogLevel.WARN; // Only show warnings and errors in production
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log a debug message
   */
  public debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  /**
   * Log an info message
   */
  public info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  /**
   * Log an error message
   */
  public error(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string,
  ): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console with appropriate method
    const logMessage = this.formatMessage(entry);

    // Use console methods directly since this is the Logger class itself
    switch (level) {
    case LogLevel.DEBUG:
      // eslint-disable-next-line no-console
      console.debug(logMessage, data || '');
      break;
    case LogLevel.INFO:
      // eslint-disable-next-line no-console
      console.info(logMessage, data || '');
      break;
    case LogLevel.WARN:
      // eslint-disable-next-line no-console
      console.warn(logMessage, data || '');
      break;
    case LogLevel.ERROR:
      // eslint-disable-next-line no-console
      console.error(logMessage, data || '');
      break;
    }
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context ? `[${entry.context}]` : '';
    return `[${entry.timestamp}] ${levelStr}${contextStr}: ${entry.message}`;
  }

  /**
   * Get all logs
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs by level
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs (last N entries)
   */
  public getRecentLogs(count: number): LogEntry[] {
    return this.logs.slice(-count);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

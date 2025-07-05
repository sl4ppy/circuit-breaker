// Circuit Breaker - Debug Utilities
// Development and debugging tools

export class Debug {
  private static isEnabled: boolean = true
  private static logs: string[] = []
  private static maxLogs: number = 100

  /**
   * Enable or disable debug mode
   */
  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Log a debug message
   */
  public static log(message: string, ...args: any[]): void {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    
    console.log(logMessage, ...args)
    this.addToLogs(logMessage)
  }

  /**
   * Log a warning message
   */
  public static warn(message: string, ...args: any[]): void {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] WARNING: ${message}`
    
    console.warn(logMessage, ...args)
    this.addToLogs(logMessage)
  }

  /**
   * Log an error message
   */
  public static error(message: string, ...args: any[]): void {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ERROR: ${message}`
    
    console.error(logMessage, ...args)
    this.addToLogs(logMessage)
  }

  /**
   * Add message to internal logs
   */
  private static addToLogs(message: string): void {
    this.logs.push(message)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  /**
   * Get all debug logs
   */
  public static getLogs(): string[] {
    return [...this.logs]
  }

  /**
   * Clear all debug logs
   */
  public static clearLogs(): void {
    this.logs = []
  }

  /**
   * Measure performance of a function
   */
  public static measurePerformance<T>(name: string, fn: () => T): T {
    if (!this.isEnabled) return fn()

    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    this.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`)
    return result
  }

  /**
   * Create a performance timer
   */
  public static createTimer(name: string): () => void {
    const start = performance.now()
    return () => {
      const end = performance.now()
      this.log(`Timer [${name}]: ${(end - start).toFixed(2)}ms`)
    }
  }

  /**
   * Assert a condition
   */
  public static assert(condition: boolean, message: string): void {
    if (!this.isEnabled) return

    if (!condition) {
      this.error(`Assertion failed: ${message}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  /**
   * Get memory usage info
   */
  public static getMemoryInfo(): object {
    if (!this.isEnabled) return {}

    // Note: This is limited in browsers, but useful for debugging
    return {
      logsCount: this.logs.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Export debug info
   */
  public static exportDebugInfo(): object {
    return {
      enabled: this.isEnabled,
      logs: this.getLogs(),
      memory: this.getMemoryInfo()
    }
  }
} 
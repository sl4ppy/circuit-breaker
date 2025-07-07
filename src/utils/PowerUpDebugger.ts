// Circuit Breaker - Power-Up Debug System
// Provides comprehensive debugging tools for power-up system

import { PowerUpManager, PowerUpType } from '../core/PowerUpManager';
import { PowerUpEffects } from '../core/PowerUpEffects';
import { PowerUpEventSystem } from '../core/PowerUpEventSystem';
import { logger } from './Logger';

export interface DebugConfig {
  showOverlay: boolean;
  showPerformanceStats: boolean;
  showEventHistory: boolean;
  showCacheStats: boolean;
  showValidation: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

export interface PerformanceMetrics {
  frameTime: number;
  visualEffectCount: number;
  physicsEffectCount: number;
  cacheHitRate: number;
  memoryUsage: number;
  eventCount: number;
  lastUpdateTime: number;
}

export class PowerUpDebugger {
  private powerUpManager: PowerUpManager;
  private powerUpEffects: PowerUpEffects;
  private eventSystem: PowerUpEventSystem;
  private config: DebugConfig;
  private performanceMetrics: PerformanceMetrics;
  private isVisible: boolean = false;
  
  // Performance tracking
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  private performanceHistory: number[] = [];
  private maxHistoryLength: number = 60; // 1 second at 60fps
  
  // Console commands
  private consoleCommands: Map<string, (args: string[]) => void> = new Map();

  constructor(
    powerUpManager: PowerUpManager,
    powerUpEffects: PowerUpEffects,
    eventSystem: PowerUpEventSystem,
    config: Partial<DebugConfig> = {}
  ) {
    this.powerUpManager = powerUpManager;
    this.powerUpEffects = powerUpEffects;
    this.eventSystem = eventSystem;
    this.config = {
      showOverlay: false,
      showPerformanceStats: false,
      showEventHistory: false,
      showCacheStats: false,
      showValidation: false,
      logLevel: 'warn',
      ...config,
    };
    
    this.performanceMetrics = {
      frameTime: 0,
      visualEffectCount: 0,
      physicsEffectCount: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      eventCount: 0,
      lastUpdateTime: Date.now(),
    };
    
    this.initializeConsoleCommands();
    this.setupEventListeners();
    
    logger.info('🔧 PowerUpDebugger initialized', null, 'PowerUpDebugger');
  }

  /**
   * Initialize console commands
   */
  private initializeConsoleCommands(): void {
    this.consoleCommands.set('powerup.activate', (args) => {
      const type = args[0] as PowerUpType;
      if (type && Object.values(PowerUpType).includes(type)) {
        this.powerUpManager.activatePowerUp(type);
        console.log(`✓ Activated power-up: ${type}`);
      } else {
        console.log(`❌ Invalid power-up type: ${type}`);
      }
    });

    this.consoleCommands.set('powerup.deactivate', (args) => {
      const type = args[0] as PowerUpType;
      if (type && Object.values(PowerUpType).includes(type)) {
        this.powerUpManager.deactivatePowerUp(type);
        console.log(`✓ Deactivated power-up: ${type}`);
      } else {
        console.log(`❌ Invalid power-up type: ${type}`);
      }
    });

    this.consoleCommands.set('powerup.charges', (args) => {
      const type = args[0] as PowerUpType;
      const amount = parseInt(args[1]) || 1;
      if (type && Object.values(PowerUpType).includes(type)) {
        this.powerUpManager.addCharges(type, amount);
        console.log(`✓ Added ${amount} charges to ${type}`);
      } else {
        console.log(`❌ Invalid power-up type: ${type}`);
      }
    });

    this.consoleCommands.set('powerup.stats', () => {
      const stats = this.powerUpManager.getUsageStatistics();
      console.log('📊 Power-up Statistics:', stats);
    });

    this.consoleCommands.set('powerup.debug', (args) => {
      const command = args[0];
      switch (command) {
        case 'show':
          this.show();
          break;
        case 'hide':
          this.hide();
          break;
        case 'toggle':
          this.toggle();
          break;
        case 'clear':
          this.clearHistory();
          break;
        default:
          console.log('Usage: powerup.debug [show|hide|toggle|clear]');
      }
    });

    this.consoleCommands.set('powerup.cache', (args) => {
      const command = args[0];
      switch (command) {
        case 'stats':
          const stats = this.powerUpEffects.getCacheStats();
          console.log('📈 Cache Statistics:', stats);
          break;
        case 'clear':
          this.powerUpEffects.clearVisualCache();
          this.powerUpEffects.clearPathCache();
          console.log('✓ Cache cleared');
          break;
        default:
          console.log('Usage: powerup.cache [stats|clear]');
      }
    });

    this.consoleCommands.set('powerup.validate', () => {
      const errors = this.powerUpManager.getValidationErrors();
      if (errors.length > 0) {
        console.log('❌ Validation Errors:', errors);
      } else {
        console.log('✓ All power-ups are valid');
      }
    });

    // Register commands globally
    if (typeof window !== 'undefined') {
      (window as any).powerupDebug = {
        activate: (type: PowerUpType) => this.consoleCommands.get('powerup.activate')!([type]),
        deactivate: (type: PowerUpType) => this.consoleCommands.get('powerup.deactivate')!([type]),
        addCharges: (type: PowerUpType, amount: number) => this.consoleCommands.get('powerup.charges')!([type, amount.toString()]),
        stats: () => this.consoleCommands.get('powerup.stats')!([]),
        show: () => this.show(),
        hide: () => this.hide(),
        toggle: () => this.toggle(),
        cache: () => this.consoleCommands.get('powerup.cache')!(['stats']),
        validate: () => this.consoleCommands.get('powerup.validate')!([]),
      };
    }
  }

  /**
   * Setup event listeners for performance monitoring
   */
  private setupEventListeners(): void {
    this.eventSystem.registerGlobalCallbacks({
      onActivated: () => this.performanceMetrics.eventCount++,
      onDeactivated: () => this.performanceMetrics.eventCount++,
      onExpired: () => this.performanceMetrics.eventCount++,
      onChargeUsed: () => this.performanceMetrics.eventCount++,
      onChargeAdded: () => this.performanceMetrics.eventCount++,
    });
  }

  /**
   * Start performance measurement for a frame
   */
  public startFrameMeasurement(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * End performance measurement for a frame
   */
  public endFrameMeasurement(): void {
    const frameTime = performance.now() - this.frameStartTime;
    this.performanceMetrics.frameTime = frameTime;
    this.performanceMetrics.lastUpdateTime = Date.now();
    
    // Update performance history
    this.performanceHistory.push(frameTime);
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift();
    }
    
    this.frameCount++;
  }

  /**
   * Update performance metrics
   */
  public updateMetrics(): void {
    // Update cache stats
    const cacheStats = this.powerUpEffects.getCacheStats();
    this.performanceMetrics.visualEffectCount = cacheStats.visualCacheSize;
    this.performanceMetrics.physicsEffectCount = this.powerUpEffects.getActivePhysicsEffects().size;
    
    // Calculate cache hit rate (simplified)
    this.performanceMetrics.cacheHitRate = cacheStats.visualCacheSize > 0 ? 
      Math.min(cacheStats.visualCacheSize / 10, 1) : 0;
    
    // Estimate memory usage (simplified)
    this.performanceMetrics.memoryUsage = 
      cacheStats.visualCacheSize * 100 + // Estimate 100 bytes per visual effect
      cacheStats.pathCacheSize * 200 + // Estimate 200 bytes per path
      this.eventSystem.getEventHistory().length * 50; // Estimate 50 bytes per event
  }

  /**
   * Show debug overlay
   */
  public show(): void {
    this.isVisible = true;
    this.config.showOverlay = true;
    logger.info('🔧 Debug overlay shown', null, 'PowerUpDebugger');
  }

  /**
   * Hide debug overlay
   */
  public hide(): void {
    this.isVisible = false;
    this.config.showOverlay = false;
    logger.info('🔧 Debug overlay hidden', null, 'PowerUpDebugger');
  }

  /**
   * Toggle debug overlay
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Clear debug history
   */
  public clearHistory(): void {
    this.performanceHistory = [];
    this.eventSystem.clearHistory();
    this.frameCount = 0;
    logger.info('🔧 Debug history cleared', null, 'PowerUpDebugger');
  }

  /**
   * Render debug overlay
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.config.showOverlay) return;

    // Update metrics before rendering
    this.updateMetrics();

    // Set up overlay style
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 300, 400);
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 300, 400);

    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Power-Up Debug', 20, 35);

    let yOffset = 60;
    ctx.font = '12px monospace';
    
    // Performance stats
    if (this.config.showPerformanceStats) {
      ctx.fillStyle = '#ffff00';
      ctx.fillText('Performance:', 20, yOffset);
      yOffset += 20;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Frame Time: ${this.performanceMetrics.frameTime.toFixed(2)}ms`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`FPS: ${this.getFPS().toFixed(1)}`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`Visual Effects: ${this.performanceMetrics.visualEffectCount}`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`Physics Effects: ${this.performanceMetrics.physicsEffectCount}`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`Cache Hit Rate: ${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`Memory Usage: ${this.formatBytes(this.performanceMetrics.memoryUsage)}`, 25, yOffset);
      yOffset += 20;
    }

    // Active power-ups
    ctx.fillStyle = '#ff9900';
    ctx.fillText('Active Power-ups:', 20, yOffset);
    yOffset += 20;
    
    const activePowerUps = this.powerUpManager.getActivePowerUps();
    if (activePowerUps.size === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('None', 25, yOffset);
      yOffset += 15;
    } else {
      activePowerUps.forEach((state, type) => {
        const color = state.isActive ? '#00ff00' : '#888888';
        ctx.fillStyle = color;
        const timeRemaining = state.duration > 0 ? 
          Math.max(0, state.duration - (this.performanceMetrics.lastUpdateTime - state.startTime)) : 0;
        ctx.fillText(
          `${type}: ${state.charges}/${state.maxCharges} (${(timeRemaining / 1000).toFixed(1)}s)`,
          25,
          yOffset
        );
        yOffset += 15;
      });
    }
    yOffset += 10;

    // Cache stats
    if (this.config.showCacheStats) {
      ctx.fillStyle = '#ff00ff';
      ctx.fillText('Cache Stats:', 20, yOffset);
      yOffset += 20;
      
      const cacheStats = this.powerUpEffects.getCacheStats();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Visual Cache: ${cacheStats.visualCacheSize}`, 25, yOffset);
      yOffset += 15;
      ctx.fillText(`Path Cache: ${cacheStats.pathCacheSize}`, 25, yOffset);
      yOffset += 20;
    }

    // Validation errors
    if (this.config.showValidation) {
      const errors = this.powerUpManager.getValidationErrors();
      if (errors.length > 0) {
        ctx.fillStyle = '#ff0000';
        ctx.fillText('Validation Errors:', 20, yOffset);
        yOffset += 20;
        
        errors.forEach((error, index) => {
          if (index < 3) { // Show max 3 errors
            ctx.fillText(`• ${error}`, 25, yOffset);
            yOffset += 15;
          }
        });
        if (errors.length > 3) {
          ctx.fillText(`... and ${errors.length - 3} more`, 25, yOffset);
          yOffset += 15;
        }
      } else {
        ctx.fillStyle = '#00ff00';
        ctx.fillText('✓ All Valid', 20, yOffset);
        yOffset += 15;
      }
    }

    // Event history
    if (this.config.showEventHistory) {
      ctx.fillStyle = '#00ffff';
      ctx.fillText('Recent Events:', 20, yOffset);
      yOffset += 20;
      
      const recentEvents = this.eventSystem.getEventHistory(3);
      if (recentEvents.length === 0) {
        ctx.fillStyle = '#888888';
        ctx.fillText('None', 25, yOffset);
      } else {
        recentEvents.reverse().forEach((event) => {
          const age = Date.now() - event.timestamp;
          const color = age < 1000 ? '#00ff00' : age < 5000 ? '#ffff00' : '#888888';
          ctx.fillStyle = color;
          ctx.fillText(
            `${event.type} (${(age / 1000).toFixed(1)}s ago)`,
            25,
            yOffset
          );
          yOffset += 15;
        });
      }
    }

    ctx.restore();
  }

  /**
   * Get current FPS
   */
  private getFPS(): number {
    if (this.performanceHistory.length < 2) return 0;
    const avgFrameTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    return 1000 / avgFrameTime;
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Execute console command
   */
  public executeCommand(command: string, args: string[] = []): void {
    const handler = this.consoleCommands.get(command);
    if (handler) {
      try {
        handler(args);
      } catch (error) {
        console.error(`❌ Error executing command '${command}':`, error);
      }
    } else {
      console.warn(`❌ Unknown command: ${command}`);
      console.log('Available commands:', Array.from(this.consoleCommands.keys()));
    }
  }

  /**
   * Get debug configuration
   */
  public getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * Update debug configuration
   */
  public updateConfig(updates: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('🔧 Debug config updated', null, 'PowerUpDebugger');
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(): number[] {
    return [...this.performanceHistory];
  }

  /**
   * Export debug data
   */
  public exportDebugData(): {
    config: DebugConfig;
    metrics: PerformanceMetrics;
    powerUpStates: any;
    eventHistory: any;
    cacheStats: any;
    validationErrors: string[];
  } {
    return {
      config: this.getConfig(),
      metrics: this.getPerformanceMetrics(),
      powerUpStates: Object.fromEntries(this.powerUpManager.getActivePowerUps()),
      eventHistory: this.eventSystem.getEventHistory(),
      cacheStats: this.powerUpEffects.getCacheStats(),
      validationErrors: this.powerUpManager.getValidationErrors(),
    };
  }
} 
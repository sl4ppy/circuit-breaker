// Circuit Breaker - Power-Up Event System
// Handles event-driven architecture for power-up state changes

import { PowerUpType, PowerUpState } from './PowerUpManager';
import { logger } from '../utils/Logger';

export interface PowerUpEventData {
  type: PowerUpType;
  state: PowerUpState;
  timestamp: number;
  context?: any;
}

export type PowerUpEventCallback = (data: PowerUpEventData) => void;

export interface PowerUpEventCallbacks {
  onActivated?: PowerUpEventCallback;
  onDeactivated?: PowerUpEventCallback;
  onExpired?: PowerUpEventCallback;
  onChargeUsed?: PowerUpEventCallback;
  onChargeAdded?: PowerUpEventCallback;
  onEffectApplied?: PowerUpEventCallback;
  onEffectRemoved?: PowerUpEventCallback;
}

export class PowerUpEventSystem {
  private eventCallbacks: Map<PowerUpType, PowerUpEventCallbacks> = new Map();
  private globalCallbacks: PowerUpEventCallbacks = {};
  private eventHistory: PowerUpEventData[] = [];
  private maxHistorySize: number = 100;

  /**
   * Register callbacks for a specific power-up type
   */
  public registerPowerUpCallbacks(type: PowerUpType, callbacks: PowerUpEventCallbacks): void {
    this.eventCallbacks.set(type, {
      ...this.eventCallbacks.get(type),
      ...callbacks,
    });
    
    logger.debug(`🔗 Registered callbacks for ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Register global callbacks for all power-ups
   */
  public registerGlobalCallbacks(callbacks: PowerUpEventCallbacks): void {
    this.globalCallbacks = {
      ...this.globalCallbacks,
      ...callbacks,
    };
    
    logger.debug('🔗 Registered global power-up callbacks', null, 'PowerUpEventSystem');
  }

  /**
   * Unregister callbacks for a specific power-up type
   */
  public unregisterPowerUpCallbacks(type: PowerUpType): void {
    this.eventCallbacks.delete(type);
    logger.debug(`🔗 Unregistered callbacks for ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Clear all global callbacks
   */
  public clearGlobalCallbacks(): void {
    this.globalCallbacks = {};
    logger.debug('🔗 Cleared global power-up callbacks', null, 'PowerUpEventSystem');
  }

  /**
   * Emit power-up activated event
   */
  public emitActivated(type: PowerUpType, state: PowerUpState, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context,
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onActivated', eventData);
    
    logger.info(`⚡ Power-up activated: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit power-up deactivated event
   */
  public emitDeactivated(type: PowerUpType, state: PowerUpState, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context,
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onDeactivated', eventData);
    
    logger.info(`⚡ Power-up deactivated: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit power-up expired event
   */
  public emitExpired(type: PowerUpType, state: PowerUpState, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context,
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onExpired', eventData);
    
    logger.info(`⚡ Power-up expired: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit charge used event
   */
  public emitChargeUsed(type: PowerUpType, state: PowerUpState, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context,
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onChargeUsed', eventData);
    
    logger.debug(`⚡ Charge used: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit charge added event
   */
  public emitChargeAdded(type: PowerUpType, state: PowerUpState, amount: number, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context: { ...context, amount },
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onChargeAdded', eventData);
    
    logger.debug(`⚡ Charge added: ${type} (+${amount})`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit effect applied event
   */
  public emitEffectApplied(type: PowerUpType, state: PowerUpState, effect: any, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context: { ...context, effect },
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onEffectApplied', eventData);
    
    logger.debug(`⚡ Effect applied: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Emit effect removed event
   */
  public emitEffectRemoved(type: PowerUpType, state: PowerUpState, effect: any, context?: any): void {
    const eventData: PowerUpEventData = {
      type,
      state: { ...state },
      timestamp: Date.now(),
      context: { ...context, effect },
    };

    this.addToHistory(eventData);
    this.executeCallbacks('onEffectRemoved', eventData);
    
    logger.debug(`⚡ Effect removed: ${type}`, null, 'PowerUpEventSystem');
  }

  /**
   * Execute callbacks for a specific event type
   */
  private executeCallbacks(eventType: keyof PowerUpEventCallbacks, eventData: PowerUpEventData): void {
    try {
      // Execute type-specific callbacks
      const typeCallbacks = this.eventCallbacks.get(eventData.type);
      if (typeCallbacks && typeCallbacks[eventType]) {
        typeCallbacks[eventType]!(eventData);
      }

      // Execute global callbacks
      if (this.globalCallbacks[eventType]) {
        this.globalCallbacks[eventType]!(eventData);
      }
    } catch (error) {
      logger.error(`❌ Error executing power-up event callbacks: ${error}`, null, 'PowerUpEventSystem');
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(eventData: PowerUpEventData): void {
    this.eventHistory.push(eventData);
    
    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get recent event history
   */
  public getEventHistory(limit: number = 50): PowerUpEventData[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get events by type
   */
  public getEventsByType(type: PowerUpType, limit: number = 20): PowerUpEventData[] {
    return this.eventHistory
      .filter(event => event.type === type)
      .slice(-limit);
  }

  /**
   * Get events by time range
   */
  public getEventsByTimeRange(startTime: number, endTime: number): PowerUpEventData[] {
    return this.eventHistory.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime,
    );
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
    logger.debug('🔄 Power-up event history cleared', null, 'PowerUpEventSystem');
  }

  /**
   * Get statistics about power-up usage
   */
  public getUsageStatistics(): {
    totalActivations: number;
    activationsByType: Record<string, number>;
    averageActivationTime: number;
    mostUsedPowerUp: PowerUpType | null;
    } {
    const activations = this.eventHistory.filter(event => 
      event.type && event.timestamp,
    );

    const activationsByType: Record<string, number> = {};
    let totalActivationTime = 0;
    let activationCount = 0;

    activations.forEach(event => {
      const key = event.type.toString();
      activationsByType[key] = (activationsByType[key] || 0) + 1;
      
      if (event.context && event.context.duration) {
        totalActivationTime += event.context.duration;
        activationCount++;
      }
    });

    const mostUsedPowerUp = Object.entries(activationsByType)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as PowerUpType || null;

    return {
      totalActivations: activations.length,
      activationsByType,
      averageActivationTime: activationCount > 0 ? totalActivationTime / activationCount : 0,
      mostUsedPowerUp,
    };
  }

  /**
   * Debug: Get all registered callbacks
   */
  public getRegisteredCallbacks(): {
    typeSpecific: Map<PowerUpType, PowerUpEventCallbacks>;
    global: PowerUpEventCallbacks;
    } {
    return {
      typeSpecific: new Map(this.eventCallbacks),
      global: { ...this.globalCallbacks },
    };
  }

  /**
   * Reset the event system
   */
  public reset(): void {
    this.eventCallbacks.clear();
    this.globalCallbacks = {};
    this.eventHistory = [];
    logger.debug('🔄 PowerUpEventSystem reset', null, 'PowerUpEventSystem');
  }
} 
// Circuit Breaker - Power-Up Management System
// Handles power-up states, effects, and persistence with event-driven architecture

import { logger } from '../utils/Logger';
import { getPowerUpConfig, getBallTypeConfig, getUpgradeConfig } from './PowerUpConfig';
import { PowerUpEventSystem } from './PowerUpEventSystem';
import { PowerUpType, BallType } from './PowerUpTypes';

// Re-export for backwards compatibility
export { PowerUpType, BallType };

export interface PowerUpState {
  type: PowerUpType;
  isActive: boolean;
  startTime: number;
  duration: number;
  charges: number;
  maxCharges: number;
}

export interface PowerUpEffect {
  timeScale?: number;
  magneticForce?: number;
  shieldActive?: boolean;
  barSpeedMultiplier?: number;
  scanActive?: boolean;
}

export interface UpgradeProgress {
  slowMoCharges: number;
  barSpeedLevel: number;
  frictionLevel: number;
  shieldLevel: number;
  unlockedThemes: string[];
  unlockedBallTypes: BallType[];
  currentTheme: string;
  currentBallType: BallType;
}

export class PowerUpManager {
  private activePowerUps: Map<PowerUpType, PowerUpState> = new Map();
  private powerUpEffects: PowerUpEffect = {};
  private upgradeProgress: UpgradeProgress;
  private currentTime: number = 0;
  private eventSystem: PowerUpEventSystem;
  
  // Validation and error handling
  private lastValidation: { [key: string]: boolean } = {};
  private validationErrors: string[] = [];

  constructor(eventSystem?: PowerUpEventSystem) {
    this.eventSystem = eventSystem || new PowerUpEventSystem();
    this.upgradeProgress = this.createDefaultUpgradeProgress();
    this.initializeEventHandlers();
    logger.info('⚡ PowerUpManager initialized with event system', null, 'PowerUpManager');
  }

  /**
   * Initialize event handlers for power-up lifecycle
   */
  private initializeEventHandlers(): void {
    // Register global callbacks for logging and stats
    this.eventSystem.registerGlobalCallbacks({
      onActivated: (data) => {
        logger.info(`⚡ Power-up activated: ${data.type}`, null, 'PowerUpManager');
      },
      onDeactivated: (data) => {
        logger.info(`⚡ Power-up deactivated: ${data.type}`, null, 'PowerUpManager');
      },
      onExpired: (data) => {
        logger.info(`⚡ Power-up expired: ${data.type}`, null, 'PowerUpManager');
      },
    });
  }

  /**
   * Create default upgrade progress
   */
  private createDefaultUpgradeProgress(): UpgradeProgress {
    return {
      slowMoCharges: 1,
      barSpeedLevel: 0,
      frictionLevel: 0,
      shieldLevel: 0,
      unlockedThemes: ['default'],
      unlockedBallTypes: [BallType.STANDARD],
      currentTheme: 'default',
      currentBallType: BallType.STANDARD,
    };
  }

  /**
   * Update power-up manager
   */
  public update(deltaTime: number): void {
    this.currentTime += deltaTime;
    this.updateActivePowerUps();
    this.calculateCombinedEffects();
    this.validateState();
  }

  /**
   * Update active power-ups and remove expired ones
   */
  private updateActivePowerUps(): void {
    const expiredPowerUps: PowerUpType[] = [];

    this.activePowerUps.forEach((state, type) => {
      if (state.isActive && state.duration > 0) {
        const elapsed = this.currentTime - state.startTime;
        if (elapsed >= state.duration) {
          expiredPowerUps.push(type);
        }
      }
    });

    expiredPowerUps.forEach(type => {
      this.expirePowerUp(type);
    });
  }

  /**
   * Calculate combined effects from all active power-ups
   */
  private calculateCombinedEffects(): void {
    // Reset effects
    this.powerUpEffects = {};

    // Apply effects from active power-ups using centralized config
    this.activePowerUps.forEach((state, type) => {
      if (state.isActive) {
        this.applyPowerUpEffect(type);
      }
    });
  }

  /**
   * Apply individual power-up effect using centralized configuration
   */
  private applyPowerUpEffect(type: PowerUpType): void {
    const config = getPowerUpConfig(type);
    const physics = config.physics;

    // Apply effects based on configuration
    if (physics.timeScale !== undefined) {
      this.powerUpEffects.timeScale = physics.timeScale;
    }
    if (physics.magneticForce !== undefined) {
      this.powerUpEffects.magneticForce = physics.magneticForce;
    }
    if (physics.barSpeedMultiplier !== undefined) {
      this.powerUpEffects.barSpeedMultiplier = physics.barSpeedMultiplier;
    }

    // Special cases
    switch (type) {
      case PowerUpType.CIRCUIT_PATCH:
        this.powerUpEffects.shieldActive = true;
        break;
      case PowerUpType.SCAN_REVEAL:
        this.powerUpEffects.scanActive = true;
        break;
    }
  }

  /**
   * Activate a power-up with validation and events
   */
  public activatePowerUp(type: PowerUpType): boolean {
    // Validate power-up type
    if (!this.validatePowerUpType(type)) {
      logger.error(`❌ Invalid power-up type: ${type}`, null, 'PowerUpManager');
      return false;
    }

    const state = this.activePowerUps.get(type);
    if (!state) {
      logger.error(`❌ Power-up state not found: ${type}`, null, 'PowerUpManager');
      return false;
    }

    if (state.charges <= 0) {
      logger.warn(`⚠️ No charges available for: ${type}`, null, 'PowerUpManager');
      return false;
    }

    // Deactivate if already active (refresh)
    if (state.isActive) {
      this.deactivatePowerUp(type);
    }

    // Use a charge
    state.charges--;
    this.eventSystem.emitChargeUsed(type, state);

    // Activate the power-up
    state.isActive = true;
    state.startTime = this.currentTime;

    // Update duration from config (may have been upgraded)
    const config = getPowerUpConfig(type);
    state.duration = this.getUpgradedDuration(type, config.baseDuration);

    // Emit activation event
    this.eventSystem.emitActivated(type, state, {
      duration: state.duration,
      remainingCharges: state.charges,
    });

    logger.info(`⚡ Power-up activated: ${type} (${state.charges} charges remaining)`, null, 'PowerUpManager');
    return true;
  }

  /**
   * Deactivate a power-up
   */
  public deactivatePowerUp(type: PowerUpType): void {
    const state = this.activePowerUps.get(type);
    if (state && state.isActive) {
      state.isActive = false;
      
      // Emit deactivation event
      this.eventSystem.emitDeactivated(type, state);
      
      logger.info(`⚡ Power-up deactivated: ${type}`, null, 'PowerUpManager');
    }
  }

  /**
   * Expire a power-up (when duration runs out)
   */
  private expirePowerUp(type: PowerUpType): void {
    const state = this.activePowerUps.get(type);
    if (state && state.isActive) {
      state.isActive = false;
      
      // Emit expiration event
      this.eventSystem.emitExpired(type, state);
      
      logger.info(`⚡ Power-up expired: ${type}`, null, 'PowerUpManager');
    }
  }

  /**
   * Add charges to a power-up with validation
   */
  public addCharges(type: PowerUpType, amount: number = 1): boolean {
    if (!this.validatePowerUpType(type)) {
      return false;
    }

    const state = this.activePowerUps.get(type);
    if (!state) {
      logger.error(`❌ Power-up state not found: ${type}`, null, 'PowerUpManager');
      return false;
    }

    const oldCharges = state.charges;
    state.charges = Math.min(state.charges + amount, state.maxCharges);
    const actualAdded = state.charges - oldCharges;

    if (actualAdded > 0) {
      this.eventSystem.emitChargeAdded(type, state, actualAdded);
      logger.info(`⚡ Added ${actualAdded} charges to ${type} (${state.charges}/${state.maxCharges})`, null, 'PowerUpManager');
      return true;
    }

    return false;
  }

  /**
   * Get power-up state
   */
  public getPowerUpState(type: PowerUpType): PowerUpState | undefined {
    return this.activePowerUps.get(type);
  }

  /**
   * Get all active power-ups
   */
  public getActivePowerUps(): Map<PowerUpType, PowerUpState> {
    return new Map(this.activePowerUps);
  }

  /**
   * Get current power-up effects
   */
  public getPowerUpEffects(): PowerUpEffect {
    return { ...this.powerUpEffects };
  }

  /**
   * Check if a power-up is active
   */
  public isPowerUpActive(type: PowerUpType): boolean {
    const state = this.activePowerUps.get(type);
    return state ? state.isActive : false;
  }

  /**
   * Initialize power-ups for a new run
   */
  public initializeRun(): void {
    this.activePowerUps.clear();

    // Initialize each power-up type using centralized config
    Object.values(PowerUpType).forEach(type => {
      const config = getPowerUpConfig(type);
      
      this.activePowerUps.set(type, {
        type,
        isActive: false,
        startTime: 0,
        duration: config.baseDuration,
        charges: 0, // Start with zero charges
        maxCharges: this.getUpgradedMaxCharges(type, config.baseCharges),
      });
    });

    // Clear validation errors
    this.validationErrors = [];
    this.lastValidation = {};

    logger.info('⚡ Power-ups initialized for new run (zero charges)', null, 'PowerUpManager');
  }

  /**
   * Get upgraded duration for a power-up
   */
  private getUpgradedDuration(type: PowerUpType, baseDuration: number): number {
    const config = getPowerUpConfig(type);
    const multiplier = config.upgradeScaling.durationMultiplier || 1.0;
    
    // Apply upgrade multiplier based on upgrade progress
    let upgradeLevel = 0;
    switch (type) {
      case PowerUpType.SLOW_MO_SURGE:
        upgradeLevel = this.upgradeProgress.slowMoCharges;
        break;
      // Add other upgrade types as needed
    }
    
    return baseDuration * Math.pow(multiplier, upgradeLevel);
  }

  /**
   * Get upgraded max charges for a power-up
   */
  private getUpgradedMaxCharges(type: PowerUpType, baseCharges: number): number {
    const config = getPowerUpConfig(type);
    const multiplier = config.upgradeScaling.chargesMultiplier || 1.0;
    
    // Apply upgrade multiplier based on upgrade progress
    let upgradeLevel = 0;
    switch (type) {
      case PowerUpType.SLOW_MO_SURGE:
        upgradeLevel = this.upgradeProgress.slowMoCharges;
        break;
      case PowerUpType.CIRCUIT_PATCH:
        upgradeLevel = this.upgradeProgress.shieldLevel;
        break;
      // Add other upgrade types as needed
    }
    
    return Math.floor(baseCharges * Math.pow(multiplier, upgradeLevel));
  }

  /**
   * Get upgrade progress
   */
  public getUpgradeProgress(): UpgradeProgress {
    return { ...this.upgradeProgress };
  }

  /**
   * Update upgrade progress
   */
  public updateUpgradeProgress(updates: Partial<UpgradeProgress>): void {
    const oldProgress = { ...this.upgradeProgress };
    this.upgradeProgress = { ...this.upgradeProgress, ...updates };
    
    // Update max charges for affected power-ups
    this.updateMaxChargesFromUpgrades();
    
    logger.info('⚡ Upgrade progress updated', null, 'PowerUpManager');
  }

  /**
   * Update max charges based on current upgrades
   */
  private updateMaxChargesFromUpgrades(): void {
    this.activePowerUps.forEach((state, type) => {
      const config = getPowerUpConfig(type);
      const newMaxCharges = this.getUpgradedMaxCharges(type, config.baseCharges);
      
      if (state.maxCharges !== newMaxCharges) {
        state.maxCharges = newMaxCharges;
        // If current charges exceed new max, keep them (don't reduce)
        logger.debug(`⚡ Updated max charges for ${type}: ${newMaxCharges}`, null, 'PowerUpManager');
      }
    });
  }

  /**
   * Get current ball type
   */
  public getCurrentBallType(): BallType {
    return this.upgradeProgress.currentBallType;
  }

  /**
   * Set current ball type
   */
  public setCurrentBallType(ballType: BallType): void {
    if (this.upgradeProgress.unlockedBallTypes.includes(ballType)) {
      this.upgradeProgress.currentBallType = ballType;
      logger.info(`⚡ Ball type changed to: ${ballType}`, null, 'PowerUpManager');
    } else {
      logger.warn(`⚠️ Ball type not unlocked: ${ballType}`, null, 'PowerUpManager');
    }
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): string {
    return this.upgradeProgress.currentTheme;
  }

  /**
   * Set current theme
   */
  public setCurrentTheme(theme: string): void {
    if (this.upgradeProgress.unlockedThemes.includes(theme)) {
      this.upgradeProgress.currentTheme = theme;
      logger.info(`⚡ Theme changed to: ${theme}`, null, 'PowerUpManager');
    } else {
      logger.warn(`⚠️ Theme not unlocked: ${theme}`, null, 'PowerUpManager');
    }
  }

  /**
   * Unlock a ball type
   */
  public unlockBallType(ballType: BallType): void {
    if (!this.upgradeProgress.unlockedBallTypes.includes(ballType)) {
      this.upgradeProgress.unlockedBallTypes.push(ballType);
      logger.info(`⚡ Ball type unlocked: ${ballType}`, null, 'PowerUpManager');
    }
  }

  /**
   * Unlock a theme
   */
  public unlockTheme(theme: string): void {
    if (!this.upgradeProgress.unlockedThemes.includes(theme)) {
      this.upgradeProgress.unlockedThemes.push(theme);
      logger.info(`⚡ Theme unlocked: ${theme}`, null, 'PowerUpManager');
    }
  }

  /**
   * Get ball physics properties based on current ball type
   */
  public getBallPhysicsProperties(): {
    mass: number;
    friction: number;
    restitution: number;
  } {
    const ballConfig = getBallTypeConfig(this.upgradeProgress.currentBallType);
    return { ...ballConfig.physics };
  }

  /**
   * Get bar speed multiplier based on upgrades
   */
  public getBarSpeedMultiplier(): number {
    const baseMultiplier = 1.0;
    const upgradeConfig = getUpgradeConfig('barSpeedLevel');
    const upgradeMultiplier = upgradeConfig.effects.speedMultiplier?.[this.upgradeProgress.barSpeedLevel] || 1.0;
    const powerUpMultiplier = this.powerUpEffects.barSpeedMultiplier || 1.0;
    
    return baseMultiplier * upgradeMultiplier * powerUpMultiplier;
  }

  /**
   * Get friction modifier based on upgrades
   */
  public getFrictionModifier(): number {
    const baseFriction = 1.0;
    const upgradeConfig = getUpgradeConfig('frictionLevel');
    const upgradeModifier = upgradeConfig.effects.frictionModifier?.[this.upgradeProgress.frictionLevel] || 1.0;
    
    return baseFriction * upgradeModifier;
  }

  /**
   * Use shield (for Circuit Patch power-up)
   */
  public useShield(): boolean {
    const state = this.activePowerUps.get(PowerUpType.CIRCUIT_PATCH);
    if (state && state.charges > 0) {
      state.charges--;
      state.isActive = false;
      
      this.eventSystem.emitChargeUsed(PowerUpType.CIRCUIT_PATCH, state, { shieldUsed: true });
      logger.info('🛡️ Shield used', null, 'PowerUpManager');
      return true;
    }
    return false;
  }

  /**
   * Validate power-up type
   */
  private validatePowerUpType(type: PowerUpType): boolean {
    const isValid = Object.values(PowerUpType).includes(type);
    if (!isValid) {
      this.validationErrors.push(`Invalid power-up type: ${type}`);
    }
    return isValid;
  }

  /**
   * Validate current state
   */
  private validateState(): void {
    // Clear old validation errors
    this.validationErrors = [];
    
    // Validate each power-up state
    this.activePowerUps.forEach((state, type) => {
      if (state.charges < 0) {
        this.validationErrors.push(`Negative charges for ${type}: ${state.charges}`);
      }
      if (state.charges > state.maxCharges) {
        this.validationErrors.push(`Charges exceed max for ${type}: ${state.charges}/${state.maxCharges}`);
      }
      if (state.isActive && state.duration > 0) {
        const elapsed = this.currentTime - state.startTime;
        if (elapsed < 0) {
          this.validationErrors.push(`Negative elapsed time for ${type}: ${elapsed}`);
        }
      }
    });
    
    // Log validation errors
    if (this.validationErrors.length > 0) {
      logger.error(`❌ Validation errors: ${this.validationErrors.join(', ')}`, null, 'PowerUpManager');
    }
  }

  /**
   * Get validation errors
   */
  public getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  /**
   * Get event system for external access
   */
  public getEventSystem(): PowerUpEventSystem {
    return this.eventSystem;
  }

  /**
   * Get usage statistics
   */
  public getUsageStatistics(): {
    totalActivations: number;
    activationsByType: Record<string, number>;
    averageActivationTime: number;
    mostUsedPowerUp: PowerUpType | null;
    currentActiveCount: number;
  } {
    const stats = this.eventSystem.getUsageStatistics();
    const currentActiveCount = Array.from(this.activePowerUps.values())
      .filter(state => state.isActive).length;
    
    return {
      ...stats,
      currentActiveCount,
    };
  }

  /**
   * Reset all power-ups (for new game)
   */
  public reset(): void {
    this.activePowerUps.clear();
    this.powerUpEffects = {};
    this.currentTime = 0;
    this.validationErrors = [];
    this.lastValidation = {};
    this.eventSystem.clearHistory();
    
    logger.info('⚡ PowerUpManager reset', null, 'PowerUpManager');
  }
} 
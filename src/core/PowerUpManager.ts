// Circuit Breaker - Power-Up Management System
// Handles power-up states, effects, and persistence

import { logger } from '../utils/Logger';

export enum PowerUpType {
  SLOW_MO_SURGE = 'slow_mo_surge',
  MAGNETIC_GUIDE = 'magnetic_guide',
  CIRCUIT_PATCH = 'circuit_patch',
  OVERCLOCK_BOOST = 'overclock_boost',
  SCAN_REVEAL = 'scan_reveal',
}

export enum BallType {
  STANDARD = 'standard',
  HEAVY = 'heavy',
  LIGHT = 'light',
  NEON_SPLIT = 'neon_split',
}

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

  // Power-up configurations
  private readonly POWER_UP_CONFIGS: Record<PowerUpType, {
    baseDuration: number;
    baseCharges: number;
    timeScale?: number;
    magneticForce?: number;
    barSpeedMultiplier?: number;
  }> = {
    [PowerUpType.SLOW_MO_SURGE]: {
      baseDuration: 5000, // 5 seconds (longer duration)
      baseCharges: 1,
      timeScale: 0.3, // 30% speed - more reasonable with proper time scaling
    },
    [PowerUpType.MAGNETIC_GUIDE]: {
      baseDuration: 5000, // 5 seconds
      baseCharges: 1,
      magneticForce: 0.3,
    },
    [PowerUpType.CIRCUIT_PATCH]: {
      baseDuration: -1, // Permanent until used
      baseCharges: 1,
    },
    [PowerUpType.OVERCLOCK_BOOST]: {
      baseDuration: 4000, // 4 seconds
      baseCharges: 1,
      barSpeedMultiplier: 1.5,
    },
    [PowerUpType.SCAN_REVEAL]: {
      baseDuration: 3000, // 3 seconds
      baseCharges: 1,
    },
  };

  constructor() {
    this.upgradeProgress = this.createDefaultUpgradeProgress();
    logger.info('⚡ PowerUpManager initialized', null, 'PowerUpManager');
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
      this.deactivatePowerUp(type);
    });
  }

  /**
   * Calculate combined effects from all active power-ups
   */
  private calculateCombinedEffects(): void {
    // Reset effects
    this.powerUpEffects = {};

    // Apply effects from active power-ups
    this.activePowerUps.forEach((state, type) => {
      if (state.isActive) {
        this.applyPowerUpEffect(type);
      }
    });
  }

  /**
   * Apply individual power-up effect
   */
  private applyPowerUpEffect(type: PowerUpType): void {
    const config = this.POWER_UP_CONFIGS[type];

    switch (type) {
      case PowerUpType.SLOW_MO_SURGE:
        this.powerUpEffects.timeScale = config.timeScale;
        break;
      case PowerUpType.MAGNETIC_GUIDE:
        this.powerUpEffects.magneticForce = config.magneticForce;
        break;
      case PowerUpType.CIRCUIT_PATCH:
        this.powerUpEffects.shieldActive = true;
        break;
      case PowerUpType.OVERCLOCK_BOOST:
        this.powerUpEffects.barSpeedMultiplier = config.barSpeedMultiplier;
        break;
      case PowerUpType.SCAN_REVEAL:
        this.powerUpEffects.scanActive = true;
        break;
    }
  }

  /**
   * Activate a power-up
   */
  public activatePowerUp(type: PowerUpType): boolean {
    const state = this.activePowerUps.get(type);
    if (!state || state.charges <= 0) {
      return false;
    }

    // Use a charge
    state.charges--;

    // Activate the power-up
    state.isActive = true;
    state.startTime = this.currentTime;

    logger.info(`⚡ Power-up activated: ${type}`, null, 'PowerUpManager');
    return true;
  }

  /**
   * Deactivate a power-up
   */
  public deactivatePowerUp(type: PowerUpType): void {
    const state = this.activePowerUps.get(type);
    if (state) {
      state.isActive = false;
      logger.info(`⚡ Power-up deactivated: ${type}`, null, 'PowerUpManager');
    }
  }

  /**
   * Add charges to a power-up
   */
  public addCharges(type: PowerUpType, amount: number = 1): void {
    const state = this.activePowerUps.get(type);
    if (state) {
      state.charges = Math.min(state.charges + amount, state.maxCharges);
      logger.info(`⚡ Added ${amount} charges to ${type}`, null, 'PowerUpManager');
    }
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

    // Initialize each power-up type with ZERO charges for new games
    Object.values(PowerUpType).forEach(type => {
      const config = this.POWER_UP_CONFIGS[type];
      
      this.activePowerUps.set(type, {
        type,
        isActive: false,
        startTime: 0,
        duration: config.baseDuration,
        charges: 0, // Start with zero charges
        maxCharges: 0, // Start with zero max charges
      });
    });

    logger.info('⚡ Power-ups initialized for new run (zero charges)', null, 'PowerUpManager');
  }

  /**
   * Get max charges for a power-up type based on upgrades
   * Currently unused but kept for future upgrade system
   */
  // private getMaxChargesForType(type: PowerUpType): number {
  //   switch (type) {
  //     case PowerUpType.SLOW_MO_SURGE:
  //       return this.upgradeProgress.slowMoCharges;
  //     case PowerUpType.CIRCUIT_PATCH:
  //       return this.upgradeProgress.shieldLevel;
  //     default:
  //       return this.POWER_UP_CONFIGS[type].baseCharges;
  //   }
  // }

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
    this.upgradeProgress = { ...this.upgradeProgress, ...updates };
    logger.info('⚡ Upgrade progress updated', null, 'PowerUpManager');
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
    const baseMass = 6;
    const baseFriction = 0.18;
    const baseRestitution = 0.65;

    switch (this.upgradeProgress.currentBallType) {
      case BallType.HEAVY:
        return {
          mass: baseMass * 1.5,
          friction: baseFriction * 1.2,
          restitution: baseRestitution * 0.8,
        };
      case BallType.LIGHT:
        return {
          mass: baseMass * 0.7,
          friction: baseFriction * 0.6,
          restitution: baseRestitution * 1.1,
        };
      case BallType.NEON_SPLIT:
        return {
          mass: baseMass * 0.9,
          friction: baseFriction * 0.9,
          restitution: baseRestitution,
        };
      default:
        return {
          mass: baseMass,
          friction: baseFriction,
          restitution: baseRestitution,
        };
    }
  }

  /**
   * Get bar speed multiplier based on upgrades
   */
  public getBarSpeedMultiplier(): number {
    const baseMultiplier = 1.0;
    const upgradeMultiplier = 1.0 + (this.upgradeProgress.barSpeedLevel * 0.1);
    const powerUpMultiplier = this.powerUpEffects.barSpeedMultiplier || 1.0;
    
    return baseMultiplier * upgradeMultiplier * powerUpMultiplier;
  }

  /**
   * Get friction modifier based on upgrades
   */
  public getFrictionModifier(): number {
    const baseFriction = 1.0;
    const upgradeModifier = 1.0 - (this.upgradeProgress.frictionLevel * 0.05);
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
      logger.info('🛡️ Shield used', null, 'PowerUpManager');
      return true;
    }
    return false;
  }

  /**
   * Reset all power-ups (for new game)
   */
  public reset(): void {
    this.activePowerUps.clear();
    this.powerUpEffects = {};
    this.currentTime = 0;
    logger.info('⚡ PowerUpManager reset', null, 'PowerUpManager');
  }
} 
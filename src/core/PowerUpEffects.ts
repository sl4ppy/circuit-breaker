// Circuit Breaker - Power-Up Effects System
// Handles visual effects and physics effects separately with caching

import { PowerUpType, PowerUpState } from './PowerUpManager';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { TiltingBar } from './TiltingBar';
import { logger } from '../utils/Logger';
import { getPowerUpConfig, VisualEffectConfig } from './PowerUpConfig';

export interface EffectContext {
  physicsEngine: PhysicsEngine;
  tiltingBar: TiltingBar;
  currentTime: number;
  deltaTime: number;
  targetPosition?: { x: number; y: number };
  targetPath?: { x: number; y: number }[];
}

export interface VisualEffect {
  type: 'overlay' | 'particle' | 'glow' | 'animation';
  data: any;
  id: string;
  timestamp: number;
}

export interface PhysicsEffect {
  type: PowerUpType;
  timeScale?: number;
  magneticForce?: number;
  barSpeedMultiplier?: number;
  applied: boolean;
  timestamp: number;
}

export class PowerUpEffects {
  // Caching system
  private visualEffectCache: Map<string, VisualEffect[]> = new Map();
  private physicsEffectCache: Map<PowerUpType, PhysicsEffect> = new Map();
  private lastCacheUpdate: Map<PowerUpType, number> = new Map();
  private cacheTimeout: number = 1000; // 1 second cache timeout

  // Active effects tracking
  private activePhysicsEffects: Map<PowerUpType, PhysicsEffect> = new Map();
  private activeVisualEffects: Map<string, VisualEffect> = new Map();

  // Path calculation cache
  private pathCache: Map<string, { x: number; y: number }[]> = new Map();
  private pathCacheTimeout: number = 5000; // 5 seconds for path cache

  /**
   * Apply physics effects for a power-up (called once on activation)
   */
  public applyPhysicsEffects(type: PowerUpType, context: EffectContext): void {
    const config = getPowerUpConfig(type);
    
    // Remove any existing physics effect of this type
    this.removePhysicsEffects(type, context);

    const physicsEffect: PhysicsEffect = {
      type,
      applied: true,
      timestamp: Date.now(),
    };

    switch (type) {
      case PowerUpType.SLOW_MO_SURGE:
        physicsEffect.timeScale = config.physics.timeScale;
        // Apply time scale to physics engine
        if (context.physicsEngine.setTimeScale) {
          context.physicsEngine.setTimeScale(config.physics.timeScale || 1.0);
        }
        break;

      case PowerUpType.MAGNETIC_GUIDE:
        physicsEffect.magneticForce = config.physics.magneticForce;
        // Physics effects for magnetic guide are applied in update loop
        break;

      case PowerUpType.OVERCLOCK_BOOST:
        physicsEffect.barSpeedMultiplier = config.physics.barSpeedMultiplier;
        // Apply speed multiplier to tilting bar
        context.tiltingBar.setSpeedMultiplier(config.physics.barSpeedMultiplier || 1.0);
        break;

      case PowerUpType.CIRCUIT_PATCH:
        // Shield is handled as a special case - no physics effects
        break;

      case PowerUpType.SCAN_REVEAL:
        // Scan reveal is purely visual - no physics effects
        break;
    }

    this.activePhysicsEffects.set(type, physicsEffect);
    logger.debug(`⚡ Physics effects applied: ${type}`, null, 'PowerUpEffects');
  }

  /**
   * Remove physics effects for a power-up
   */
  public removePhysicsEffects(type: PowerUpType, context: EffectContext): void {
    const effect = this.activePhysicsEffects.get(type);
    if (!effect) return;

    switch (type) {
      case PowerUpType.SLOW_MO_SURGE:
        // Reset time scale
        if (context.physicsEngine.setTimeScale) {
          context.physicsEngine.setTimeScale(1.0);
        }
        break;

      case PowerUpType.OVERCLOCK_BOOST:
        // Reset bar speed multiplier
        context.tiltingBar.setSpeedMultiplier(1.0);
        break;

      case PowerUpType.MAGNETIC_GUIDE:
        // Magnetic effects are removed automatically
        break;

      case PowerUpType.CIRCUIT_PATCH:
      case PowerUpType.SCAN_REVEAL:
        // No physics effects to remove
        break;
    }

    this.activePhysicsEffects.delete(type);
    logger.debug(`⚡ Physics effects removed: ${type}`, null, 'PowerUpEffects');
  }

  /**
   * Update physics effects (called every frame for continuous effects)
   */
  public updatePhysicsEffects(context: EffectContext): void {
    // Only update magnetic guide effects here
    const magneticEffect = this.activePhysicsEffects.get(PowerUpType.MAGNETIC_GUIDE);
    if (magneticEffect && context.targetPosition) {
      this.updateMagneticEffect(magneticEffect, context);
    }
  }

  /**
   * Update magnetic effect physics
   */
  private updateMagneticEffect(effect: PhysicsEffect, context: EffectContext): void {
    if (!effect.magneticForce || !context.targetPosition) return;

    const ball = context.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (!ball) return;

    const distance = Math.sqrt(
      Math.pow(ball.position.x - context.targetPosition.x, 2) + 
      Math.pow(ball.position.y - context.targetPosition.y, 2)
    );
    
    // Only apply force when close to target
    if (distance < 100) {
      const force = effect.magneticForce * (1 - distance / 100);
      const directionX = (context.targetPosition.x - ball.position.x) / distance;
      const directionY = (context.targetPosition.y - ball.position.y) / distance;
      
      ball.acceleration.x += directionX * force * 100;
      ball.acceleration.y += directionY * force * 100;
    }
  }

  /**
   * Get visual effects for active power-ups (cached)
   */
  public getVisualEffects(
    activePowerUps: Map<PowerUpType, PowerUpState>,
    context: EffectContext
  ): VisualEffect[] {
    const effects: VisualEffect[] = [];
    const currentTime = Date.now();

    activePowerUps.forEach((state, type) => {
      if (state.isActive) {
        const cacheKey = `${type}_${state.startTime}_${currentTime}`;
        
        // Check cache first
        if (this.shouldUseCache(type, currentTime)) {
          const cachedEffects = this.visualEffectCache.get(cacheKey);
          if (cachedEffects) {
            effects.push(...cachedEffects);
            return;
          }
        }

        // Generate new effects
        const newEffects = this.generateVisualEffects(type, state, context);
        
        // Cache the results
        this.visualEffectCache.set(cacheKey, newEffects);
        this.lastCacheUpdate.set(type, currentTime);
        
        effects.push(...newEffects);
      }
    });

    return effects;
  }

  /**
   * Generate visual effects for a specific power-up
   */
  private generateVisualEffects(
    type: PowerUpType,
    state: PowerUpState,
    context: EffectContext
  ): VisualEffect[] {
    const config = getPowerUpConfig(type);
    const effects: VisualEffect[] = [];
    const currentTime = Date.now();
    const elapsed = currentTime - state.startTime;

    // Determine which visual effects to use based on state
    let effectConfigs: VisualEffectConfig[] = [];
    
    if (elapsed < 500) {
      // Activation effects
      effectConfigs = config.visualEffects.activation;
    } else if (state.isActive) {
      // Active effects
      effectConfigs = config.visualEffects.active;
    } else {
      // Deactivation effects
      effectConfigs = config.visualEffects.deactivation;
    }

    // Convert config to visual effects
    effectConfigs.forEach((effectConfig, index) => {
      const effect: VisualEffect = {
        type: effectConfig.type,
        data: this.processEffectData(effectConfig.data, type, context),
        id: `${type}_${index}_${currentTime}`,
        timestamp: currentTime,
      };

      effects.push(effect);
    });

    return effects;
  }

  /**
   * Process effect data with context-specific information
   */
  private processEffectData(data: any, type: PowerUpType, context: EffectContext): any {
    const processedData = { ...data };

    // Add dynamic values based on context
    if (processedData.pulse) {
      processedData.currentIntensity = processedData.intensity + 
        Math.sin(context.currentTime * (processedData.pulseSpeed || 0.01)) * 
        (processedData.pulseAmplitude || 0.3);
    }

    // Special processing for scan reveal
    if (type === PowerUpType.SCAN_REVEAL && processedData.type === 'path_reveal') {
      processedData.path = this.getOptimalPath(context);
    }

    return processedData;
  }

  /**
   * Get optimal path for scan reveal (cached)
   */
  private getOptimalPath(context: EffectContext): { x: number; y: number }[] {
    if (!context.targetPosition) return [];

    const ball = context.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (!ball) return [];

    const cacheKey = `${ball.position.x}_${ball.position.y}_${context.targetPosition.x}_${context.targetPosition.y}`;
    const cached = this.pathCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Calculate optimal path
    const path = this.calculateOptimalPath(
      ball.position,
      context.targetPosition,
      context.physicsEngine.getObjects()
    );

    // Cache the path
    this.pathCache.set(cacheKey, path);
    
    // Clean old cache entries
    setTimeout(() => {
      this.pathCache.delete(cacheKey);
    }, this.pathCacheTimeout);

    return path;
  }

  /**
   * Calculate optimal path from ball to target
   */
  private calculateOptimalPath(
    ballPosition: { x: number; y: number },
    targetPosition: { x: number; y: number },
    obstacles: any[]
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    
    // Add ball position
    path.push({ ...ballPosition });
    
    // Simple path calculation with obstacle avoidance
    const steps = 10;
    const dx = targetPosition.x - ballPosition.x;
    const dy = targetPosition.y - ballPosition.y;
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      let x = ballPosition.x + dx * t;
      let y = ballPosition.y + dy * t;
      
      // Simple obstacle avoidance
      obstacles.forEach(obstacle => {
        if (obstacle.id !== 'game-ball' && this.isPointNearObstacle(x, y, obstacle)) {
          // Adjust path to avoid obstacle
          const avoidanceOffset = 20;
          x += (x < obstacle.position.x) ? -avoidanceOffset : avoidanceOffset;
          y += (y < obstacle.position.y) ? -avoidanceOffset : avoidanceOffset;
        }
      });
      
      path.push({ x, y });
    }
    
    // Add target position
    path.push({ ...targetPosition });
    
    return path;
  }

  /**
   * Check if point is near obstacle
   */
  private isPointNearObstacle(x: number, y: number, obstacle: any): boolean {
    const distance = Math.sqrt(
      Math.pow(x - obstacle.position.x, 2) + 
      Math.pow(y - obstacle.position.y, 2)
    );
    return distance < (obstacle.radius || 20) + 10;
  }

  /**
   * Check if should use cache
   */
  private shouldUseCache(type: PowerUpType, currentTime: number): boolean {
    const lastUpdate = this.lastCacheUpdate.get(type);
    if (!lastUpdate) return false;
    
    return (currentTime - lastUpdate) < this.cacheTimeout;
  }

  /**
   * Check if ball should be shielded from falling off
   */
  public shouldUseShield(
    ballPosition: { x: number; y: number },
    bounds: { width: number; height: number }
  ): boolean {
    // Check if ball is about to fall off the bottom
    return ballPosition.y > bounds.height + 50;
  }

  /**
   * Get active physics effects
   */
  public getActivePhysicsEffects(): Map<PowerUpType, PhysicsEffect> {
    return new Map(this.activePhysicsEffects);
  }

  /**
   * Clear visual effect cache
   */
  public clearVisualCache(): void {
    this.visualEffectCache.clear();
    this.lastCacheUpdate.clear();
    logger.debug('🔄 Visual effect cache cleared', null, 'PowerUpEffects');
  }

  /**
   * Clear path cache
   */
  public clearPathCache(): void {
    this.pathCache.clear();
    logger.debug('🔄 Path cache cleared', null, 'PowerUpEffects');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    visualCacheSize: number;
    pathCacheSize: number;
    lastUpdates: Map<PowerUpType, number>;
  } {
    return {
      visualCacheSize: this.visualEffectCache.size,
      pathCacheSize: this.pathCache.size,
      lastUpdates: new Map(this.lastCacheUpdate),
    };
  }

  /**
   * Reset all effects and caches
   */
  public reset(): void {
    this.activePhysicsEffects.clear();
    this.activeVisualEffects.clear();
    this.clearVisualCache();
    this.clearPathCache();
    logger.debug('🔄 PowerUpEffects reset', null, 'PowerUpEffects');
  }
} 
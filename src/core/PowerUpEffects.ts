// Circuit Breaker - Power-Up Effects System
// Handles individual effect implementations for each power-up

import { PowerUpType, PowerUpState } from './PowerUpManager';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { TiltingBar } from './TiltingBar';
import { logger } from '../utils/Logger';

export interface EffectContext {
  physicsEngine: PhysicsEngine;
  tiltingBar: TiltingBar;
  currentTime: number;
  deltaTime: number;
}

export interface VisualEffect {
  type: 'overlay' | 'particle' | 'glow' | 'animation';
  data: any;
}

export class PowerUpEffects {
  private activeEffects: Map<PowerUpType, any> = new Map();

  /**
   * Apply Slow-Mo Surge effect
   */
  public applySlowMoSurge(
    _state: PowerUpState,
    _context: EffectContext,
  ): { timeScale: number; visualEffects: VisualEffect[] } {
    const timeScale = 0.5; // Slow down time to 50%
    
    const visualEffects: VisualEffect[] = [
      {
        type: 'overlay',
        data: {
          color: 'rgba(0, 255, 255, 0.2)', // Cyan overlay
          opacity: 0.3,
        },
      },
      {
        type: 'glow',
        data: {
          target: 'ball',
          color: '#00ffff',
          intensity: 1.5,
        },
      },
    ];

    logger.debug('⏰ Slow-Mo Surge effect applied', null, 'PowerUpEffects');
    return { timeScale, visualEffects };
  }

  /**
   * Apply Magnetic Guide effect
   */
  public applyMagneticGuide(
    _state: PowerUpState,
    context: EffectContext,
    targetPosition: { x: number; y: number },
  ): { magneticForce: number; visualEffects: VisualEffect[] } {
    const magneticForce = 0.3;
    
    // Apply magnetic force to ball
    const ball = context.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (ball) {
      const distance = Math.sqrt(
        Math.pow(ball.position.x - targetPosition.x, 2) + 
        Math.pow(ball.position.y - targetPosition.y, 2)
      );
      
      // Only apply force when close to target
      if (distance < 100) {
        const force = magneticForce * (1 - distance / 100);
        const directionX = (targetPosition.x - ball.position.x) / distance;
        const directionY = (targetPosition.y - ball.position.y) / distance;
        
        ball.acceleration.x += directionX * force * 100;
        ball.acceleration.y += directionY * force * 100;
      }
    }

    const visualEffects: VisualEffect[] = [
      {
        type: 'glow',
        data: {
          target: 'hole',
          color: '#ff00ff',
          intensity: 1.0 + Math.sin(context.currentTime * 0.01) * 0.3,
        },
      },
      {
        type: 'particle',
        data: {
          type: 'electric_arc',
          from: 'ball',
          to: 'hole',
          color: '#ff00ff',
          count: 3,
        },
      },
    ];

    logger.debug('🧲 Magnetic Guide effect applied', null, 'PowerUpEffects');
    return { magneticForce, visualEffects };
  }

  /**
   * Apply Circuit Patch (Shield) effect
   */
  public applyCircuitPatch(
    _state: PowerUpState,
    _context: EffectContext,
  ): { shieldActive: boolean; visualEffects: VisualEffect[] } {
    const visualEffects: VisualEffect[] = [
      {
        type: 'glow',
        data: {
          target: 'ball',
          color: '#00ff00',
          intensity: 1.2,
          type: 'shield_ring',
        },
      },
    ];

    logger.debug('🛡️ Circuit Patch shield active', null, 'PowerUpEffects');
    return { shieldActive: true, visualEffects };
  }

  /**
   * Apply Overclock Boost effect
   */
  public applyOverclockBoost(
    _state: PowerUpState,
    context: EffectContext,
  ): { barSpeedMultiplier: number; visualEffects: VisualEffect[] } {
    const barSpeedMultiplier = 1.5;
    
    // Apply speed multiplier to tilting bar
    context.tiltingBar.setSpeedMultiplier(barSpeedMultiplier);

    const visualEffects: VisualEffect[] = [
      {
        type: 'glow',
        data: {
          target: 'bar',
          color: '#ff6600',
          intensity: 1.0 + Math.sin(context.currentTime * 0.02) * 0.5,
        },
      },
      {
        type: 'particle',
        data: {
          type: 'spark',
          target: 'bar_ends',
          color: '#ff6600',
          count: 5,
        },
      },
    ];

    logger.debug('⚡ Overclock Boost effect applied', null, 'PowerUpEffects');
    return { barSpeedMultiplier, visualEffects };
  }

  /**
   * Apply Scan Reveal effect
   */
  public applyScanReveal(
    _state: PowerUpState,
    _context: EffectContext,
    targetPath: { x: number; y: number }[],
  ): { scanActive: boolean; visualEffects: VisualEffect[] } {
    const visualEffects: VisualEffect[] = [
      {
        type: 'overlay',
        data: {
          type: 'path_reveal',
          path: targetPath,
          color: '#00ffff',
          opacity: 0.6,
        },
      },
      {
        type: 'animation',
        data: {
          type: 'scan_bar',
          color: '#00ffff',
          speed: 2.0,
        },
      },
    ];

    logger.debug('🔍 Scan Reveal effect applied', null, 'PowerUpEffects');
    return { scanActive: true, visualEffects };
  }

  /**
   * Remove Slow-Mo Surge effect
   */
  public removeSlowMoSurge(_context: EffectContext): void {
    // Reset time scale to normal
    logger.debug('⏰ Slow-Mo Surge effect removed', null, 'PowerUpEffects');
  }

  /**
   * Remove Magnetic Guide effect
   */
  public removeMagneticGuide(_context: EffectContext): void {
    // Remove magnetic forces
    logger.debug('🧲 Magnetic Guide effect removed', null, 'PowerUpEffects');
  }

  /**
   * Remove Circuit Patch effect
   */
  public removeCircuitPatch(_context: EffectContext): void {
    // Shield is used up, no need to remove
    logger.debug('🛡️ Circuit Patch shield used', null, 'PowerUpEffects');
  }

  /**
   * Remove Overclock Boost effect
   */
  public removeOverclockBoost(context: EffectContext): void {
    // Reset bar speed to normal
    context.tiltingBar.setSpeedMultiplier(1.0);
    logger.debug('⚡ Overclock Boost effect removed', null, 'PowerUpEffects');
  }

  /**
   * Remove Scan Reveal effect
   */
  public removeScanReveal(_context: EffectContext): void {
    // Remove path visualization
    logger.debug('🔍 Scan Reveal effect removed', null, 'PowerUpEffects');
  }

  /**
   * Get visual effects for active power-ups
   */
  public getActiveVisualEffects(
    activePowerUps: Map<PowerUpType, PowerUpState>,
    context: EffectContext,
  ): VisualEffect[] {
    const effects: VisualEffect[] = [];

    activePowerUps.forEach((state, type) => {
      if (state.isActive) {
        switch (type) {
          case PowerUpType.SLOW_MO_SURGE:
            const slowMoResult = this.applySlowMoSurge(state, context);
            effects.push(...slowMoResult.visualEffects);
            break;
          case PowerUpType.MAGNETIC_GUIDE:
            // Need target position for magnetic guide
            const magneticResult = this.applyMagneticGuide(
              state,
              context,
              { x: 180, y: 50 } // Default target position
            );
            effects.push(...magneticResult.visualEffects);
            break;
          case PowerUpType.CIRCUIT_PATCH:
            const shieldResult = this.applyCircuitPatch(state, context);
            effects.push(...shieldResult.visualEffects);
            break;
          case PowerUpType.OVERCLOCK_BOOST:
            const overclockResult = this.applyOverclockBoost(state, context);
            effects.push(...overclockResult.visualEffects);
            break;
          case PowerUpType.SCAN_REVEAL:
            const scanResult = this.applyScanReveal(
              state,
              context,
              [] // Empty path for now
            );
            effects.push(...scanResult.visualEffects);
            break;
        }
      }
    });

    return effects;
  }

  /**
   * Calculate recommended path for Scan Reveal
   */
  public calculateRecommendedPath(
    ballPosition: { x: number; y: number },
    targetPosition: { x: number; y: number },
    _obstacles: any[],
  ): { x: number; y: number }[] {
    // Simple path calculation - can be enhanced with pathfinding
    const path: { x: number; y: number }[] = [];
    
    // Add ball position
    path.push({ ...ballPosition });
    
    // Add intermediate points (simple linear interpolation)
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: ballPosition.x + (targetPosition.x - ballPosition.x) * t,
        y: ballPosition.y + (targetPosition.y - ballPosition.y) * t,
      });
    }
    
    // Add target position
    path.push({ ...targetPosition });
    
    return path;
  }

  /**
   * Check if ball should be shielded from falling off
   */
  public shouldUseShield(
    ballPosition: { x: number; y: number },
    bounds: { width: number; height: number },
  ): boolean {
    // Check if ball is about to fall off the bottom
    return ballPosition.y > bounds.height + 50;
  }

  /**
   * Reset all effects
   */
  public reset(): void {
    this.activeEffects.clear();
    logger.debug('🔄 PowerUpEffects reset', null, 'PowerUpEffects');
  }
} 
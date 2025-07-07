// Circuit Breaker - Point Fly-Off System
// Visual feedback system for scoring events

import { Vector2 } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export interface PointFlyOffConfig {
  points: number;
  startPosition: Vector2;
  color: string;
  fontSize: number;
  duration: number;
  animation: 'fly-up' | 'arc' | 'explode' | 'fade';
  fontFamily: string;
}

export enum PointType {
  GOAL_HIT = 'goal',
  POWERUP_COLLECT = 'powerup',
  LEVEL_COMPLETE = 'level',
  BONUS = 'bonus',
  ACHIEVEMENT = 'achievement',
  COMBO = 'combo'
}

export class PointFlyOff {
  private config: PointFlyOffConfig;
  private startTime: number;
  private currentPosition: Vector2;
  private isActive: boolean = true;
  private initialVelocity: Vector2;
  private id: string;

  // Animation properties
  private currentScale: number = 1;
  private currentOpacity: number = 1;
  private currentRotation: number = 0;

  constructor(config: PointFlyOffConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.currentPosition = { ...config.startPosition };
    this.id = `flyoff-${this.startTime}-${Math.random().toString(36).substr(2, 9)}`;

    // Set initial velocity based on animation type
    this.initialVelocity = this.calculateInitialVelocity();

    logger.debug(`✨ Point fly-off created: ${config.points} points at (${config.startPosition.x}, ${config.startPosition.y})`, null, 'PointFlyOff');
  }

  /**
   * Calculate initial velocity based on animation type
   */
  private calculateInitialVelocity(): Vector2 {
    switch (this.config.animation) {
      case 'fly-up':
        return { x: 0, y: -80 }; // Straight up
      
      case 'arc':
        // Random arc direction
        const angle = (Math.random() - 0.5) * Math.PI * 0.6; // ±54 degrees
        const speed = 60 + Math.random() * 40; // 60-100 pixels/second
        return {
          x: Math.sin(angle) * speed,
          y: -Math.cos(angle) * speed
        };
      
      case 'explode':
        // Random explosion direction
        const explosionAngle = Math.random() * Math.PI * 2;
        const explosionSpeed = 40 + Math.random() * 60;
        return {
          x: Math.cos(explosionAngle) * explosionSpeed,
          y: Math.sin(explosionAngle) * explosionSpeed
        };
      
      case 'fade':
      default:
        return { x: 0, y: -20 }; // Slight upward drift
    }
  }

  /**
   * Update the animation
   */
  public update(deltaTime: number): void {
    if (!this.isActive) return;

    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.config.duration, 1);

    if (progress >= 1) {
      this.isActive = false;
      return;
    }

    // Update position based on velocity and physics
    this.updatePosition(deltaTime, progress);
    
    // Update visual properties
    this.updateVisualProperties(progress);
  }

  /**
   * Update position with physics-based movement
   */
  private updatePosition(deltaTime: number, progress: number): void {
    const dt = deltaTime / 1000; // Convert to seconds

    switch (this.config.animation) {
      case 'fly-up':
        // Simple upward movement with deceleration
        const upwardSpeed = this.initialVelocity.y * (1 - progress * 0.3);
        this.currentPosition.y += upwardSpeed * dt;
        break;

      case 'arc':
        // Arc movement with gravity
        const gravity = 150; // Pixels per second squared
        this.currentPosition.x += this.initialVelocity.x * dt;
        this.currentPosition.y += this.initialVelocity.y * dt;
        this.initialVelocity.y += gravity * dt; // Apply gravity
        break;

      case 'explode':
        // Explosive movement with decay
        const decay = 0.95;
        this.currentPosition.x += this.initialVelocity.x * dt;
        this.currentPosition.y += this.initialVelocity.y * dt;
        this.initialVelocity.x *= decay;
        this.initialVelocity.y *= decay;
        break;

      case 'fade':
        // Minimal movement, mostly fading
        this.currentPosition.y += this.initialVelocity.y * dt;
        break;
    }
  }

  /**
   * Update visual properties (scale, opacity, rotation)
   */
  private updateVisualProperties(progress: number): void {
    switch (this.config.animation) {
      case 'fly-up':
        // Scale up briefly, then shrink and fade
        if (progress < 0.2) {
          this.currentScale = 1 + progress * 2; // Scale up to 1.4x
        } else {
          this.currentScale = 1.4 - (progress - 0.2) * 1.75; // Scale back down
        }
        this.currentOpacity = 1 - Math.pow(progress, 1.5);
        break;

      case 'arc':
        // Maintain scale, fade out gradually
        this.currentScale = 1 + progress * 0.3; // Slight growth
        this.currentOpacity = 1 - Math.pow(progress, 2);
        break;

      case 'explode':
        // Rapid scale up and fade
        this.currentScale = 1 + progress * 1.5;
        this.currentOpacity = 1 - Math.pow(progress, 1.2);
        this.currentRotation = progress * Math.PI * 4; // Spin during explosion
        break;

      case 'fade':
        // Gentle scale and fade
        this.currentScale = 1 + progress * 0.5;
        this.currentOpacity = 1 - progress;
        break;
    }

    // Ensure values stay in valid ranges
    this.currentScale = Math.max(0, this.currentScale);
    this.currentOpacity = Math.max(0, Math.min(1, this.currentOpacity));
  }

  /**
   * Render the point fly-off
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive || this.currentOpacity <= 0) return;

    ctx.save();

    // Apply transformations
    ctx.globalAlpha = this.currentOpacity;
    ctx.translate(this.currentPosition.x, this.currentPosition.y);
    ctx.scale(this.currentScale, this.currentScale);
    ctx.rotate(this.currentRotation);

    // Set text properties
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.fillStyle = this.config.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Render the points text
    const text = `+${this.config.points}`;
    ctx.fillText(text, 0, 0);

    // Add outline for extra visibility
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText(text, 0, 0);

    ctx.restore();
  }

  /**
   * Check if the animation is still active
   */
  public isActiveAnimation(): boolean {
    return this.isActive;
  }

  /**
   * Get the unique ID of this fly-off
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get current position
   */
  public getPosition(): Vector2 {
    return { ...this.currentPosition };
  }

  /**
   * Force complete the animation
   */
  public complete(): void {
    this.isActive = false;
  }

  /**
   * Get remaining time in milliseconds
   */
  public getRemainingTime(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.config.duration - elapsed);
  }
}

/**
 * Factory functions for creating common point fly-off types
 */
export class PointFlyOffFactory {
  /**
   * Create a goal hit fly-off
   */
  public static createGoalHit(points: number, position: Vector2): PointFlyOff {
    return new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 20,
      duration: 1500,
      animation: 'fly-up',
      fontFamily: 'Interceptor'
    });
  }

  /**
   * Create a power-up collection fly-off
   */
  public static createPowerUpCollect(points: number, position: Vector2, _powerUpColor: string = '#ff6600'): PointFlyOff {
    return new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 16,
      duration: 1200,
      animation: 'arc',
      fontFamily: 'Interceptor'
    });
  }

  /**
   * Create a level complete fly-off
   */
  public static createLevelComplete(points: number, position: Vector2): PointFlyOff {
    return new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 24,
      duration: 2000,
      animation: 'explode',
      fontFamily: 'Cyberpunks'
    });
  }

  /**
   * Create a bonus points fly-off
   */
  public static createBonus(points: number, position: Vector2): PointFlyOff {
    return new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 18,
      duration: 1300,
      animation: 'arc',
      fontFamily: 'Interceptor'
    });
  }

  /**
   * Create an achievement fly-off
   */
  public static createAchievement(points: number, position: Vector2): PointFlyOff {
    return new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 22,
      duration: 1800,
      animation: 'explode',
      fontFamily: 'Cyberpunks'
    });
  }

  /**
   * Create a combo multiplier fly-off
   */
  public static createCombo(points: number, position: Vector2, _multiplier: number): PointFlyOff {
    const flyOff = new PointFlyOff({
      points,
      startPosition: position,
      color: '#39ff14',
      fontSize: 19,
      duration: 1400,
      animation: 'fly-up',
      fontFamily: 'Interceptor'
    });

    // Add multiplier indicator (could extend this in the future)
    return flyOff;
  }
} 
// Circuit Breaker - Point Fly-Off Manager
// Manages multiple simultaneous point animations

import { Vector2 } from '../utils/MathUtils';
import { logger } from '../utils/Logger';
import { PointFlyOff, PointFlyOffFactory, PointType } from './PointFlyOff';

interface FlyOffEvent {
  type: PointType;
  points: number;
  position: Vector2;
  metadata?: any;
}

export class PointFlyOffManager {
  private activeFlyOffs: Map<string, PointFlyOff> = new Map();
  private maxActiveFlyOffs: number = 20; // Performance limit
  private totalPointsDisplayed: number = 0;

  // Performance tracking
  private frameTime: number = 0;
  private averageFrameTime: number = 0;
  private frameCount: number = 0;

  constructor() {
    logger.info('✨ PointFlyOffManager initialized', null, 'PointFlyOffManager');
  }

  /**
   * Create and add a point fly-off animation
   */
  public createFlyOff(event: FlyOffEvent): string | null {
    // Performance check - don't create too many animations
    if (this.activeFlyOffs.size >= this.maxActiveFlyOffs) {
      this.cleanupOldestFlyOff();
    }

    let flyOff: PointFlyOff;

    // Create appropriate fly-off based on type
    switch (event.type) {
      case PointType.GOAL_HIT:
        flyOff = PointFlyOffFactory.createGoalHit(event.points, event.position);
        break;

      case PointType.POWERUP_COLLECT:
        const powerUpColor = event.metadata?.color || '#ff6600';
        flyOff = PointFlyOffFactory.createPowerUpCollect(event.points, event.position, powerUpColor);
        break;

      case PointType.LEVEL_COMPLETE:
        flyOff = PointFlyOffFactory.createLevelComplete(event.points, event.position);
        break;

      case PointType.BONUS:
        flyOff = PointFlyOffFactory.createBonus(event.points, event.position);
        break;

      case PointType.ACHIEVEMENT:
        flyOff = PointFlyOffFactory.createAchievement(event.points, event.position);
        break;

      case PointType.COMBO:
        const multiplier = event.metadata?.multiplier || 1;
        flyOff = PointFlyOffFactory.createCombo(event.points, event.position, multiplier);
        break;

      default:
        logger.warn(`❌ Unknown point fly-off type: ${event.type}`, null, 'PointFlyOffManager');
        return null;
    }

    const id = flyOff.getId();
    this.activeFlyOffs.set(id, flyOff);
    this.totalPointsDisplayed += event.points;

    logger.debug(`✨ Created ${event.type} fly-off: +${event.points} points (ID: ${id})`, null, 'PointFlyOffManager');
    return id;
  }

  /**
   * Update all active fly-off animations
   */
  public update(deltaTime: number): void {
    const startTime = performance.now();

    // Update all active animations
    const completedIds: string[] = [];

    for (const [id, flyOff] of this.activeFlyOffs) {
      flyOff.update(deltaTime);

      // Mark completed animations for removal
      if (!flyOff.isActiveAnimation()) {
        completedIds.push(id);
      }
    }

    // Remove completed animations
    for (const id of completedIds) {
      this.activeFlyOffs.delete(id);
    }

    // Update performance tracking
    this.frameTime = performance.now() - startTime;
    this.updatePerformanceMetrics();

    // Log performance warning if needed
    if (this.averageFrameTime > 2) { // More than 2ms average
      logger.warn(`⚠️ Point fly-off performance warning: ${this.averageFrameTime.toFixed(2)}ms average frame time`, null, 'PointFlyOffManager');
    }
  }

  /**
   * Render all active fly-off animations
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.activeFlyOffs.size === 0) return;

    // Sort by creation time to maintain consistent layering
    const sortedFlyOffs = Array.from(this.activeFlyOffs.values()).sort((a, b) => 
      parseInt(a.getId().split('-')[1]) - parseInt(b.getId().split('-')[1])
    );

    for (const flyOff of sortedFlyOffs) {
      flyOff.render(ctx);
    }
  }

  /**
   * Create a goal hit fly-off at ball position
   */
  public showGoalHit(points: number, ballPosition: Vector2): string | null {
    return this.createFlyOff({
      type: PointType.GOAL_HIT,
      points,
      position: { ...ballPosition }
    });
  }

  /**
   * Create a power-up collection fly-off
   */
  public showPowerUpCollect(points: number, position: Vector2, powerUpColor?: string): string | null {
    return this.createFlyOff({
      type: PointType.POWERUP_COLLECT,
      points,
      position: { ...position },
      metadata: { color: powerUpColor }
    });
  }

  /**
   * Create a level complete fly-off
   */
  public showLevelComplete(points: number, centerPosition: Vector2): string | null {
    return this.createFlyOff({
      type: PointType.LEVEL_COMPLETE,
      points,
      position: { ...centerPosition }
    });
  }

  /**
   * Create a bonus points fly-off
   */
  public showBonus(points: number, position: Vector2): string | null {
    return this.createFlyOff({
      type: PointType.BONUS,
      points,
      position: { ...position }
    });
  }

  /**
   * Create an achievement fly-off
   */
  public showAchievement(points: number, position: Vector2): string | null {
    return this.createFlyOff({
      type: PointType.ACHIEVEMENT,
      points,
      position: { ...position }
    });
  }

  /**
   * Create a combo multiplier fly-off
   */
  public showCombo(points: number, position: Vector2, multiplier: number): string | null {
    return this.createFlyOff({
      type: PointType.COMBO,
      points,
      position: { ...position },
      metadata: { multiplier }
    });
  }

  /**
   * Clear all active fly-offs
   */
  public clearAll(): void {
    this.activeFlyOffs.clear();
    logger.debug('🧹 Cleared all point fly-offs', null, 'PointFlyOffManager');
  }

  /**
   * Complete all active fly-offs immediately
   */
  public completeAll(): void {
    for (const flyOff of this.activeFlyOffs.values()) {
      flyOff.complete();
    }
    logger.debug('⏭️ Completed all point fly-offs', null, 'PointFlyOffManager');
  }

  /**
   * Remove the oldest fly-off to maintain performance
   */
  private cleanupOldestFlyOff(): void {
    if (this.activeFlyOffs.size === 0) return;

    // Find oldest fly-off by creation time
    let oldestId = '';
    let oldestTime = Infinity;

    for (const [id, flyOff] of this.activeFlyOffs) {
      const creationTime = parseInt(id.split('-')[1]);
      if (creationTime < oldestTime) {
        oldestTime = creationTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.activeFlyOffs.delete(oldestId);
      logger.debug(`🧹 Cleaned up oldest fly-off: ${oldestId}`, null, 'PointFlyOffManager');
    }
  }

  /**
   * Update performance tracking metrics
   */
  private updatePerformanceMetrics(): void {
    this.frameCount++;
    
    // Calculate rolling average over last 100 frames
    const weight = Math.min(1 / this.frameCount, 0.01);
    this.averageFrameTime = this.averageFrameTime * (1 - weight) + this.frameTime * weight;
  }

  /**
   * Get current performance statistics
   */
  public getPerformanceStats(): {
    activeFlyOffs: number;
    averageFrameTime: number;
    totalPointsDisplayed: number;
  } {
    return {
      activeFlyOffs: this.activeFlyOffs.size,
      averageFrameTime: this.averageFrameTime,
      totalPointsDisplayed: this.totalPointsDisplayed
    };
  }

  /**
   * Get the number of active fly-offs
   */
  public getActiveFlyOffCount(): number {
    return this.activeFlyOffs.size;
  }

  /**
   * Set maximum number of active fly-offs (for performance tuning)
   */
  public setMaxActiveFlyOffs(max: number): void {
    this.maxActiveFlyOffs = Math.max(1, max);
    logger.debug(`⚙️ Set max active fly-offs to: ${this.maxActiveFlyOffs}`, null, 'PointFlyOffManager');
  }

  /**
   * Check if a specific fly-off is still active
   */
  public isFlyOffActive(id: string): boolean {
    return this.activeFlyOffs.has(id);
  }

  /**
   * Get the position of a specific fly-off
   */
  public getFlyOffPosition(id: string): Vector2 | null {
    const flyOff = this.activeFlyOffs.get(id);
    return flyOff ? flyOff.getPosition() : null;
  }

  /**
   * Get remaining time for a specific fly-off
   */
  public getFlyOffRemainingTime(id: string): number {
    const flyOff = this.activeFlyOffs.get(id);
    return flyOff ? flyOff.getRemainingTime() : 0;
  }

  /**
   * Create multiple fly-offs for a scoring burst
   */
  public showScoreBurst(events: FlyOffEvent[]): string[] {
    const ids: string[] = [];
    
    for (const event of events) {
      const id = this.createFlyOff(event);
      if (id) {
        ids.push(id);
      }
    }

    logger.debug(`🎆 Created score burst: ${ids.length} fly-offs`, null, 'PointFlyOffManager');
    return ids;
  }
} 
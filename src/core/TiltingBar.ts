import { Vector2 } from '../utils/MathUtils';
import { logger } from '../utils/Logger';

export interface TiltingBarConfig {
  position: Vector2;
  width: number;
  height: number;
  maxRotation: number; // Maximum rotation angle in radians
  rotationSpeed: number; // How fast the bar rotates
  friction: number; // Surface friction for ball interactions
}

export class TiltingBar {
  public position: Vector2;
  public rotation: number = 0;
  public targetRotation: number = 0;
  public leftSideHeight: number = 590; // Absolute Y position for left side (start at bottom)
  public rightSideHeight: number = 590; // Absolute Y position for right side (start at bottom)
  public minSideHeight: number = 50; // Minimum height (top of screen area)
  public maxSideHeight: number = 590; // Maximum height (bottom of screen)
  public sideSpeed: number = 100; // Speed of side height changes
  public width: number;
  public height: number;
  public maxRotation: number;
  public rotationSpeed: number;
  public friction: number;

  // Visual properties
  public color: string = '#00f0ff'; // Electric Blue
  public glowColor: string = '#b600f9'; // Neon Purple
  public thickness: number = 12; // Increased thickness for better collision

  constructor(config: TiltingBarConfig) {
    this.position = { ...config.position };
    this.width = config.width;
    this.height = config.height;
    this.maxRotation = config.maxRotation;
    this.rotationSpeed = config.rotationSpeed;
    this.friction = config.friction;
  }

  /**
   * Set the target rotation angle (will be clamped to maxRotation)
   */
  public setTargetRotation(angle: number): void {
    this.targetRotation = Math.max(
      -this.maxRotation,
      Math.min(this.maxRotation, angle),
    );
  }

  /**
   * Move left side up or down based on input (1 = up, -1 = down, 0 = no movement)
   */
  public moveLeftSide(input: number): void {
    if (input !== 0) {
      this.leftSideHeight -= input * this.sideSpeed * (1 / 60); // Move up (negative) or down (positive)
      this.leftSideHeight = Math.max(
        this.minSideHeight,
        Math.min(this.maxSideHeight, this.leftSideHeight),
      );
    }
  }

  /**
   * Move right side up or down based on input (1 = up, -1 = down, 0 = no movement)
   */
  public moveRightSide(input: number): void {
    if (input !== 0) {
      this.rightSideHeight -= input * this.sideSpeed * (1 / 60); // Move up (negative) or down (positive)
      this.rightSideHeight = Math.max(
        this.minSideHeight,
        Math.min(this.maxSideHeight, this.rightSideHeight),
      );
    }
  }

  /**
   * Get the current tilt as a percentage (-1 to 1)
   */
  public getTiltPercentage(): number {
    return this.rotation / this.maxRotation;
  }

  /**
   * Update the bar's rotation based on current side heights
   */
  public update(_deltaTime: number): void {
    // Calculate rotation based on height difference
    const heightDifference = this.rightSideHeight - this.leftSideHeight;
    const maxHeightRange = this.maxSideHeight - this.minSideHeight;
    this.rotation = (heightDifference / maxHeightRange) * this.maxRotation;

    // Also update targetRotation for compatibility
    this.targetRotation = this.rotation;
  }

  /**
   * Get the endpoints of the bar for collision detection
   */
  public getEndpoints(): { start: Vector2; end: Vector2 } {
    const halfWidth = this.width / 2;

    return {
      start: {
        x: this.position.x - halfWidth,
        y: this.leftSideHeight,
      },
      end: {
        x: this.position.x + halfWidth,
        y: this.rightSideHeight,
      },
    };
  }

  /**
   * Get the normal vector of the bar surface
   */
  public getNormal(): Vector2 {
    const endpoints = this.getEndpoints();
    const dx = endpoints.end.x - endpoints.start.x;
    const dy = endpoints.end.y - endpoints.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return { x: 0, y: -1 }; // Default upward normal

    // Normal perpendicular to the bar, pointing upward
    return {
      x: -dy / length,
      y: dx / length,
    };
  }

  /**
   * Check if a point is near the bar (for collision detection)
   */
  public isPointNearBar(point: Vector2, radius: number): boolean {
    const endpoints = this.getEndpoints();
    const distance = this.distanceToLineSegment(
      point,
      endpoints.start,
      endpoints.end,
    );
    const collisionThreshold = radius + this.thickness / 2 + 2; // Add small buffer for better detection
    return distance <= collisionThreshold;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: Vector2,
    start: Vector2,
    end: Vector2,
  ): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0)
      return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) /
          (length * length),
      ),
    );
    const projection = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return Math.sqrt(
      (point.x - projection.x) ** 2 + (point.y - projection.y) ** 2,
    );
  }

  /**
   * Get collision response for a ball hitting the bar
   */
  public getCollisionResponse(
    ballPosition: Vector2,
    ballVelocity: Vector2,
    ballRadius: number,
  ): { velocity: Vector2; position: Vector2 } {
    const endpoints = this.getEndpoints();
    const normal = this.getNormal();

    // Calculate penetration depth
    const distanceToBar = this.distanceToLineSegment(
      ballPosition,
      endpoints.start,
      endpoints.end,
    );
    const penetrationDepth = ballRadius + this.thickness / 2 - distanceToBar;

    // Push ball out of the bar
    const correctedPosition = {
      x: ballPosition.x + normal.x * penetrationDepth,
      y: ballPosition.y + normal.y * penetrationDepth,
    };

    // Reflect velocity along the normal (only if moving into the bar)
    const dotProduct = ballVelocity.x * normal.x + ballVelocity.y * normal.y;

    let newVelocity = ballVelocity;
    if (dotProduct < 0) {
      // Ball is moving into the bar
      const reflection = {
        x: ballVelocity.x - 2 * dotProduct * normal.x,
        y: ballVelocity.y - 2 * dotProduct * normal.y,
      };

      // Apply friction and bounce energy
      const frictionFactor = 1 - this.friction;
      const bounceEnergy = 0.8; // Slight energy loss on bounce
      newVelocity = {
        x: reflection.x * frictionFactor * bounceEnergy,
        y: reflection.y * bounceEnergy,
      };
    }

    return {
      velocity: newVelocity,
      position: correctedPosition,
    };
  }

  /**
   * Reset the tilting bar to its starting position (both sides at bottom)
   */
  public reset(): void {
    this.leftSideHeight = this.maxSideHeight; // Reset to bottom position (590)
    this.rightSideHeight = this.maxSideHeight; // Reset to bottom position (590)
    this.rotation = 0; // Reset rotation to horizontal
    this.targetRotation = 0; // Reset target rotation
    logger.info('🔄 Tilting bar reset to starting position', null, 'TiltingBar');
  }
}

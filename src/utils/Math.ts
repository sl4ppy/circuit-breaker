// Circuit Breaker - Math Utilities
// Common mathematical functions for game calculations

export class MathUtils {
  /**
   * Clamp a value between min and max
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  /**
   * Linear interpolation between two values
   */
  public static lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
  }

  /**
   * Convert degrees to radians
   */
  public static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Convert radians to degrees
   */
  public static toDegrees(radians: number): number {
    return radians * (180 / Math.PI)
  }

  /**
   * Calculate distance between two points
   */
  public static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate angle between two points
   */
  public static angle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1)
  }

  /**
   * Check if two circles are colliding
   */
  public static circleCollision(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const distance = this.distance(x1, y1, x2, y2)
    return distance < r1 + r2
  }

  /**
   * Check if a point is inside a circle
   */
  public static pointInCircle(
    px: number, py: number,
    cx: number, cy: number, radius: number
  ): boolean {
    const distance = this.distance(px, py, cx, cy)
    return distance <= radius
  }

  /**
   * Check if a point is inside a rectangle
   */
  public static pointInRect(
    px: number, py: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
  }

  /**
   * Generate a random number between min and max
   */
  public static random(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  public static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Easing functions for smooth animations
   */
  public static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  public static easeIn(t: number): number {
    return t * t
  }

  public static easeOut(t: number): number {
    return t * (2 - t)
  }
} 
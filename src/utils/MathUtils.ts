// Circuit Breaker - Math Utilities
// Common mathematical functions for game calculations

export interface Vector2 {
  x: number;
  y: number;
}

export class MathUtils {
  /**
   * Clamp a value between min and max
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation between two values
   */
  public static lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  /**
   * Convert degrees to radians
   */
  public static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  public static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Calculate distance between two points (coordinate version)
   */
  public static distance(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate distance between two Vector2 points
   */
  public static distanceVec(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle between two points
   */
  public static angle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /**
   * Normalize a vector
   */
  public static normalize(vector: Vector2): Vector2 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  /**
   * Dot product of two vectors
   */
  public static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  /**
   * Check if two circles are colliding
   */
  public static circleCollision(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number,
  ): boolean {
    const distance = this.distance(x1, y1, x2, y2);
    return distance < r1 + r2;
  }

  /**
   * Check if a point is inside a circle
   */
  public static pointInCircle(
    px: number,
    py: number,
    cx: number,
    cy: number,
    radius: number,
  ): boolean {
    const distance = this.distance(px, py, cx, cy);
    return distance <= radius;
  }

  /**
   * Check if a point is inside a rectangle
   */
  public static pointInRect(
    px: number,
    py: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
  ): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Generate a random number between min and max
   */
  public static random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  public static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Easing functions for smooth animations
   */
  public static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  public static easeIn(t: number): number {
    return t * t;
  }

  public static easeOut(t: number): number {
    return t * (2 - t);
  }

  /**
   * Spring easing function with overshoot - creates a bouncy "spring" effect
   */
  public static easeSpring(t: number): number {
    const s = 1.70158; // Back easing overshoot amount
    return t * t * ((s + 1) * t - s);
  }

  /**
   * Ease out back function - starts fast and overshoots with a bounce back
   * Creates a smooth animation that goes slightly past the target and snaps back
   */
  public static easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  /**
   * Ease in back function - starts slow then accelerates with anticipation
   * Creates a smooth animation that pulls back slightly before accelerating forward
   */
  public static easeInBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    
    return c3 * x * x * x - c1 * x * x;
  }

  /**
   * Elastic easing function - creates a spring-like bouncing effect
   */
  public static easeElastic(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    
    const p = 0.3;
    const s = p / 4;
    
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }

  /**
   * Cubic ease-in (accelerating from zero velocity)
   */
  public static easeInCubic(t: number): number {
    return t * t * t;
  }

  /**
   * Cubic ease-out (decelerating to zero velocity)
   */
  public static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

export interface Vector2 {
  x: number
  y: number
}

export class MathUtils {
  /**
   * Calculate distance between two points
   */
  static distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Normalize a vector
   */
  static normalize(vector: Vector2): Vector2 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length === 0) return { x: 0, y: 0 }
    return { x: vector.x / length, y: vector.y / length }
  }

  /**
   * Dot product of two vectors
   */
  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y
  }

  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }
} 
// Circuit Breaker - Math Utilities Tests
// Unit tests for mathematical functions

import { describe, it, expect } from 'vitest'
import { MathUtils } from '../src/utils/MathUtils'

describe('MathUtils', () => {
  describe('clamp', () => {
    it('should clamp value between min and max', () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5)
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0)
      expect(MathUtils.clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(MathUtils.lerp(0, 10, 0.5)).toBe(5)
      expect(MathUtils.lerp(0, 10, 0)).toBe(0)
      expect(MathUtils.lerp(0, 10, 1)).toBe(10)
    })
  })

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      expect(MathUtils.distance(0, 0, 3, 4)).toBe(5)
      expect(MathUtils.distance(1, 1, 4, 5)).toBe(5)
    })
  })

  describe('circleCollision', () => {
    it('should detect collision between circles', () => {
      expect(MathUtils.circleCollision(0, 0, 2, 3, 0, 2)).toBe(true)
      expect(MathUtils.circleCollision(0, 0, 1, 5, 0, 1)).toBe(false)
    })
  })

  describe('pointInCircle', () => {
    it('should detect if point is inside circle', () => {
      expect(MathUtils.pointInCircle(1, 1, 0, 0, 2)).toBe(true)
      expect(MathUtils.pointInCircle(3, 3, 0, 0, 2)).toBe(false)
    })
  })

  describe('pointInRect', () => {
    it('should detect if point is inside rectangle', () => {
      expect(MathUtils.pointInRect(5, 5, 0, 0, 10, 10)).toBe(true)
      expect(MathUtils.pointInRect(15, 15, 0, 0, 10, 10)).toBe(false)
    })
  })

  describe('random', () => {
    it('should generate random number in range', () => {
      const result = MathUtils.random(0, 10)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(10)
    })
  })

  describe('randomInt', () => {
    it('should generate random integer in range', () => {
      const result = MathUtils.randomInt(0, 10)
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(10)
    })
  })
}) 
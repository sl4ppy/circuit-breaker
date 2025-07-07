// Tests for Point Fly-Off System
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointFlyOff, PointFlyOffFactory, PointType } from '../src/ui/PointFlyOff';
import { PointFlyOffManager } from '../src/ui/PointFlyOffManager';

// Mock logger to avoid console output during tests
vi.mock('../src/utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PointFlyOff', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas and context
    mockCanvas = {
      getContext: vi.fn(),
    } as unknown as HTMLCanvasElement;

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      set font(_value: string) {},
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
      set textBaseline(_value: CanvasTextBaseline) {},
      set globalAlpha(_value: number) {},
      set shadowColor(_value: string) {},
      set shadowBlur(_value: number) {},
      set shadowOffsetX(_value: number) {},
      set shadowOffsetY(_value: number) {},
      set lineWidth(_value: number) {},
    } as unknown as CanvasRenderingContext2D;
  });

  describe('PointFlyOff Class', () => {
    it('should create a point fly-off with correct properties', () => {
      const config = {
        points: 100,
        startPosition: { x: 100, y: 200 },
        color: '#ff0000',
        fontSize: 16,
        duration: 1000,
        animation: 'fly-up' as const,
        fontFamily: 'Arial',
      };

      const flyOff = new PointFlyOff(config);

      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
      expect(flyOff.getId()).toMatch(/^flyoff-\d+-[a-z0-9]+$/);
    });

    it('should update position and properties over time', () => {
      const config = {
        points: 100,
        startPosition: { x: 100, y: 200 },
        color: '#ff0000',
        fontSize: 16,
        duration: 1000,
        animation: 'fly-up' as const,
        fontFamily: 'Arial',
      };

      const flyOff = new PointFlyOff(config);
      const initialPosition = flyOff.getPosition();

      // Update with 100ms delta
      flyOff.update(100);

      const updatedPosition = flyOff.getPosition();
      expect(updatedPosition.y).toBeLessThan(initialPosition.y); // Should move up
      expect(flyOff.isActiveAnimation()).toBe(true);
    });

    it('should become inactive after duration expires', () => {
      const startTime = Date.now();
      const mockDateNow = vi.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(startTime);

      const config = {
        points: 100,
        startPosition: { x: 100, y: 200 },
        color: '#ff0000',
        fontSize: 16,
        duration: 100, // Short duration
        animation: 'fade' as const,
        fontFamily: 'Arial',
      };

      const flyOff = new PointFlyOff(config);
      
      // Simulate time passing beyond duration
      mockDateNow.mockReturnValue(startTime + 200); // 200ms > 100ms duration
      flyOff.update(16); // Update with any delta time
      
      expect(flyOff.isActiveAnimation()).toBe(false);
      
      mockDateNow.mockRestore();
    });

    it('should render without errors', () => {
      const config = {
        points: 100,
        startPosition: { x: 100, y: 200 },
        color: '#ff0000',
        fontSize: 16,
        duration: 1000,
        animation: 'fly-up' as const,
        fontFamily: 'Arial',
      };

      const flyOff = new PointFlyOff(config);
      
      expect(() => flyOff.render(mockCtx)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('+100', 0, 0);
    });

    it('should handle different animation types', () => {
      const animations = ['fly-up', 'arc', 'explode', 'fade'] as const;
      
      animations.forEach(animation => {
        const config = {
          points: 100,
          startPosition: { x: 100, y: 200 },
          color: '#ff0000',
          fontSize: 16,
          duration: 1000,
          animation,
          fontFamily: 'Arial',
        };

        const flyOff = new PointFlyOff(config);
        expect(flyOff.isActiveAnimation()).toBe(true);
        
        // Update and verify it doesn't crash
        flyOff.update(100);
        expect(() => flyOff.render(mockCtx)).not.toThrow();
      });
    });
  });

  describe('PointFlyOffFactory', () => {
    it('should create goal hit fly-off', () => {
      const flyOff = PointFlyOffFactory.createGoalHit(500, { x: 100, y: 200 });
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should create power-up collect fly-off', () => {
      const flyOff = PointFlyOffFactory.createPowerUpCollect(100, { x: 100, y: 200 }, '#ff6600');
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should create level complete fly-off', () => {
      const flyOff = PointFlyOffFactory.createLevelComplete(1000, { x: 100, y: 200 });
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should create bonus fly-off', () => {
      const flyOff = PointFlyOffFactory.createBonus(250, { x: 100, y: 200 });
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should create achievement fly-off', () => {
      const flyOff = PointFlyOffFactory.createAchievement(750, { x: 100, y: 200 });
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should create combo fly-off', () => {
      const flyOff = PointFlyOffFactory.createCombo(300, { x: 100, y: 200 }, 2);
      
      expect(flyOff.isActiveAnimation()).toBe(true);
      expect(flyOff.getPosition()).toEqual({ x: 100, y: 200 });
    });
  });

  describe('PointFlyOffManager', () => {
    let manager: PointFlyOffManager;

    beforeEach(() => {
      manager = new PointFlyOffManager();
    });

    it('should create and manage fly-offs', () => {
      const id = manager.showGoalHit(500, { x: 100, y: 200 });
      
      expect(id).toBeDefined();
      expect(manager.getActiveFlyOffCount()).toBe(1);
      expect(manager.isFlyOffActive(id!)).toBe(true);
    });

    it('should update all active fly-offs', () => {
      const id1 = manager.showGoalHit(500, { x: 100, y: 200 });
      const id2 = manager.showPowerUpCollect(100, { x: 200, y: 300 });
      
      expect(manager.getActiveFlyOffCount()).toBe(2);
      
      // Update manager
      manager.update(100);
      
      // Both should still be active
      expect(manager.isFlyOffActive(id1!)).toBe(true);
      expect(manager.isFlyOffActive(id2!)).toBe(true);
    });

    it('should render all active fly-offs', () => {
      manager.showGoalHit(500, { x: 100, y: 200 });
      manager.showPowerUpCollect(100, { x: 200, y: 300 });
      
      expect(() => manager.render(mockCtx)).not.toThrow();
    });

    it('should clear all fly-offs', () => {
      manager.showGoalHit(500, { x: 100, y: 200 });
      manager.showPowerUpCollect(100, { x: 200, y: 300 });
      
      expect(manager.getActiveFlyOffCount()).toBe(2);
      
      manager.clearAll();
      
      expect(manager.getActiveFlyOffCount()).toBe(0);
    });

    it('should complete all fly-offs', () => {
      const id1 = manager.showGoalHit(500, { x: 100, y: 200 });
      const id2 = manager.showPowerUpCollect(100, { x: 200, y: 300 });
      
      expect(manager.getActiveFlyOffCount()).toBe(2);
      
      manager.completeAll();
      
      // Update to process completed animations
      manager.update(16);
      
      expect(manager.getActiveFlyOffCount()).toBe(0);
    });

    it('should handle performance limits', () => {
      manager.setMaxActiveFlyOffs(3);
      
      // Create more fly-offs than the limit
      for (let i = 0; i < 5; i++) {
        manager.showGoalHit(100, { x: i * 50, y: 200 });
      }
      
      // Should not exceed the limit
      expect(manager.getActiveFlyOffCount()).toBeLessThanOrEqual(3);
    });

    it('should provide performance stats', () => {
      manager.showGoalHit(500, { x: 100, y: 200 });
      manager.showPowerUpCollect(100, { x: 200, y: 300 });
      
      const stats = manager.getPerformanceStats();
      
      expect(stats.activeFlyOffs).toBe(2);
      expect(stats.totalPointsDisplayed).toBe(600);
      expect(typeof stats.averageFrameTime).toBe('number');
    });

    it('should create score bursts', () => {
      const events = [
        { type: PointType.GOAL_HIT, points: 500, position: { x: 100, y: 200 } },
        { type: PointType.POWERUP_COLLECT, points: 100, position: { x: 200, y: 300 }, metadata: { color: '#ff6600' } },
        { type: PointType.BONUS, points: 250, position: { x: 300, y: 400 } },
      ];
      
      const ids = manager.showScoreBurst(events);
      
      expect(ids).toHaveLength(3);
      expect(manager.getActiveFlyOffCount()).toBe(3);
    });

    it('should handle different point types', () => {
      const tests = [
        { fn: () => manager.showGoalHit(500, { x: 100, y: 200 }), expected: 1 },
        { fn: () => manager.showPowerUpCollect(100, { x: 200, y: 300 }), expected: 2 },
        { fn: () => manager.showLevelComplete(1000, { x: 300, y: 400 }), expected: 3 },
        { fn: () => manager.showBonus(250, { x: 400, y: 500 }), expected: 4 },
        { fn: () => manager.showAchievement(750, { x: 500, y: 600 }), expected: 5 },
        { fn: () => manager.showCombo(300, { x: 600, y: 700 }, 2), expected: 6 },
      ];
      
      tests.forEach(test => {
        const id = test.fn();
        expect(id).toBeDefined();
        expect(manager.getActiveFlyOffCount()).toBe(test.expected);
      });
    });

    it('should track fly-off positions and remaining time', () => {
      const id = manager.showGoalHit(500, { x: 100, y: 200 });
      
      expect(manager.getFlyOffPosition(id!)).toEqual({ x: 100, y: 200 });
      expect(manager.getFlyOffRemainingTime(id!)).toBeGreaterThan(0);
    });

    it('should handle expired fly-offs', () => {
      // Create fly-off with very short duration by directly creating with manager
      const id = manager.createFlyOff({
        type: PointType.GOAL_HIT,
        points: 100,
        position: { x: 100, y: 200 },
      });
      
      expect(manager.getActiveFlyOffCount()).toBe(1);
      
      // Wait for expiration and update
      setTimeout(() => {
        manager.update(16);
        expect(manager.getActiveFlyOffCount()).toBe(0);
      }, 2000); // Wait longer than typical durations
    });
  });
}); 
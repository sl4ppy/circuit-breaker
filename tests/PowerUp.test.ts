// Circuit Breaker - Power-Up System Tests
// Comprehensive test suite for power-up functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PowerUpManager, PowerUpType, BallType } from '../src/core/PowerUpManager';
import { PowerUpEffects, EffectContext } from '../src/core/PowerUpEffects';
import { PowerUpEventSystem } from '../src/core/PowerUpEventSystem';
import { getPowerUpConfig, validatePowerUpConfig } from '../src/core/PowerUpConfig';
import { PhysicsEngine } from '../src/physics/PhysicsEngine';
import { TiltingBar } from '../src/core/TiltingBar';

// Mock dependencies
vi.mock('../src/utils/Logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PowerUpManager', () => {
  let powerUpManager: PowerUpManager;
  let eventSystem: PowerUpEventSystem;

  beforeEach(() => {
    eventSystem = new PowerUpEventSystem();
    powerUpManager = new PowerUpManager(eventSystem);
    powerUpManager.initializeRun();
  });

  describe('Initialization', () => {
    it('should initialize with zero charges for all power-ups', () => {
      Object.values(PowerUpType).forEach(type => {
        const state = powerUpManager.getPowerUpState(type);
        expect(state).toBeDefined();
        expect(state!.charges).toBe(0);
        expect(state!.isActive).toBe(false);
      });
    });

    it('should have valid configuration for all power-up types', () => {
      Object.values(PowerUpType).forEach(type => {
        const config = getPowerUpConfig(type);
        expect(config).toBeDefined();
        expect(validatePowerUpConfig(config)).toBe(true);
      });
    });
  });

  describe('Charge Management', () => {
    it('should add charges correctly', () => {
      const result = powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 2);
      expect(result).toBe(true);
      
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      expect(state!.charges).toBe(2);
    });

    it('should not exceed max charges', () => {
      // Add charges up to max
      powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 10);
      
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      expect(state!.charges).toBeLessThanOrEqual(state!.maxCharges);
    });

    it('should reject invalid power-up types', () => {
      const result = powerUpManager.addCharges('invalid_type' as PowerUpType, 1);
      expect(result).toBe(false);
    });
  });

  describe('Activation and Deactivation', () => {
    beforeEach(() => {
      // Add charges to all power-ups for testing
      Object.values(PowerUpType).forEach(type => {
        powerUpManager.addCharges(type, 1);
      });
    });

    it('should activate power-up when charges are available', () => {
      const result = powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      expect(result).toBe(true);
      
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      expect(state!.isActive).toBe(true);
      expect(state!.charges).toBe(0); // Charge consumed
    });

    it('should not activate power-up without charges', () => {
      // Don't add charges
      powerUpManager.reset();
      powerUpManager.initializeRun();
      
      const result = powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      expect(result).toBe(false);
    });

    it('should deactivate power-up', () => {
      powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      powerUpManager.deactivatePowerUp(PowerUpType.SLOW_MO_SURGE);
      
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      expect(state!.isActive).toBe(false);
    });

    it('should handle multiple simultaneous power-ups', () => {
      powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      powerUpManager.activatePowerUp(PowerUpType.MAGNETIC_GUIDE);
      
      expect(powerUpManager.isPowerUpActive(PowerUpType.SLOW_MO_SURGE)).toBe(true);
      expect(powerUpManager.isPowerUpActive(PowerUpType.MAGNETIC_GUIDE)).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should track active power-ups correctly', () => {
      powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 1);
      powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      
      const activePowerUps = powerUpManager.getActivePowerUps();
      expect(activePowerUps.size).toBeGreaterThan(0);
      
      const activeSlowMo = activePowerUps.get(PowerUpType.SLOW_MO_SURGE);
      expect(activeSlowMo?.isActive).toBe(true);
    });

    it('should expire power-ups after duration', async () => {
      powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 1);
      powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      
      // Simulate time passing
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      if (state) {
        state.startTime = Date.now() - state.duration - 1000; // Expired
      }
      
      powerUpManager.update(16); // 1 frame
      
      expect(powerUpManager.isPowerUpActive(PowerUpType.SLOW_MO_SURGE)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate power-up states', () => {
      powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 1);
      powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
      
      const errors = powerUpManager.getValidationErrors();
      expect(errors).toEqual([]);
    });

    it('should detect invalid states', () => {
      // Force invalid state for testing
      const state = powerUpManager.getPowerUpState(PowerUpType.SLOW_MO_SURGE);
      if (state) {
        (state as any).charges = -1; // Invalid negative charges
      }
      
      powerUpManager.update(16);
      const errors = powerUpManager.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Ball Physics Integration', () => {
    it('should return correct physics properties for different ball types', () => {
      // Test standard ball
      powerUpManager.setCurrentBallType(BallType.STANDARD);
      const standardPhysics = powerUpManager.getBallPhysicsProperties();
      expect(standardPhysics.mass).toBeGreaterThan(0);
      expect(standardPhysics.friction).toBeGreaterThanOrEqual(0);
      expect(standardPhysics.restitution).toBeGreaterThanOrEqual(0);

      // Test heavy ball (if unlocked in test)
      const progress = powerUpManager.getUpgradeProgress();
      progress.unlockedBallTypes.push(BallType.HEAVY);
      powerUpManager.updateUpgradeProgress(progress);
      
      powerUpManager.setCurrentBallType(BallType.HEAVY);
      const heavyPhysics = powerUpManager.getBallPhysicsProperties();
      expect(heavyPhysics.mass).toBeGreaterThan(standardPhysics.mass);
    });
  });
});

describe('PowerUpEffects', () => {
  let powerUpEffects: PowerUpEffects;
  let mockPhysicsEngine: PhysicsEngine;
  let mockTiltingBar: TiltingBar;
  let context: EffectContext;

  beforeEach(() => {
    powerUpEffects = new PowerUpEffects();
    mockPhysicsEngine = new PhysicsEngine();
    mockTiltingBar = new TiltingBar({
      position: { x: 180, y: 590 },
      width: 360,
      height: 8,
      maxRotation: Math.PI / 4,
      rotationSpeed: 3,
      friction: 0.05,
    });

    context = {
      physicsEngine: mockPhysicsEngine,
      tiltingBar: mockTiltingBar,
      currentTime: Date.now(),
      deltaTime: 16.67,
      targetPosition: { x: 180, y: 50 },
    };
  });

  describe('Physics Effects', () => {
    it('should apply physics effects correctly', () => {
      const setSpeedMultiplierSpy = vi.spyOn(mockTiltingBar, 'setSpeedMultiplier');
      
      powerUpEffects.applyPhysicsEffects(PowerUpType.OVERCLOCK_BOOST, context);
      
      expect(setSpeedMultiplierSpy).toHaveBeenCalledWith(1.5);
    });

    it('should remove physics effects correctly', () => {
      const setSpeedMultiplierSpy = vi.spyOn(mockTiltingBar, 'setSpeedMultiplier');
      
      powerUpEffects.applyPhysicsEffects(PowerUpType.OVERCLOCK_BOOST, context);
      powerUpEffects.removePhysicsEffects(PowerUpType.OVERCLOCK_BOOST, context);
      
      expect(setSpeedMultiplierSpy).toHaveBeenLastCalledWith(1.0);
    });

    it('should track active physics effects', () => {
      powerUpEffects.applyPhysicsEffects(PowerUpType.SLOW_MO_SURGE, context);
      
      const activeEffects = powerUpEffects.getActivePhysicsEffects();
      expect(activeEffects.has(PowerUpType.SLOW_MO_SURGE)).toBe(true);
    });
  });

  describe('Visual Effects', () => {
    it('should generate visual effects for active power-ups', () => {
      const activePowerUps = new Map();
      activePowerUps.set(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      const visualEffects = powerUpEffects.getVisualEffects(activePowerUps, context);
      expect(visualEffects.length).toBeGreaterThan(0);
    });

    it('should cache visual effects for performance', () => {
      const activePowerUps = new Map();
      activePowerUps.set(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      // First call
      const effects1 = powerUpEffects.getVisualEffects(activePowerUps, context);
      const cacheStats1 = powerUpEffects.getCacheStats();
      
      // Second call should use cache
      const effects2 = powerUpEffects.getVisualEffects(activePowerUps, context);
      const cacheStats2 = powerUpEffects.getCacheStats();
      
      expect(cacheStats2.visualCacheSize).toBeGreaterThanOrEqual(cacheStats1.visualCacheSize);
    });
  });

  describe('Shield Functionality', () => {
    it('should detect when shield should be used', () => {
      const ballPosition = { x: 180, y: 700 }; // Below screen
      const bounds = { width: 360, height: 640 };
      
      const shouldUse = powerUpEffects.shouldUseShield(ballPosition, bounds);
      expect(shouldUse).toBe(true);
    });

    it('should not use shield when ball is safe', () => {
      const ballPosition = { x: 180, y: 300 }; // Safe position
      const bounds = { width: 360, height: 640 };
      
      const shouldUse = powerUpEffects.shouldUseShield(ballPosition, bounds);
      expect(shouldUse).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear caches correctly', () => {
      // Generate some cached effects first
      const activePowerUps = new Map();
      activePowerUps.set(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });
      
      powerUpEffects.getVisualEffects(activePowerUps, context);
      
      // Clear caches
      powerUpEffects.clearVisualCache();
      powerUpEffects.clearPathCache();
      
      const cacheStats = powerUpEffects.getCacheStats();
      expect(cacheStats.visualCacheSize).toBe(0);
      expect(cacheStats.pathCacheSize).toBe(0);
    });
  });
});

describe('PowerUpEventSystem', () => {
  let eventSystem: PowerUpEventSystem;
  let callbackSpy: any;

  beforeEach(() => {
    eventSystem = new PowerUpEventSystem();
    callbackSpy = vi.fn();
  });

  describe('Event Registration', () => {
    it('should register and execute callbacks', () => {
      eventSystem.registerGlobalCallbacks({
        onActivated: callbackSpy,
      });

      eventSystem.emitActivated(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      expect(callbackSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle type-specific callbacks', () => {
      eventSystem.registerPowerUpCallbacks(PowerUpType.SLOW_MO_SURGE, {
        onActivated: callbackSpy,
      });

      eventSystem.emitActivated(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      expect(callbackSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event History', () => {
    it('should track event history', () => {
      eventSystem.emitActivated(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      const history = eventSystem.getEventHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe(PowerUpType.SLOW_MO_SURGE);
    });

    it('should provide usage statistics', () => {
      eventSystem.emitActivated(PowerUpType.SLOW_MO_SURGE, {
        type: PowerUpType.SLOW_MO_SURGE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      eventSystem.emitActivated(PowerUpType.MAGNETIC_GUIDE, {
        type: PowerUpType.MAGNETIC_GUIDE,
        isActive: true,
        startTime: Date.now(),
        duration: 5000,
        charges: 1,
        maxCharges: 1,
      });

      const stats = eventSystem.getUsageStatistics();
      expect(stats.totalActivations).toBe(2);
      expect(stats.activationsByType[PowerUpType.SLOW_MO_SURGE]).toBe(1);
      expect(stats.activationsByType[PowerUpType.MAGNETIC_GUIDE]).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });

      eventSystem.registerGlobalCallbacks({
        onActivated: errorCallback,
      });

      // Should not throw
      expect(() => {
        eventSystem.emitActivated(PowerUpType.SLOW_MO_SURGE, {
          type: PowerUpType.SLOW_MO_SURGE,
          isActive: true,
          startTime: Date.now(),
          duration: 5000,
          charges: 1,
          maxCharges: 1,
        });
      }).not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  let powerUpManager: PowerUpManager;
  let powerUpEffects: PowerUpEffects;
  let eventSystem: PowerUpEventSystem;
  let context: EffectContext;

  beforeEach(() => {
    eventSystem = new PowerUpEventSystem();
    powerUpManager = new PowerUpManager(eventSystem);
    powerUpEffects = new PowerUpEffects();
    
    const mockPhysicsEngine = new PhysicsEngine();
    const mockTiltingBar = new TiltingBar({
      position: { x: 180, y: 590 },
      width: 360,
      height: 8,
      maxRotation: Math.PI / 4,
      rotationSpeed: 3,
      friction: 0.05,
    });

    context = {
      physicsEngine: mockPhysicsEngine,
      tiltingBar: mockTiltingBar,
      currentTime: Date.now(),
      deltaTime: 16.67,
      targetPosition: { x: 180, y: 50 },
    };

    powerUpManager.initializeRun();
  });

  it('should handle complete power-up lifecycle', () => {
    const activationSpy = vi.fn();
    const deactivationSpy = vi.fn();

    eventSystem.registerGlobalCallbacks({
      onActivated: activationSpy,
      onDeactivated: deactivationSpy,
    });

    // Add charges and activate
    powerUpManager.addCharges(PowerUpType.SLOW_MO_SURGE, 1);
    const activationResult = powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE);
    
    expect(activationResult).toBe(true);
    expect(activationSpy).toHaveBeenCalledTimes(1);

    // Apply physics effects
    powerUpEffects.applyPhysicsEffects(PowerUpType.SLOW_MO_SURGE, context);
    const activeEffects = powerUpEffects.getActivePhysicsEffects();
    expect(activeEffects.has(PowerUpType.SLOW_MO_SURGE)).toBe(true);

    // Deactivate
    powerUpManager.deactivatePowerUp(PowerUpType.SLOW_MO_SURGE);
    expect(deactivationSpy).toHaveBeenCalledTimes(1);

    // Remove physics effects
    powerUpEffects.removePhysicsEffects(PowerUpType.SLOW_MO_SURGE, context);
    const finalEffects = powerUpEffects.getActivePhysicsEffects();
    expect(finalEffects.has(PowerUpType.SLOW_MO_SURGE)).toBe(false);
  });

  it('should maintain state consistency across updates', () => {
    powerUpManager.addCharges(PowerUpType.MAGNETIC_GUIDE, 1);
    powerUpManager.activatePowerUp(PowerUpType.MAGNETIC_GUIDE);

    // Multiple updates should maintain consistency
    for (let i = 0; i < 10; i++) {
      powerUpManager.update(16);
      const errors = powerUpManager.getValidationErrors();
      expect(errors).toEqual([]);
    }
  });

  it('should handle concurrent power-up operations', () => {
    // Add charges to multiple power-ups
    Object.values(PowerUpType).forEach(type => {
      powerUpManager.addCharges(type, 1);
    });

    // Activate all power-ups
    const results = Object.values(PowerUpType).map(type => 
      powerUpManager.activatePowerUp(type)
    );

    expect(results.every(result => result === true)).toBe(true);

    // Check all are active
    Object.values(PowerUpType).forEach(type => {
      expect(powerUpManager.isPowerUpActive(type)).toBe(true);
    });
  });
});

describe('Performance Tests', () => {
  let powerUpEffects: PowerUpEffects;
  let context: EffectContext;

  beforeEach(() => {
    powerUpEffects = new PowerUpEffects();
    
    const mockPhysicsEngine = new PhysicsEngine();
    const mockTiltingBar = new TiltingBar({
      position: { x: 180, y: 590 },
      width: 360,
      height: 8,
      maxRotation: Math.PI / 4,
      rotationSpeed: 3,
      friction: 0.05,
    });

    context = {
      physicsEngine: mockPhysicsEngine,
      tiltingBar: mockTiltingBar,
      currentTime: Date.now(),
      deltaTime: 16.67,
      targetPosition: { x: 180, y: 50 },
    };
  });

  it('should maintain performance with frequent visual effect requests', () => {
    const activePowerUps = new Map();
    activePowerUps.set(PowerUpType.SLOW_MO_SURGE, {
      type: PowerUpType.SLOW_MO_SURGE,
      isActive: true,
      startTime: Date.now(),
      duration: 5000,
      charges: 1,
      maxCharges: 1,
    });

    const startTime = performance.now();
    
    // Generate visual effects many times
    for (let i = 0; i < 100; i++) {
      powerUpEffects.getVisualEffects(activePowerUps, context);
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Should complete within reasonable time (less than 100ms for 100 calls)
    expect(executionTime).toBeLessThan(100);
  });

  it('should have effective caching', () => {
    const activePowerUps = new Map();
    activePowerUps.set(PowerUpType.SLOW_MO_SURGE, {
      type: PowerUpType.SLOW_MO_SURGE,
      isActive: true,
      startTime: Date.now(),
      duration: 5000,
      charges: 1,
      maxCharges: 1,
    });

    // First call to populate cache
    powerUpEffects.getVisualEffects(activePowerUps, context);
    
    const firstCacheStats = powerUpEffects.getCacheStats();
    
    // Multiple calls should increase cache efficiency
    for (let i = 0; i < 10; i++) {
      powerUpEffects.getVisualEffects(activePowerUps, context);
    }
    
    const finalCacheStats = powerUpEffects.getCacheStats();
    expect(finalCacheStats.visualCacheSize).toBeGreaterThanOrEqual(firstCacheStats.visualCacheSize);
  });
}); 
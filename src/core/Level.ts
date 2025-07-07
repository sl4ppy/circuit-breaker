// Circuit Breaker - Level System
// Hole-based navigation system where players guide the ball through holes to reach the goal

import { Vector2 } from '../utils/MathUtils';
import { logger } from '../utils/Logger';
import { PowerUpType } from './PowerUpManager';

export interface Hole {
  id: string;
  position: Vector2;
  radius: number;
  isGoal: boolean;
  isActive: boolean;
  powerUpType?: PowerUpType; // Optional power-up type for power-up holes
  
  // Saucer behavior for power-up holes
  saucerState?: {
    isActive: boolean;
    ballId?: string;
    startTime: number;
    phase: 'sinking' | 'waiting' | 'ejecting';
    sinkDuration: number;
    waitDuration: number;
    kickDirection: { x: number; y: number };
    kickForce: number;
    sinkDepth: number; // How deep the ball sinks (0-1)
  };
  
  // Track recently kicked balls to prevent re-entry
  recentlyKickedBalls?: Set<string>;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  holes: Hole[];
  goalHoles: Hole[]; // Changed from single goalHole to multiple goalHoles
  ballStartPosition: Vector2;
  difficulty: number;
  bonusMultiplier: number;
  requiredGoals: number; // Number of goals that must be reached to complete level
}

export class Level {
  private levelData: LevelData;
  private isCompleted: boolean = false;
  private elapsedTime: number = 0;
  private completedGoals: Set<string> = new Set(); // Track completed goal holes

  constructor(levelData: LevelData) {
    this.levelData = levelData;
    logger.info(
      `📋 Level ${levelData.id} loaded: ${levelData.name} (${levelData.goalHoles.length} goals)`,
      null,
      'Level',
    );
  }

  /**
   * Start the level timer
   */
  public start(): void {
    this.elapsedTime = 0;
    this.isCompleted = false;
    logger.info(`🏁 Level ${this.levelData.id} started`, null, 'Level');
  }

  /**
   * Update level state
   */
  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    // Update hole glow effects
    this.levelData.holes.forEach(hole => {
      if (hole.isGoal) {
        // Goal hole pulses with a bright glow
        hole.isActive = true;
      } else {
        // Regular holes are always active
        hole.isActive = true;
      }
    });
  }

  /**
   * Check if ball falls into any hole
   */
  public checkHoleCollision(
    ballPosition: Vector2,
    _ballRadius: number,
    ballId?: string,
  ): Hole | null {
    for (const hole of this.levelData.holes) {
      if (!hole.isActive) continue;

      // Skip completed goal holes - balls can no longer fall into them
      if (hole.isGoal && this.completedGoals.has(hole.id)) {
        continue;
      }

      // Skip holes that are currently in saucer mode
      if (hole.saucerState?.isActive) {
        continue;
      }

      // Skip holes if this ball was recently kicked from them
      if (ballId && hole.recentlyKickedBalls?.has(ballId)) {
        continue;
      }

      const dx = ballPosition.x - hole.position.x;
      const dy = ballPosition.y - hole.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Ball falls into hole only when ball center crosses into hole boundary
      if (distance <= hole.radius) {
        logger.info(`🕳️ Ball fell into hole: ${hole.id}`, null, 'Level');
        return hole;
      }
    }
    return null;
  }

  /**
   * Check if ball reaches the goal hole
   */
  public checkGoalReached(ballPosition: Vector2, _ballRadius: number): boolean {
    for (const goalHole of this.levelData.goalHoles) {
      // Skip goal holes that are already completed
      if (this.completedGoals.has(goalHole.id)) {
        continue;
      }

      const dx = ballPosition.x - goalHole.position.x;
      const dy = ballPosition.y - goalHole.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Ball reaches goal only when ball center crosses into goal hole boundary
      if (distance <= goalHole.radius) {
        logger.info(`🎯 Ball reached goal hole: ${goalHole.id}`, null, 'Level');
        this.completedGoals.add(goalHole.id);
        return true;
      }
    }
    return false;
  }

  /**
   * Check if ball falls off the screen (failure condition)
   */
  public checkBallFallOff(
    ballPosition: Vector2,
    screenBounds: Vector2,
  ): boolean {
    return ballPosition.y > screenBounds.y + 50; // 50px buffer below screen
  }

  /**
   * Check if level is complete
   */
  public checkLevelComplete(): boolean {
    // Level is complete when all required goals are reached
    if (
      !this.isCompleted &&
      this.completedGoals.size >= this.levelData.requiredGoals
    ) {
      this.markComplete();
      return true;
    }
    return this.isCompleted;
  }

  /**
   * Get number of completed goals
   */
  public getCompletedGoals(): number {
    return this.completedGoals.size;
  }

  /**
   * Get required number of goals
   */
  public getRequiredGoals(): number {
    return this.levelData.requiredGoals;
  }

  /**
   * Check if all goals are completed
   */
  public areAllGoalsCompleted(): boolean {
    return this.completedGoals.size >= this.levelData.requiredGoals;
  }

  /**
   * Check if a specific goal hole has been completed
   */
  public isGoalCompleted(goalId: string): boolean {
    return this.completedGoals.has(goalId);
  }

  /**
   * Get goal hole at a specific position
   */
  public getGoalHoleAtPosition(ballPosition: Vector2): Hole | null {
    for (const goalHole of this.levelData.goalHoles) {
      const dx = ballPosition.x - goalHole.position.x;
      const dy = ballPosition.y - goalHole.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= goalHole.radius) {
        return goalHole;
      }
    }
    return null;
  }

  /**
   * Mark level as complete
   */
  public markComplete(): void {
    if (!this.isCompleted) {
      this.isCompleted = true;
      logger.info(`🏆 Level ${this.levelData.id} completed!`, null, 'Level');
    }
  }

  /**
   * Calculate level score based on time and completion
   */
  public calculateScore(): number {
    const baseScore = 1000; // Base score for completing level

    // Time bonus (faster completion = higher score)
    const timeBonus = Math.max(0, (60000 - this.elapsedTime) / 100); // 60 seconds max bonus

    return Math.floor((baseScore + timeBonus) * this.levelData.bonusMultiplier);
  }

  /**
   * Get level progress (0-1)
   */
  public getProgress(): number {
    // Progress based on ball's Y position (higher = more progress)
    // This will be calculated by the game based on ball position
    return this.isCompleted ? 1.0 : 0.0;
  }

  /**
   * Get level data
   */
  public getLevelData(): LevelData {
    return this.levelData;
  }

  /**
   * Start saucer behavior for a power-up hole
   */
  public startSaucerBehavior(holeId: string, ballId: string, currentTime: number): void {
    const hole = this.levelData.holes.find(h => h.id === holeId);
    if (!hole || !hole.powerUpType) return;

    // Calculate kick direction (upward and slightly random)
    const kickAngle = Math.PI * 0.75 + (Math.random() - 0.5) * 0.5; // 135° ± 15°
    const kickDirection = {
      x: Math.cos(kickAngle),
      y: Math.sin(kickAngle)
    };

    hole.saucerState = {
      isActive: true,
      ballId: ballId,
      startTime: currentTime,
      phase: 'sinking',
      sinkDuration: 500, // 0.5 seconds to sink
      waitDuration: 2000 + Math.random() * 2000, // 2-4 seconds to wait
      kickDirection: kickDirection,
      kickForce: 200 + Math.random() * 150, // Lighter kick force (200-350)
      sinkDepth: 0 // Start at surface
    };

    logger.info(`🛸 Started saucer behavior for hole: ${holeId}`, null, 'Level');
  }

  /**
   * Get the target position for a ball in a saucer (with sink depth)
   */
  public getSaucerBallPosition(holeId: string): { x: number; y: number } | null {
    const hole = this.levelData.holes.find(h => h.id === holeId);
    if (!hole || !hole.saucerState?.isActive) return null;

    const saucerState = hole.saucerState;
    const sinkOffset = saucerState.sinkDepth * 8; // Sink up to 8 pixels deep

    // Return position with sink depth applied
    return {
      x: hole.position.x,
      y: hole.position.y + sinkOffset
    };
  }

  /**
   * Update saucer behavior and return kick data if ready
   */
  public updateSaucerBehavior(currentTime: number): { ballId: string; direction: { x: number; y: number }; force: number; holeId: string } | null {
    for (const hole of this.levelData.holes) {
      if (!hole.saucerState?.isActive) continue;

      const elapsed = currentTime - hole.saucerState.startTime;
      const saucerState = hole.saucerState;

      if (saucerState.phase === 'sinking') {
        // Ball is sinking into the saucer
        const sinkProgress = Math.min(elapsed / saucerState.sinkDuration, 1);
        saucerState.sinkDepth = sinkProgress;

        if (sinkProgress >= 1) {
          // Transition to waiting phase
          saucerState.phase = 'waiting';
          saucerState.startTime = currentTime; // Reset timer for waiting phase
          logger.info(`⏳ Saucer waiting phase started for hole: ${hole.id}`, null, 'Level');
        }
      } else if (saucerState.phase === 'waiting') {
        // Ball is waiting in the saucer
        const waitElapsed = currentTime - saucerState.startTime;
        if (waitElapsed >= saucerState.waitDuration) {
          // Transition to ejecting phase
          saucerState.phase = 'ejecting';
          saucerState.startTime = currentTime; // Reset timer for ejecting phase
          logger.info(`🚀 Saucer ejecting phase started for hole: ${hole.id}`, null, 'Level');
        }
      } else if (saucerState.phase === 'ejecting') {
        // Ball is being ejected
        const ejectElapsed = currentTime - saucerState.startTime;
        if (ejectElapsed >= 200) { // 0.2 seconds to complete ejection
          // Saucer is ready to kick the ball
          const kickData = {
            ballId: saucerState.ballId!,
            direction: saucerState.kickDirection,
            force: saucerState.kickForce,
            holeId: hole.id
          };

          // Remove the power-up saucer entirely from the playfield
          hole.saucerState = undefined;
          hole.isActive = false;
          
          // Track this ball as recently kicked to prevent re-entry
          if (!hole.recentlyKickedBalls) {
            hole.recentlyKickedBalls = new Set();
          }
          hole.recentlyKickedBalls.add(saucerState.ballId!);
          
          // Clear the recently kicked balls after a short delay (1 second)
          setTimeout(() => {
            if (hole.recentlyKickedBalls) {
              hole.recentlyKickedBalls.delete(saucerState.ballId!);
            }
          }, 1000);
          
          logger.info(`🚀 Saucer removed from playfield after ejecting ball from hole: ${hole.id}`, null, 'Level');
          return kickData;
        }
      }
    }
    return null;
  }

  /**
   * Check if a ball is currently in a saucer
   */
  public isBallInSaucer(ballId: string): boolean {
    return this.levelData.holes.some(hole => 
      hole.saucerState?.isActive && hole.saucerState.ballId === ballId
    );
  }

  /**
   * Deactivate a specific hole (used for power-up holes after collection)
   */
  public deactivateHole(holeId: string): void {
    const hole = this.levelData.holes.find(h => h.id === holeId);
    if (hole) {
      hole.isActive = false;
      logger.info(`🚫 Deactivated hole: ${holeId}`, null, 'Level');
    }
  }

  /**
   * Reset level state
   */
  public reset(): void {
    this.isCompleted = false;
    this.elapsedTime = 0;
    this.completedGoals.clear();

    // Reset all holes
    this.levelData.holes.forEach(hole => {
      hole.isActive = true;
    });

    logger.info(`🔄 Level ${this.levelData.id} reset`, null, 'Level');
  }
}

export class LevelManager {
  private levels: Map<number, LevelData> = new Map();
  private currentLevel: Level | null = null;
  private unlockedLevels: Set<number> = new Set([1]); // Level 1 is unlocked by default

  constructor() {
    logger.info('📚 LevelManager initialized', null, 'LevelManager');
    this.loadLevels();
  }

  /**
   * Generate holes for a level with increasing density from bottom to top
   */
  private generateHoles(levelId: number): { holes: Hole[]; goalHoles: Hole[] } {
    const holes: Hole[] = [];
    const PLAYFIELD_WIDTH = 360;
    const BALL_RADIUS = 14;
    const HOLE_RADIUS = BALL_RADIUS; // Holes are exactly ball size
    const BUFFER = 8; // Minimum spacing between holes

    // Bar starts at Y=590, so holes should start at least 10px above that
    const BAR_START_POSITION = 590;
    const HOLE_START_Y = BAR_START_POSITION - 10; // Y=580
    const TOP_BOUNDARY = 50; // Top of playfield
    const GOAL_AREA_HEIGHT = 100; // Reserve top 100px for goal

    // Power-up hole configurations - limit to 1-2 power-ups per level
    const maxPowerUpsPerLevel = Math.min(2, Math.max(1, Math.floor(levelId / 2))); // 1 for level 1-2, 2 for level 3+
    const powerUpHoleConfigs = [
      { type: PowerUpType.SLOW_MO_SURGE, spawnChance: 0.15, color: '#00ffff' },
      { type: PowerUpType.MAGNETIC_GUIDE, spawnChance: 0.12, color: '#ff00ff' },
      { type: PowerUpType.CIRCUIT_PATCH, spawnChance: 0.08, color: '#00ff00' },
      { type: PowerUpType.OVERCLOCK_BOOST, spawnChance: 0.10, color: '#ff6600' },
      { type: PowerUpType.SCAN_REVEAL, spawnChance: 0.06, color: '#ffff00' },
    ];

    // Generate goal holes near the top (Y: 50-150)
    const goalHoles: Hole[] = [];
    const numGoals = levelId + 1; // Level 1 = 2 goals, Level 2 = 3 goals, etc.

    for (let i = 0; i < numGoals; i++) {
      let attempts = 0;
      let validPosition = false;

      while (!validPosition && attempts < 100) {
        const goalX = 50 + Math.random() * (PLAYFIELD_WIDTH - 100);
        const goalY = TOP_BOUNDARY + Math.random() * GOAL_AREA_HEIGHT;

        // Check if position is valid (not too close to other goal holes)
        validPosition = true;
        for (const existingGoal of goalHoles) {
          const dx = goalX - existingGoal.position.x;
          const dy = goalY - existingGoal.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < HOLE_RADIUS * 3 + BUFFER) {
            // More spacing for goal holes
            validPosition = false;
            break;
          }
        }

        if (validPosition) {
          goalHoles.push({
            id: `goal-${levelId}-${i}`,
            position: { x: goalX, y: goalY },
            radius: HOLE_RADIUS,
            isGoal: true,
            isActive: true,
          });
        }

        attempts++;
      }
    }

    // Add goal holes to the holes array
    holes.push(...goalHoles);

    // Generate regular holes with INCREASING density toward the top
    const sections = 10; // Divide playfield into sections
    const playableHeight = HOLE_START_Y - (TOP_BOUNDARY + GOAL_AREA_HEIGHT); // Y=580 to Y=150
    const sectionHeight = playableHeight / sections;

    // Difficulty scaling - sparse at bottom, dense at top
    const baseDensity = 0.05 + (levelId - 1) * 0.01; // Very sparse at bottom
    const maxDensity = 0.3 + (levelId - 1) * 0.08; // Dense at top

    // Track power-up holes to limit them
    let powerUpHolesCreated = 0;

    for (let section = 0; section < sections; section++) {
      // Section 0 is at bottom (Y=580), section 9 is near top (Y=150)
      const sectionY = HOLE_START_Y - (section + 1) * sectionHeight;

      // Density increases as we go toward the top (higher section number = higher density)
      const sectionDensity = baseDensity + (section / sections) * maxDensity;
      const holesInSection = Math.floor(sectionDensity * 12); // 12 holes max per section

      for (let i = 0; i < holesInSection; i++) {
        let attempts = 0;
        let validPosition = false;

        while (!validPosition && attempts < 50) {
          const x =
            HOLE_RADIUS + Math.random() * (PLAYFIELD_WIDTH - 2 * HOLE_RADIUS);
          const y = sectionY + Math.random() * sectionHeight;

          // Check if position is valid (not too close to other holes)
          validPosition = true;
          for (const existingHole of holes) {
            const dx = x - existingHole.position.x;
            const dy = y - existingHole.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < HOLE_RADIUS * 2 + BUFFER) {
              validPosition = false;
              break;
            }
          }

          if (validPosition) {
            // Determine if this hole should be a power-up hole
            let powerUpType: PowerUpType | undefined = undefined;
            
            // Only create power-up holes if we haven't reached the limit
            if (powerUpHolesCreated < maxPowerUpsPerLevel) {
              // Check each power-up type for this hole
              for (const config of powerUpHoleConfigs) {
                if (Math.random() < config.spawnChance) {
                  powerUpType = config.type;
                  powerUpHolesCreated++;
                  break; // Only one power-up per hole
                }
              }
            }
            
            holes.push({
              id: `hole-${levelId}-${section}-${i}`,
              position: { x, y },
              radius: HOLE_RADIUS,
              isGoal: false,
              isActive: true,
              powerUpType: powerUpType,
            });
          }

          attempts++;
        }
      }
    }

    logger.info(
      `🕳️ Generated ${holes.length} holes for level ${levelId} (${powerUpHolesCreated} power-up holes, sparse at bottom, dense at top)`,
      null,
      'Level',
    );

    return { holes, goalHoles };
  }

  /**
   * Load all level definitions
   */
  private loadLevels(): void {
    // Generate 5 levels with increasing difficulty
    for (let levelId = 1; levelId <= 5; levelId++) {
      const { holes, goalHoles } = this.generateHoles(levelId);

      const levelData: LevelData = {
        id: levelId,
        name: `Circuit Level ${levelId}`,
        description: `Navigate through the holes to reach the goal circuit. Difficulty: ${levelId}/5`,
        holes,
        goalHoles,
        ballStartPosition: { x: 343, y: 584 }, // On the tilting bar (bar starts at Y=590, ball should be slightly above)
        difficulty: levelId,
        bonusMultiplier: 1.0 + (levelId - 1) * 0.2,
        requiredGoals: goalHoles.length,
      };

      this.levels.set(levelId, levelData);
    }

    logger.info(`📚 Loaded ${this.levels.size} levels`, null, 'LevelManager');
  }

  /**
   * Load a specific level
   */
  public loadLevel(levelId: number): Level | null {
    const levelData = this.levels.get(levelId);
    if (!levelData) {
      logger.warn(`⚠️ Level ${levelId} not found`, null, 'Level');
      return null;
    }

    if (!this.isLevelUnlocked(levelId)) {
      logger.warn(`🔒 Level ${levelId} is locked`, null, 'Level');
      return null;
    }

    this.currentLevel = new Level(levelData);
    return this.currentLevel;
  }

  /**
   * Check if level is unlocked
   */
  public isLevelUnlocked(levelId: number): boolean {
    return this.unlockedLevels.has(levelId);
  }

  /**
   * Unlock a level
   */
  public unlockLevel(levelId: number): void {
    if (!this.unlockedLevels.has(levelId)) {
      this.unlockedLevels.add(levelId);
      logger.info(`🔓 Level ${levelId} unlocked`, null, 'Level');
    }
  }

  /**
   * Get current level
   */
  public getCurrentLevel(): Level | null {
    return this.currentLevel;
  }

  /**
   * Get available levels
   */
  public getAvailableLevels(): number[] {
    return Array.from(this.levels.keys());
  }

  /**
   * Get unlocked levels
   */
  public getUnlockedLevels(): number[] {
    return Array.from(this.unlockedLevels);
  }

  /**
   * Get level data
   */
  public getLevelData(levelId: number): LevelData | null {
    return this.levels.get(levelId) || null;
  }
}

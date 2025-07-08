// Circuit Breaker - Level System
// Hole-based navigation system where players guide the ball through holes to reach the goal

import { Vector2, MathUtils } from '../utils/MathUtils';
import { logger } from '../utils/Logger';
import { PowerUpType } from './PowerUpTypes';
import { parseAsciiLevel } from './AsciiLevelParser';
// Removed fs import - using fetch for browser compatibility

export interface Hole {
  id: string;
  position: Vector2;
  radius: number;
  isGoal: boolean;
  isActive: boolean;
  powerUpType?: PowerUpType; // Optional power-up type for power-up holes
  
  // Movement type: static (default), animated (cycling), or moving (bouncing)
  movementType?: 'static' | 'animated' | 'moving';
  // For moving holes
  movementAxis?: 'x' | 'y';
  movementBounds?: { min: number; max: number };
  movementState?: {
    direction: 1 | -1; // 1 = forward, -1 = backward
    phase: 'moving' | 'stopping' | 'starting';
    progress: number; // 0 to 1 progress along the path
    lastUpdate: number;
    duration: number; // ms for this segment
    stopTime?: number; // for pausing at ends
  };
  
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
  
  // Animation state for animated holes
  animationState?: {
    isAnimated: boolean;
    phase: 'animating_in' | 'idle' | 'animating_out' | 'hidden';
    startTime: number;
    animatingInDuration: number; // 0.5 seconds with easeOutBack (bouncy entrance)
    idleDuration: number; // 3-10 seconds
    animatingOutDuration: number; // 0.5 seconds with easeInBack (smooth acceleration out)
    hiddenDuration: number; // Invisible/inactive duration
    currentScale: number; // 0.0 to 1.0 scale multiplier
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
  private timerStarted: boolean = false;
  private timerStopped: boolean = false;
  private completedGoals: Set<string> = new Set(); // Track completed goal holes
  private onSoundEffect?: (soundName: string) => void;

  constructor(levelData: LevelData, onSoundEffect?: (soundName: string) => void) {
    this.levelData = levelData;
    this.onSoundEffect = onSoundEffect;
    logger.info(
      `📋 Level ${levelData.id} loaded: ${levelData.name} (${levelData.goalHoles.length} goals)`,
      null,
      'Level',
    );
  }

  /**
   * Start the level (but not the timer - timer starts on first player input)
   */
  public start(): void {
    this.elapsedTime = 0;
    this.timerStarted = false;
    this.timerStopped = false;
    this.isCompleted = false;
    logger.info(`🏁 Level ${this.levelData.id} started - waiting for first player input to start timer`, null, 'Level');
  }

  /**
   * Start the timer (called when player first moves the bar)
   */
  public startTimer(): void {
    if (!this.timerStarted && !this.timerStopped) {
      this.timerStarted = true;
      logger.info(`⏰ Timer started for Level ${this.levelData.id}`, null, 'Level');
    }
  }

  /**
   * Stop the timer (called when level is completed)
   */
  public stopTimer(): void {
    if (this.timerStarted && !this.timerStopped) {
      this.timerStopped = true;
      logger.info(`⏱️ Timer stopped for Level ${this.levelData.id} - Final time: ${this.getFormattedTime()}`, null, 'Level');
    }
  }

  /**
   * Add time bonus (subtract time from elapsed time)
   */
  public addTimeBonus(bonusSeconds: number): void {
    if (this.timerStarted && !this.timerStopped) {
      const bonusMs = bonusSeconds * 1000;
      this.elapsedTime = Math.max(0, this.elapsedTime - bonusMs);
      logger.info(`⚡ Time bonus applied: -${bonusSeconds}s - New time: ${this.getFormattedTime()}`, null, 'Level');
    }
  }

  /**
   * Get current elapsed time in milliseconds
   */
  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Get formatted time string (MM:SS.sss)
   */
  public getFormattedTime(): string {
    const totalSeconds = this.elapsedTime / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }

  /**
   * Check if timer is running
   */
  public isTimerRunning(): boolean {
    return this.timerStarted && !this.timerStopped;
  }

  /**
   * Check if timer has been started
   */
  public hasTimerStarted(): boolean {
    return this.timerStarted;
  }

  /**
   * Update level state - only increment timer if it's running
   */
  public update(deltaTime: number): void {
    // Only increment elapsed time if timer is running
    if (this.timerStarted && !this.timerStopped) {
      this.elapsedTime += deltaTime;
    }

    // Update animated holes
    this.updateAnimatedHoles(Date.now());

    // Update hole glow effects
    this.levelData.holes.forEach(hole => {
      if (hole.isGoal) {
        // Goal hole pulses with a bright glow
        hole.isActive = true;
      } else if (!hole.animationState?.isAnimated) {
        // Regular holes are always active (unless they're animated)
        hole.isActive = true;
      }
      // Animated holes manage their own isActive state
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
      this.stopTimer(); // Stop the timer when level is completed
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
   * Get all holes in the level
   */
  public getHoles(): Hole[] {
    return this.levelData.holes;
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
      y: Math.sin(kickAngle),
    };

    hole.saucerState = {
      isActive: true,
      ballId: ballId,
      startTime: currentTime,
      phase: 'sinking', // Natural sinking phase
      sinkDuration: 600, // 0.6 seconds for aggressive sinking
      waitDuration: 1000 + Math.random() * 4000, // 1-5 seconds to wait
      kickDirection: kickDirection,
      kickForce: 200 + Math.random() * 150, // Lighter kick force (200-350)
      sinkDepth: 0, // Start at surface, sink gradually
    };

    logger.info(`🛸 Started saucer behavior for hole: ${holeId} - ball sinking naturally`, null, 'Level');
  }

  /**
   * Get the target position for a ball in a saucer (center aligned with saucer)
   */
  public getSaucerBallPosition(holeId: string): { x: number; y: number } | null {
    const hole = this.levelData.holes.find(h => h.id === holeId);
    if (!hole || !hole.saucerState?.isActive) return null;

    // Ball center aligns exactly with saucer center in all phases
    return {
      x: hole.position.x,
      y: hole.position.y,
    };
  }

  /**
   * Update saucer behavior and return kick data if ready
   */
  public updateSaucerBehavior(currentTime: number): { ballId: string; direction: { x: number; y: number }; force: number; holeId: string } | null {
    for (const hole of this.levelData.holes) {
      if (!hole.saucerState?.isActive) continue;

      const saucerState = hole.saucerState;

      if (saucerState.phase === 'sinking') {
        // Ball is sinking into the hole naturally and aggressively
        const sinkElapsed = currentTime - saucerState.startTime;
        const sinkProgress = Math.min(sinkElapsed / saucerState.sinkDuration, 1);
        
        // Aggressive easing - starts slow, accelerates rapidly (like falling into divot)
        const aggressiveProgress = sinkProgress * sinkProgress * (3 - 2 * sinkProgress); // Smooth step
        const acceleratedProgress = aggressiveProgress * aggressiveProgress; // Square for more aggressive feel
        
        // Update sink depth with aggressive curve
        saucerState.sinkDepth = acceleratedProgress;
        
        // Transition to waiting phase when sinking is complete
        if (sinkProgress >= 1) {
          saucerState.phase = 'waiting';
          saucerState.startTime = currentTime; // Reset timer for waiting phase
          saucerState.sinkDepth = 1; // Fully sunk
          logger.info(`🛸 Ball fully sunk into saucer hole: ${hole.id}`, null, 'Level');
        }
      } else if (saucerState.phase === 'waiting') {
        // Ball is waiting in the saucer (centered on saucer sprite)
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
            holeId: hole.id,
          };

          // Remove the power-up hole entirely from the playfield
          const holeIndex = this.levelData.holes.indexOf(hole);
          if (holeIndex !== -1) {
            this.levelData.holes.splice(holeIndex, 1);
          }
          
          logger.info(`🚀 Power-up hole completely removed from playfield: ${hole.id}`, null, 'Level');
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
      hole.saucerState?.isActive && hole.saucerState.ballId === ballId,
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
   * Update animated holes
   */
  public updateAnimatedHoles(currentTime: number): void {
    for (const hole of this.levelData.holes) {
      // --- MOVING HOLE LOGIC ---
      if (hole.movementType === 'moving' && hole.movementAxis && hole.movementBounds && hole.movementState) {
        const axis = hole.movementAxis;
        const bounds = hole.movementBounds;
        const state = hole.movementState;
        const now = currentTime;
        const dt = Math.max(1, now - state.lastUpdate);
        state.lastUpdate = now;

        // Calculate travel distance and speed (shorter = slower, longer = faster)
        const travelDist = Math.abs(bounds.max - bounds.min);
        // Clamp min/max speed (ms for full traversal)
        const minDuration = 1200; // slowest (for short distance)
        const maxDuration = 3500; // fastest (for long distance)
        // Inverse: longer distance = shorter duration
        const duration = MathUtils.lerp(maxDuration, minDuration, MathUtils.clamp(travelDist / 200, 0, 1));
        state.duration = duration;

        // Update progress
        const progress = state.progress;
        let phase = state.phase;
        let direction = state.direction;
        let t = progress;

        if (phase === 'moving') {
          t += (dt / duration) * direction;
          
          // Apply smooth easing throughout the entire movement
          let easedT = t;
          if (direction === 1) {
            // Moving forward: smooth easeInOut for the entire movement
            easedT = MathUtils.easeInOut(t);
          } else {
            // Moving backward: smooth easeInOut for the entire movement
            easedT = MathUtils.easeInOut(t);
          }
          
          // Update position with easing
          const newPos = MathUtils.lerp(bounds.min, bounds.max, easedT);
          hole.position[axis] = newPos;
          
          // Check bounds
          if (t >= 1) {
            t = 1;
            phase = 'stopping';
            state.stopTime = now;
            direction = -direction as 1 | -1;
            console.log(`🔄 Moving hole reached max bound (progress: ${t.toFixed(3)}), reversing direction to ${direction}`);
          } else if (t <= 0) {
            t = 0;
            phase = 'stopping';
            state.stopTime = now;
            direction = -direction as 1 | -1;
            console.log(`🔄 Moving hole reached min bound (progress: ${t.toFixed(3)}), reversing direction to ${direction}`);
          }
        } else if (phase === 'stopping') {
          // Hold at end for a moment, then start moving back
          if (!state.stopTime) state.stopTime = now;
          if (now - state.stopTime > 400) { // 0.4s pause
            phase = 'moving';
            state.stopTime = undefined;
            state.lastUpdate = now;
            console.log(`🚀 Moving hole finished stopping, starting to move in direction ${direction}`);
          }
        }

        // Update state
        state.progress = MathUtils.clamp(t, 0, 1);
        state.phase = phase;
        state.direction = direction;
        // Always active
        hole.isActive = true;
        continue;
      }
      // --- END MOVING HOLE LOGIC ---

      if (!hole.animationState?.isAnimated) continue;

      const animState = hole.animationState;
      const elapsed = currentTime - animState.startTime;
      
      // Skip if animation hasn't started yet
      if (elapsed < 0) {
        // Only log once when waiting
        if (Math.abs(elapsed) > 500 && Math.abs(elapsed) < 600) {
          console.log(`⏰ Hole ${hole.id} waiting to start: ${Math.abs(elapsed)}ms remaining`);
        }
        continue;
      }

      switch (animState.phase) {
      case 'animating_in': {
        // Scale up from 0% to 100% over duration with easeOutBack easing
        const inProgress = Math.min(elapsed / animState.animatingInDuration, 1);
        const newScale = MathUtils.easeOutBack(inProgress); // Apply easeOutBack easing for smooth overshoot
          
        animState.currentScale = newScale;
          
        if (elapsed >= animState.animatingInDuration) {
          // Transition to idle phase
          animState.phase = 'idle';
          animState.startTime = currentTime;
          animState.currentScale = 1.0; // Full scale
          hole.isActive = true; // Hole becomes active when fully appeared
          logger.info(`🌟 Animated hole entered idle phase: ${hole.id}`, null, 'Level');
        }
        break;
      }

      case 'idle':
        // Hold at full scale
        animState.currentScale = 1.0;
          
        if (elapsed >= animState.idleDuration) {
          // Transition to animating out phase
          animState.phase = 'animating_out';
          animState.startTime = currentTime;
          hole.isActive = false; // Hole becomes inactive when starting to disappear
            
          // Play sound effect for hole starting to disappear
          if (this.onSoundEffect) {
            this.onSoundEffect('hole_disappear');
          }
            
          logger.info(`🌟 Animated hole starting to animate out: ${hole.id}`, null, 'Level');
        }
        break;

      case 'animating_out': {
        // Scale down from 100% to 0% over duration with easeInBack easing
        const outProgress = Math.min(elapsed / animState.animatingOutDuration, 1);
        const newOutScale = 1.0 - MathUtils.easeInBack(outProgress); // Apply easeInBack easing for smooth acceleration out
          
        animState.currentScale = newOutScale;
          
        if (elapsed >= animState.animatingOutDuration) {
          // Transition to hidden phase
          animState.phase = 'hidden';
          animState.startTime = currentTime;
          animState.currentScale = 0.0;
          hole.isActive = false; // Hole becomes inactive when hidden
          logger.info(`🌟 Animated hole entered hidden phase: ${hole.id}`, null, 'Level');
        }
        break;
      }

      case 'hidden':
        // Hole is hidden and inactive
        hole.isActive = false;
        animState.currentScale = 0.0;
          
        if (elapsed >= animState.hiddenDuration) {
          // Transition back to animating in phase - cycle repeats
          animState.phase = 'animating_in';
          animState.startTime = currentTime;
          animState.currentScale = 0.0;
            
          // Randomize idle duration for next cycle
          animState.idleDuration = 3000 + Math.random() * 7000; // 3-10 seconds
            
          // Play sound effect for hole starting to appear
          if (this.onSoundEffect) {
            this.onSoundEffect('hole_appear');
          }
            
          logger.info(`🔄 Animated hole starting new cycle: ${hole.id}`, null, 'Level');
        }
        break;
      }
    }
  }

  /**
   * Create an animated hole at a random position
   */
  public createAnimatedHole(holeId: string, position: Vector2): void {
    const BALL_RADIUS = 14;
    const HOLE_RADIUS = BALL_RADIUS;
    
    const animatedHole: Hole = {
      id: holeId,
      position: position,
      radius: HOLE_RADIUS,
      isGoal: false,
      isActive: false, // Start inactive, becomes active after animating in
      animationState: {
        isAnimated: true,
        phase: 'hidden', // Start hidden, not immediately visible
        startTime: Date.now(),
        animatingInDuration: 500, // 0.5 seconds with easeOutBack (bouncy entrance)
        idleDuration: 3000 + Math.random() * 7000, // 3-10 seconds visible
        animatingOutDuration: 500, // 0.5 seconds with easeInBack (smooth acceleration out)
        hiddenDuration: 5000 + Math.random() * 15000, // 5-20 seconds hidden
        currentScale: 0.0, // Start at 0% scale
      },
    };

    this.levelData.holes.push(animatedHole);
    logger.info(`🌟 Created cycling animated hole: ${holeId} at position (${position.x}, ${position.y})`, null, 'Level');
  }

  /**
   * Get all animated holes
   */
  public getAnimatedHoles(): Hole[] {
    return this.levelData.holes.filter(hole => hole.animationState?.isAnimated);
  }

  /**
   * Reset level state
   */
  public reset(): void {
    this.isCompleted = false;
    this.elapsedTime = 0;
    this.timerStarted = false;
    this.timerStopped = false;
    this.completedGoals.clear();

    // Reset all holes
    this.levelData.holes.forEach(hole => {
      hole.isActive = true;
    });

    logger.info(`🔄 Level ${this.levelData.id} reset`, null, 'Level');
  }

  /**
   * Debug function: Force complete all required goals to win the level instantly
   */
  public debugForceComplete(): void {
    // Complete all required goal holes
    for (const goalHole of this.levelData.goalHoles) {
      this.completedGoals.add(goalHole.id);
      if (this.completedGoals.size >= this.levelData.requiredGoals) {
        break; // Only complete the required number of goals
      }
    }

    // Mark level as complete
    this.markComplete();

    logger.info(`🧪 DEBUG: Level ${this.levelData.id} force completed! (${this.completedGoals.size}/${this.levelData.requiredGoals} goals)`, null, 'Level');
  }


}

export class LevelManager {
  private levels: Map<number, LevelData> = new Map();
  private currentLevel: Level | null = null;
  private unlockedLevels: Set<number> = new Set([1]); // Level 1 is unlocked by default

  constructor() {
    logger.info('📚 LevelManager initialized', null, 'LevelManager');
    this.initializeLevels();
  }

  /**
   * Initialize levels by loading configuration and generating levels
   */
  private async initializeLevels(): Promise<void> {
    await this.loadLevels();
  }

  /**
   * Load all level definitions from YAML ASCII grid files
   */
  private async loadLevels(): Promise<void> {
    // Assume levels are numbered 1..N and exist in public/levels/level{levelId}.yaml
    const maxLevelId = 15; // Update if you add more levels
    for (let levelId = 1; levelId <= maxLevelId; levelId++) {
      try {
        const response = await fetch(`/circuit-breaker/levels/level${levelId}.yaml`);
        if (!response.ok) {
          throw new Error(`Failed to load level ${levelId}: ${response.statusText}`);
        }
        const yamlText = await response.text();
        const { meta, holes } = parseAsciiLevel(yamlText);
        const goalHoles = holes.filter(h => h.type === 'goal').map((h, i) => ({
          id: `goal-hole-${levelId}-${i}`,
          position: { x: h.x, y: h.y },
          radius: 14,
          isGoal: true,
          isActive: true,
        }));
        const standardHoles = holes.filter(h => h.type === 'standard').map((h, i) => ({
          id: `standard-hole-${levelId}-${i}`,
          position: { x: h.x, y: h.y },
          radius: 14,
          isGoal: false,
          isActive: true,
        }));
        const animatedHoles = holes.filter(h => h.type === 'animated').map((h, i) => ({
          id: `animated-hole-${levelId}-${i}`,
          position: { x: h.x, y: h.y },
          radius: 14,
          isGoal: false,
          isActive: false, // Start inactive, becomes active after animating in
          movementType: 'animated',
          animationState: {
            isAnimated: true,
            phase: 'hidden', // Start hidden, not immediately visible
            startTime: Date.now(),
            animatingInDuration: 500, // 0.5 seconds with easeOutBack (bouncy entrance)
            idleDuration: 3000 + Math.random() * 7000, // 3-10 seconds visible
            animatingOutDuration: 500, // 0.5 seconds with easeInBack (smooth acceleration out)
            hiddenDuration: 5000 + Math.random() * 15000, // 5-20 seconds hidden
            currentScale: 0.0, // Start at 0% scale
          },
        }));
        const powerupHoles = holes.filter(h => h.type === 'powerup').map((h, i) => ({
          id: `powerup-hole-${levelId}-${i}`,
          position: { x: h.x, y: h.y },
          radius: 14,
          isGoal: false,
          isActive: true,
          powerUpType: 'random',
        }));
        // Parse moving holes with their movement paths and bounds
        const movingHoles = holes.filter(h => h.type === 'moving').map((h, i) => {
          const hole: Hole = {
            id: `moving-hole-${levelId}-${i}`,
            position: { x: h.x, y: h.y },
            radius: 14,
            isGoal: false,
            isActive: true,
            movementType: 'moving',
          };
          
          // If the parsed hole has movement data, use it
          if (h.movementAxis && h.movementBounds) {
            hole.movementAxis = h.movementAxis;
            hole.movementBounds = h.movementBounds;
            hole.movementState = {
              direction: 1,
              phase: 'moving',
              progress: 0,
              lastUpdate: Date.now(),
              duration: 2000, // Will be calculated dynamically in updateAnimatedHoles
            };
          }
          
          return hole;
        });
        const allHoles = [
          ...standardHoles,
          ...animatedHoles,
          ...powerupHoles,
          ...movingHoles,
          ...goalHoles,
        ];
        const levelData: LevelData = {
          id: levelId,
          name: meta.name,
          description: meta.description || '',
          holes: allHoles,
          goalHoles: goalHoles,
          ballStartPosition: { x: 343, y: 584 }, // You can add this to YAML if desired
          difficulty: levelId,
          bonusMultiplier: 1.0 + (levelId - 1) * 0.2,
          requiredGoals: goalHoles.length,
        };
        this.levels.set(levelId, levelData);
      } catch (err) {
        logger.error(`Failed to load level ${levelId} from YAML: ${err}`);
      }
    }
    logger.info(`📚 Loaded ${this.levels.size} levels from YAML ASCII grid files`, null, 'LevelManager');
  }

  /**
   * Load a specific level
   */
  public loadLevel(levelId: number, onSoundEffect?: (soundName: string) => void): Level | null {
    const levelData = this.levels.get(levelId);
    if (!levelData) {
      logger.warn(`⚠️ Level ${levelId} not found`, null, 'Level');
      return null;
    }

    if (!this.isLevelUnlocked(levelId)) {
      logger.warn(`🔒 Level ${levelId} is locked`, null, 'Level');
      return null;
    }

    this.currentLevel = new Level(levelData, onSoundEffect);
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

  /**
   * Regenerate all levels for a new run/game
   */
  public async regenerateLevels(): Promise<void> {
    logger.info('🔄 Regenerating all levels for new run...', null, 'LevelManager');
    
    // Clear existing levels
    this.levels.clear();
    
    // Generate fresh levels
    await this.loadLevels();
    
    logger.info('✅ All levels regenerated with new layouts', null, 'LevelManager');
  }

  /**
   * Force reload all levels from YAML files (for development)
   */
  public async forceReloadLevels(): Promise<void> {
    logger.info('🔄 Force reloading all levels from YAML files...', null, 'LevelManager');
    
    // Clear existing levels
    this.levels.clear();
    
    // Reload all levels from YAML files
    await this.loadLevels();
    
    logger.info('✅ All levels force reloaded from YAML files', null, 'LevelManager');
  }








}

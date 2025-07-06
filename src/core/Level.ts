// Circuit Breaker - Level System
// Hole-based navigation system where players guide the ball through holes to reach the goal

import { Vector2 } from '../utils/MathUtils'

export interface Hole {
  id: string
  position: Vector2
  radius: number
  isGoal: boolean
  isActive: boolean
}

export interface LevelData {
  id: number
  name: string
  description: string
  holes: Hole[]
  goalHoles: Hole[]  // Changed from single goalHole to multiple goalHoles
  ballStartPosition: Vector2
  difficulty: number
  bonusMultiplier: number
  requiredGoals: number  // Number of goals that must be reached to complete level
}

export class Level {
  private levelData: LevelData
  private isCompleted: boolean = false
  private startTime: number = 0
  private elapsedTime: number = 0
  private completedGoals: Set<string> = new Set()  // Track completed goal holes

  constructor(levelData: LevelData) {
    this.levelData = levelData
    console.log(`📋 Level ${levelData.id} loaded: ${levelData.name} (${levelData.goalHoles.length} goals)`)
  }

  /**
   * Start the level timer
   */
  public start(): void {
    this.startTime = Date.now()
    this.elapsedTime = 0
    this.isCompleted = false
    console.log(`🏁 Level ${this.levelData.id} started`)
  }

  /**
   * Update level state
   */
  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime
    
    // Update hole glow effects
    this.levelData.holes.forEach(hole => {
      if (hole.isGoal) {
        // Goal hole pulses with a bright glow
        hole.isActive = true
      } else {
        // Regular holes are always active
        hole.isActive = true
      }
    })
  }

  /**
   * Check if ball falls into any hole
   */
  public checkHoleCollision(ballPosition: Vector2, ballRadius: number): Hole | null {
    for (const hole of this.levelData.holes) {
      if (!hole.isActive) continue
      
      const dx = ballPosition.x - hole.position.x
      const dy = ballPosition.y - hole.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Ball falls into hole only when ball center crosses into hole boundary
      if (distance <= hole.radius) {
        console.log(`🕳️ Ball fell into hole: ${hole.id}`)
        return hole
      }
    }
    return null
  }

  /**
   * Check if ball reaches the goal hole
   */
  public checkGoalReached(ballPosition: Vector2, ballRadius: number): boolean {
    for (const goalHole of this.levelData.goalHoles) {
      const dx = ballPosition.x - goalHole.position.x
      const dy = ballPosition.y - goalHole.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Ball reaches goal only when ball center crosses into goal hole boundary
      if (distance <= goalHole.radius) {
        console.log(`🎯 Ball reached goal hole: ${goalHole.id}`)
        this.completedGoals.add(goalHole.id)
        return true
      }
    }
    return false
  }

  /**
   * Check if ball falls off the screen (failure condition)
   */
  public checkBallFallOff(ballPosition: Vector2, screenBounds: Vector2): boolean {
    return ballPosition.y > screenBounds.y + 50 // 50px buffer below screen
  }

  /**
   * Check if level is complete
   */
  public checkLevelComplete(): boolean {
    // Level is complete when all required goals are reached
    if (!this.isCompleted && this.completedGoals.size >= this.levelData.requiredGoals) {
      this.markComplete()
      return true
    }
    return this.isCompleted
  }

  /**
   * Get number of completed goals
   */
  public getCompletedGoals(): number {
    return this.completedGoals.size
  }

  /**
   * Get required number of goals
   */
  public getRequiredGoals(): number {
    return this.levelData.requiredGoals
  }

  /**
   * Check if all goals are completed
   */
  public areAllGoalsCompleted(): boolean {
    return this.completedGoals.size >= this.levelData.requiredGoals
  }

  /**
   * Check if a specific goal hole has been completed
   */
  public isGoalCompleted(goalId: string): boolean {
    return this.completedGoals.has(goalId)
  }

  /**
   * Mark level as complete
   */
  public markComplete(): void {
    if (!this.isCompleted) {
      this.isCompleted = true
      console.log(`🏆 Level ${this.levelData.id} completed!`)
    }
  }

  /**
   * Calculate level score based on time and completion
   */
  public calculateScore(): number {
    const baseScore = 1000 // Base score for completing level
    
    // Time bonus (faster completion = higher score)
    const timeBonus = Math.max(0, (60000 - this.elapsedTime) / 100) // 60 seconds max bonus
    
    return Math.floor((baseScore + timeBonus) * this.levelData.bonusMultiplier)
  }

  /**
   * Get level progress (0-1)
   */
  public getProgress(): number {
    // Progress based on ball's Y position (higher = more progress)
    // This will be calculated by the game based on ball position
    return this.isCompleted ? 1.0 : 0.0
  }

  /**
   * Get level data
   */
  public getLevelData(): LevelData {
    return this.levelData
  }

  /**
   * Reset level state
   */
  public reset(): void {
    this.isCompleted = false
    this.startTime = 0
    this.elapsedTime = 0
    this.completedGoals.clear()
    
    // Reset all holes
    this.levelData.holes.forEach(hole => {
      hole.isActive = true
    })
    
    console.log(`🔄 Level ${this.levelData.id} reset`)
  }
}

export class LevelManager {
  private levels: Map<number, LevelData> = new Map()
  private currentLevel: Level | null = null
  private unlockedLevels: Set<number> = new Set([1]) // Level 1 is unlocked by default

  constructor() {
    console.log('📚 LevelManager initialized')
    this.loadLevels()
  }

  /**
   * Generate holes for a level with increasing density from bottom to top
   */
  private generateHoles(levelId: number): { holes: Hole[], goalHoles: Hole[] } {
    const holes: Hole[] = []
    const PLAYFIELD_WIDTH = 360
    const PLAYFIELD_HEIGHT = 640
    const BALL_RADIUS = 14
    const HOLE_RADIUS = BALL_RADIUS // Holes are exactly ball size
    const BUFFER = 8 // Minimum spacing between holes
    
    // Bar starts at Y=590, so holes should start at least 10px above that
    const BAR_START_POSITION = 590
    const HOLE_START_Y = BAR_START_POSITION - 10 // Y=580
    const TOP_BOUNDARY = 50 // Top of playfield
    const GOAL_AREA_HEIGHT = 100 // Reserve top 100px for goal
    
    // Generate goal holes near the top (Y: 50-150)
    const goalHoles: Hole[] = []
    const numGoals = levelId + 1 // Level 1 = 2 goals, Level 2 = 3 goals, etc.
    
    for (let i = 0; i < numGoals; i++) {
      let attempts = 0
      let validPosition = false
      
      while (!validPosition && attempts < 100) {
        const goalX = 50 + Math.random() * (PLAYFIELD_WIDTH - 100)
        const goalY = TOP_BOUNDARY + Math.random() * GOAL_AREA_HEIGHT
        
        // Check if position is valid (not too close to other goal holes)
        validPosition = true
        for (const existingGoal of goalHoles) {
          const dx = goalX - existingGoal.position.x
          const dy = goalY - existingGoal.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < (HOLE_RADIUS * 3 + BUFFER)) { // More spacing for goal holes
            validPosition = false
            break
          }
        }
        
        if (validPosition) {
          goalHoles.push({
            id: `goal-${levelId}-${i}`,
            position: { x: goalX, y: goalY },
            radius: HOLE_RADIUS,
            isGoal: true,
            isActive: true
          })
        }
        
        attempts++
      }
    }
    
    // Add goal holes to the holes array
    holes.push(...goalHoles)
    
    // Generate regular holes with INCREASING density toward the top
    const sections = 10 // Divide playfield into sections
    const playableHeight = HOLE_START_Y - (TOP_BOUNDARY + GOAL_AREA_HEIGHT) // Y=580 to Y=150
    const sectionHeight = playableHeight / sections
    
    // Difficulty scaling - sparse at bottom, dense at top
    const baseDensity = 0.05 + (levelId - 1) * 0.01 // Very sparse at bottom
    const maxDensity = 0.3 + (levelId - 1) * 0.08 // Dense at top
    
    for (let section = 0; section < sections; section++) {
      // Section 0 is at bottom (Y=580), section 9 is near top (Y=150)
      const sectionY = HOLE_START_Y - (section + 1) * sectionHeight
      
      // Density increases as we go toward the top (higher section number = higher density)
      const sectionDensity = baseDensity + (section / sections) * maxDensity
      const holesInSection = Math.floor(sectionDensity * 12) // 12 holes max per section
      
      for (let i = 0; i < holesInSection; i++) {
        let attempts = 0
        let validPosition = false
        
        while (!validPosition && attempts < 50) {
          const x = HOLE_RADIUS + Math.random() * (PLAYFIELD_WIDTH - 2 * HOLE_RADIUS)
          const y = sectionY + Math.random() * sectionHeight
          
          // Check if position is valid (not too close to other holes)
          validPosition = true
          for (const existingHole of holes) {
            const dx = x - existingHole.position.x
            const dy = y - existingHole.position.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance < (HOLE_RADIUS * 2 + BUFFER)) {
              validPosition = false
              break
            }
          }
          
          if (validPosition) {
            holes.push({
              id: `hole-${levelId}-${section}-${i}`,
              position: { x, y },
              radius: HOLE_RADIUS,
              isGoal: false,
              isActive: true
            })
          }
          
          attempts++
        }
      }
    }
    
    console.log(`🕳️ Generated ${holes.length} holes for level ${levelId} (sparse at bottom, dense at top)`)
    
    return { holes, goalHoles }
  }

  /**
   * Load all level definitions
   */
  private loadLevels(): void {
    // Generate 5 levels with increasing difficulty
    for (let levelId = 1; levelId <= 5; levelId++) {
      const { holes, goalHoles } = this.generateHoles(levelId)
      
      const levelData: LevelData = {
        id: levelId,
        name: `Circuit Level ${levelId}`,
        description: `Navigate through the holes to reach the goal circuit. Difficulty: ${levelId}/5`,
        holes,
        goalHoles,
        ballStartPosition: { x: 343, y: 584 }, // On the tilting bar (bar starts at Y=590, ball should be slightly above)
        difficulty: levelId,
        bonusMultiplier: 1.0 + (levelId - 1) * 0.2,
        requiredGoals: goalHoles.length
      }
      
      this.levels.set(levelId, levelData)
    }
    
    console.log(`📚 Loaded ${this.levels.size} levels`)
  }

  /**
   * Load a specific level
   */
  public loadLevel(levelId: number): Level | null {
    const levelData = this.levels.get(levelId)
    if (!levelData) {
      console.warn(`⚠️ Level ${levelId} not found`)
      return null
    }
    
    if (!this.isLevelUnlocked(levelId)) {
      console.warn(`🔒 Level ${levelId} is locked`)
      return null
    }
    
    this.currentLevel = new Level(levelData)
    return this.currentLevel
  }

  /**
   * Check if level is unlocked
   */
  public isLevelUnlocked(levelId: number): boolean {
    return this.unlockedLevels.has(levelId)
  }

  /**
   * Unlock a level
   */
  public unlockLevel(levelId: number): void {
    if (!this.unlockedLevels.has(levelId)) {
      this.unlockedLevels.add(levelId)
      console.log(`🔓 Level ${levelId} unlocked`)
    }
  }

  /**
   * Get current level
   */
  public getCurrentLevel(): Level | null {
    return this.currentLevel
  }

  /**
   * Get available levels
   */
  public getAvailableLevels(): number[] {
    return Array.from(this.levels.keys())
  }

  /**
   * Get unlocked levels
   */
  public getUnlockedLevels(): number[] {
    return Array.from(this.unlockedLevels)
  }

  /**
   * Get level data
   */
  public getLevelData(levelId: number): LevelData | null {
    return this.levels.get(levelId) || null
  }
} 
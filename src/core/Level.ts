// Circuit Breaker - Level System
// Handles level definition, obstacles, and target ports

import { Vector2 } from '../utils/MathUtils'

export interface Obstacle {
  id: string
  type: 'electrical_hazard' | 'hole' | 'barrier'
  position: Vector2
  size: Vector2
  isActive: boolean
  damage?: number
  animation?: 'spark' | 'glow' | 'none'
}

export interface TargetPort {
  id: string
  position: Vector2
  radius: number
  isActive: boolean
  points: number
  isCompleted: boolean
  color: string
  glowIntensity: number
}

export interface LevelData {
  id: number
  name: string
  description: string
  timeLimit?: number
  obstacles: Obstacle[]
  targetPorts: TargetPort[]
  ballStartPosition: Vector2
  requiredTargets: number
  bonusMultiplier: number
}

export class Level {
  private levelData: LevelData
  private isCompleted: boolean = false
  private startTime: number = 0
  private elapsedTime: number = 0

  constructor(levelData: LevelData) {
    this.levelData = levelData
    console.log(`📋 Level ${levelData.id} loaded: ${levelData.name}`)
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
    
    // Update obstacle animations
    this.levelData.obstacles.forEach(obstacle => {
      if (obstacle.animation === 'spark') {
        // Electrical hazards can pulse or spark
        obstacle.isActive = Math.sin(this.elapsedTime * 0.01) > 0.5
      }
    })
    
    // Update target port glow effects
    this.levelData.targetPorts.forEach(port => {
      if (!port.isCompleted) {
        port.glowIntensity = 0.5 + 0.5 * Math.sin(this.elapsedTime * 0.005)
      }
    })
  }

  /**
   * Check if ball collides with any obstacle
   */
  public checkObstacleCollision(ballPosition: Vector2, ballRadius: number): Obstacle | null {
    for (const obstacle of this.levelData.obstacles) {
      if (!obstacle.isActive) continue
      
      const dx = ballPosition.x - (obstacle.position.x + obstacle.size.x / 2)
      const dy = ballPosition.y - (obstacle.position.y + obstacle.size.y / 2)
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Check collision with obstacle bounds
      if (distance < ballRadius + Math.min(obstacle.size.x, obstacle.size.y) / 2) {
        console.log(`⚡ Ball hit obstacle: ${obstacle.id}`)
        return obstacle
      }
    }
    return null
  }

  /**
   * Check if ball reaches any target port
   */
  public checkTargetPortCollision(ballPosition: Vector2, ballRadius: number): TargetPort | null {
    for (const port of this.levelData.targetPorts) {
      if (!port.isActive || port.isCompleted) continue
      
      const dx = ballPosition.x - port.position.x
      const dy = ballPosition.y - port.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < ballRadius + port.radius) {
        console.log(`🎯 Ball reached target port: ${port.id}`)
        port.isCompleted = true
        return port
      }
    }
    return null
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
    const completedTargets = this.levelData.targetPorts.filter(port => port.isCompleted).length
    const isComplete = completedTargets >= this.levelData.requiredTargets
    
    if (isComplete && !this.isCompleted) {
      this.isCompleted = true
      console.log(`🏆 Level ${this.levelData.id} completed!`)
    }
    
    return isComplete
  }

  /**
   * Calculate level score based on time and completion
   */
  public calculateScore(): number {
    const completedTargets = this.levelData.targetPorts.filter(port => port.isCompleted).length
    const baseScore = completedTargets * 100
    
    // Time bonus (faster completion = higher score)
    const timeBonus = this.levelData.timeLimit 
      ? Math.max(0, (this.levelData.timeLimit - this.elapsedTime) * 10)
      : 0
    
    return Math.floor((baseScore + timeBonus) * this.levelData.bonusMultiplier)
  }

  /**
   * Get level progress (0-1)
   */
  public getProgress(): number {
    const completedTargets = this.levelData.targetPorts.filter(port => port.isCompleted).length
    return completedTargets / this.levelData.requiredTargets
  }

  /**
   * Get level data
   */
  public getLevelData(): LevelData {
    return this.levelData
  }

  /**
   * Get remaining time
   */
  public getRemainingTime(): number {
    if (!this.levelData.timeLimit) return Infinity
    return Math.max(0, this.levelData.timeLimit - this.elapsedTime)
  }

  /**
   * Check if time is up
   */
  public isTimeUp(): boolean {
    return this.levelData.timeLimit ? this.elapsedTime >= this.levelData.timeLimit : false
  }

  /**
   * Reset level state
   */
  public reset(): void {
    this.isCompleted = false
    this.startTime = 0
    this.elapsedTime = 0
    
    // Reset all target ports
    this.levelData.targetPorts.forEach(port => {
      port.isCompleted = false
      port.glowIntensity = 1.0
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
   * Load all level definitions
   */
  private loadLevels(): void {
    // Level 1: Tutorial - Simple target port
    const level1: LevelData = {
      id: 1,
      name: "First Circuit",
      description: "Guide the data packet to the target port",
      obstacles: [],
      targetPorts: [
        {
          id: 'target-1',
          position: { x: 50, y: 500 },
          radius: 25,
          isActive: true,
          points: 100,
          isCompleted: false,
          color: '#00ff00',
          glowIntensity: 1.0
        }
      ],
      ballStartPosition: { x: 343, y: 562 },
      requiredTargets: 1,
      bonusMultiplier: 1.0
    }

    // Level 2: Basic Hazard - Add electrical obstacle
    const level2: LevelData = {
      id: 2,
      name: "Electric Danger",
      description: "Avoid the electrical hazard and reach the port",
      obstacles: [
        {
          id: 'hazard-1',
          type: 'electrical_hazard',
          position: { x: 150, y: 450 },
          size: { x: 60, y: 20 },
          isActive: true,
          damage: 1,
          animation: 'spark'
        }
      ],
      targetPorts: [
        {
          id: 'target-2',
          position: { x: 80, y: 520 },
          radius: 25,
          isActive: true,
          points: 150,
          isCompleted: false,
          color: '#0088ff',
          glowIntensity: 1.0
        }
      ],
      ballStartPosition: { x: 343, y: 562 },
      requiredTargets: 1,
      bonusMultiplier: 1.2
    }

    // Level 3: Multiple Targets - Two ports to activate
    const level3: LevelData = {
      id: 3,
      name: "Dual Circuit",
      description: "Activate both target ports to complete the circuit",
      obstacles: [
        {
          id: 'barrier-1',
          type: 'barrier',
          position: { x: 180, y: 480 },
          size: { x: 20, y: 40 },
          isActive: true,
          animation: 'none'
        }
      ],
      targetPorts: [
        {
          id: 'target-3a',
          position: { x: 100, y: 520 },
          radius: 20,
          isActive: true,
          points: 100,
          isCompleted: false,
          color: '#ff8800',
          glowIntensity: 1.0
        },
        {
          id: 'target-3b',
          position: { x: 260, y: 520 },
          radius: 20,
          isActive: true,
          points: 100,
          isCompleted: false,
          color: '#ff8800',
          glowIntensity: 1.0
        }
      ],
      ballStartPosition: { x: 343, y: 562 },
      requiredTargets: 2,
      bonusMultiplier: 1.5
    }

    this.levels.set(1, level1)
    this.levels.set(2, level2)
    this.levels.set(3, level3)
    
    console.log(`📚 Loaded ${this.levels.size} levels`)
  }

  /**
   * Load a specific level
   */
  public loadLevel(levelId: number): Level | null {
    if (!this.isLevelUnlocked(levelId)) {
      console.warn(`🔒 Level ${levelId} is locked`)
      return null
    }

    const levelData = this.levels.get(levelId)
    if (!levelData) {
      console.error(`❌ Level ${levelId} not found`)
      return null
    }

    this.currentLevel = new Level(levelData)
    return this.currentLevel
  }

  /**
   * Check if a level is unlocked
   */
  public isLevelUnlocked(levelId: number): boolean {
    return this.unlockedLevels.has(levelId)
  }

  /**
   * Unlock a level
   */
  public unlockLevel(levelId: number): void {
    this.unlockedLevels.add(levelId)
    console.log(`🔓 Level ${levelId} unlocked`)
  }

  /**
   * Get current level
   */
  public getCurrentLevel(): Level | null {
    return this.currentLevel
  }

  /**
   * Get all available levels
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
   * Get level data for display
   */
  public getLevelData(levelId: number): LevelData | null {
    return this.levels.get(levelId) || null
  }
} 
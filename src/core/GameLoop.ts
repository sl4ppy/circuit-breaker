// Circuit Breaker - Game Loop
// Handles the main game loop with fixed timestep and performance optimization

import { GameState, GameStateType } from './GameState'
import { Renderer } from '../rendering/Renderer'
import { PhysicsEngine } from '../physics/PhysicsEngine'

export class GameLoop {
  private animationId: number | null = null
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly timestep: number = 1000 / 60 // 60 FPS
  private isRunning: boolean = false
  private isPaused: boolean = false
  private renderer: Renderer | null = null
  private physicsEngine: PhysicsEngine | null = null
  private game: any = null

  constructor() {
    console.log('🔄 GameLoop initialized')
  }

  /**
   * Start the game loop
   */
  public start(gameState: GameState, renderer?: Renderer, physicsEngine?: PhysicsEngine, game?: any): void {
    if (this.isRunning) {
      console.warn('⚠️ Game loop is already running')
      return
    }

    this.renderer = renderer || null
    this.physicsEngine = physicsEngine || null
    this.game = game || null

    this.isRunning = true
    this.isPaused = false
    this.lastTime = performance.now()
    this.accumulator = 0

    console.log('▶️ Game loop started')
    this.gameLoop(gameState)
  }

  /**
   * Main game loop with fixed timestep
   */
  private gameLoop(gameState: GameState): void {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Accumulate time
    this.accumulator += deltaTime

    // Update with fixed timestep
    while (this.accumulator >= this.timestep) {
      if (!this.isPaused) {
        this.update(gameState, this.timestep)
      }
      this.accumulator -= this.timestep
    }

    // Render
    this.render(gameState)

    // Continue loop
    this.animationId = requestAnimationFrame(() => this.gameLoop(gameState))
  }

  /**
   * Update game logic
   */
  private update(gameState: GameState, deltaTime: number): void {
    // Update game logic if available
    if (this.game && this.game.update) {
      this.game.update(deltaTime)
    }

    // Update physics if available
    if (this.physicsEngine) {
      this.physicsEngine.update(deltaTime)
    }
  }

  /**
   * Render the game
   */
  private render(gameState: GameState): void {
    if (!this.renderer) return

    // Clear canvas
    this.renderer.clear()

    // Render game based on state
    if (gameState.isPlaying()) {
      this.renderGameplay()
    } else if (gameState.isState(GameStateType.MENU)) {
      this.renderMenu()
    } else if (gameState.isState(GameStateType.PAUSED)) {
      this.renderPaused()
    }
  }

  /**
   * Render gameplay
   */
  private renderGameplay(): void {
    if (!this.renderer) return

    const ctx = this.renderer.getContext()
    if (!ctx) return

    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, 360, 640)

    // Draw all physics objects as circles
    if (this.physicsEngine) {
      for (const obj of this.physicsEngine.getObjects()) {
        ctx.beginPath()
        const pos = obj.position || { x: obj.x || 0, y: obj.y || 0 }
        const radius = obj.radius || 10
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        
        // Different colors for different object types
        if (obj.isStatic) {
          ctx.fillStyle = '#ff0066' // Red for static obstacles
          ctx.shadowColor = '#ff0066'
        } else {
          ctx.fillStyle = '#00ffff' // Cyan for dynamic balls
          ctx.shadowColor = '#00ffff'
        }
        
        ctx.shadowBlur = 16
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.closePath()

        // Minimal debug info for performance
        if (this.physicsEngine.getDebug && this.physicsEngine.getDebug()) {
          // Draw velocity vectors for debugging
          if (!obj.isStatic && obj.velocity) {
            const velScale = 3 // Reduced scale for performance
            ctx.beginPath()
            ctx.moveTo(pos.x, pos.y)
            ctx.lineTo(pos.x + obj.velocity.x * velScale, pos.y + obj.velocity.y * velScale)
            ctx.strokeStyle = '#ffff00'
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.closePath()
          }

          // Draw minimal object info
          ctx.fillStyle = '#ffffff'
          ctx.font = '8px Courier New'
          ctx.textAlign = 'center'
          ctx.fillText(obj.id, pos.x, pos.y - radius - 5)
        }
      }

      // Only draw debug info when enabled
      if (this.physicsEngine.getDebug && this.physicsEngine.getDebug()) {
        // Draw collision manifolds for debugging
        if (this.physicsEngine.getCollisionManifolds) {
          const manifolds = this.physicsEngine.getCollisionManifolds()
          for (const manifold of manifolds) {
            // Draw collision point
            ctx.beginPath()
            ctx.arc(manifold.contactPoint.x, manifold.contactPoint.y, 2, 0, Math.PI * 2)
            ctx.fillStyle = '#ff0000'
            ctx.fill()
            ctx.closePath()
          }
        }

        // Draw constraints for debugging
        if (this.physicsEngine.getConstraints) {
          const constraints = this.physicsEngine.getConstraints()
          for (const constraint of constraints) {
            if (constraint.type === 'distance' && constraint.objectB) {
              // Draw distance constraint as a line
              ctx.beginPath()
              ctx.moveTo(constraint.objectA.position.x, constraint.objectA.position.y)
              ctx.lineTo(constraint.objectB.position.x, constraint.objectB.position.y)
              ctx.strokeStyle = '#00ff00'
              ctx.lineWidth = 1
              ctx.setLineDash([3, 3])
              ctx.stroke()
              ctx.setLineDash([])
              ctx.closePath()
            }
          }
        }
      }
    }

    // Draw placeholder text
    ctx.fillStyle = '#00ffff'
    ctx.font = '20px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('Circuit Breaker', 180, 40)
    ctx.font = '12px Courier New'
    ctx.fillText('Robust Physics System Active', 180, 60)
    
    // Call game's render method for additional elements
    if (this.game && this.game.renderGameplay) {
      this.game.renderGameplay()
    }

    // Enhanced debug info
    if (this.physicsEngine) {
      const objects = this.physicsEngine.getObjects()
      const dynamicObjects = objects.filter(obj => !obj.isStatic).length
      const staticObjects = objects.filter(obj => obj.isStatic).length
      
      ctx.font = '10px Courier New'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#00ffff'
      ctx.fillText(`Objects: ${dynamicObjects} dynamic, ${staticObjects} static`, 10, 610)
      ctx.fillText(`Gravity: ${this.physicsEngine.getGravity()}`, 10, 625)
      
      // Show collision count
      if (this.physicsEngine.getCollisionManifolds) {
        const collisionCount = this.physicsEngine.getCollisionManifolds().length
        ctx.fillText(`Collisions: ${collisionCount}`, 200, 610)
      }
      
      // Show physics performance info
      ctx.fillText(`Physics: Optimized Verlet (1 substep)`, 10, 595)
    }
  }

  /**
   * Render menu
   */
  private renderMenu(): void {
    if (!this.renderer) return

    const ctx = this.renderer.getContext()
    if (!ctx) return

    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, 360, 640)

    // Draw menu text
    ctx.fillStyle = '#00ffff'
    ctx.font = '24px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('CIRCUIT BREAKER', 180, 280)
    ctx.font = '14px Courier New'
    ctx.fillText('Neon Cyberpunk Arcade Game', 180, 310)
    ctx.font = '12px Courier New'
    ctx.fillText('Click to Start', 180, 350)
  }

  /**
   * Render paused state
   */
  private renderPaused(): void {
    if (!this.renderer) return

    const ctx = this.renderer.getContext()
    if (!ctx) return

    // Draw paused overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, 360, 640)

    ctx.fillStyle = '#00ffff'
    ctx.font = '20px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('PAUSED', 180, 320)
  }

  /**
   * Pause the game loop
   */
  public pause(): void {
    this.isPaused = true
    console.log('⏸️ Game loop paused')
  }

  /**
   * Resume the game loop
   */
  public resume(): void {
    this.isPaused = false
    console.log('▶️ Game loop resumed')
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    console.log('⏹️ Game loop stopped')
  }

  /**
   * Check if game loop is running
   */
  public isGameLoopRunning(): boolean {
    return this.isRunning
  }

  /**
   * Check if game loop is paused
   */
  public isGameLoopPaused(): boolean {
    return this.isPaused
  }

  /**
   * Get current FPS
   */
  public getFPS(): number {
    return 1000 / this.timestep
  }
} 
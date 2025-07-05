// Circuit Breaker - Game Loop
// Handles the main game loop with fixed timestep and performance optimization

import { GameState } from './GameState'

export class GameLoop {
  private animationId: number | null = null
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly timestep: number = 1000 / 60 // 60 FPS
  private isRunning: boolean = false
  private isPaused: boolean = false

  constructor() {
    console.log('🔄 GameLoop initialized')
  }

  /**
   * Start the game loop
   */
  public start(gameState: GameState): void {
    if (this.isRunning) {
      console.warn('⚠️ Game loop is already running')
      return
    }

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
    // TODO: Update game systems
    // - Physics engine
    // - Input handling
    // - Audio system
    // - Game logic
  }

  /**
   * Render the game
   */
  private render(gameState: GameState): void {
    // TODO: Render game
    // - Clear canvas
    // - Draw game objects
    // - Draw UI
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
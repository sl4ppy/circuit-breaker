// Circuit Breaker - Main Game Class
// Handles game state management and core game loop

import { GameState } from './GameState'
import { GameLoop } from './GameLoop'

export class Game {
  private gameState: GameState
  private gameLoop: GameLoop
  private isRunning: boolean = false

  constructor() {
    this.gameState = new GameState()
    this.gameLoop = new GameLoop()
    console.log('🎮 Circuit Breaker - Game initialized')
  }

  /**
   * Initialize the game and all systems
   */
  public async init(): Promise<void> {
    try {
      console.log('🚀 Initializing Circuit Breaker...')
      
      // TODO: Initialize all game systems
      // - Physics engine
      // - Input manager
      // - Audio system
      // - Rendering system
      
      this.isRunning = true
      console.log('✅ Circuit Breaker initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Circuit Breaker:', error)
      throw error
    }
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (!this.isRunning) {
      console.warn('⚠️ Game not initialized. Call init() first.')
      return
    }

    console.log('▶️ Starting Circuit Breaker...')
    this.gameLoop.start(this.gameState)
  }

  /**
   * Pause the game
   */
  public pause(): void {
    console.log('⏸️ Pausing Circuit Breaker...')
    this.gameLoop.pause()
  }

  /**
   * Resume the game
   */
  public resume(): void {
    console.log('▶️ Resuming Circuit Breaker...')
    this.gameLoop.resume()
  }

  /**
   * Stop the game
   */
  public stop(): void {
    console.log('⏹️ Stopping Circuit Breaker...')
    this.gameLoop.stop()
    this.isRunning = false
  }

  /**
   * Get current game state
   */
  public getGameState(): GameState {
    return this.gameState
  }

  /**
   * Check if game is running
   */
  public isGameRunning(): boolean {
    return this.isRunning && this.gameLoop.isRunning()
  }
} 
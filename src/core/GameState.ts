// Circuit Breaker - Game State Management
// Handles different game states and transitions

export enum GameStateType {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over',
  LOADING = 'loading'
}

export interface GameStateData {
  currentLevel: number
  score: number
  lives: number
  isPaused: boolean
  isGameOver: boolean
}

export class GameState {
  private currentState: GameStateType = GameStateType.MENU
  private stateData: GameStateData = {
    currentLevel: 1,
    score: 0,
    lives: 3,
    isPaused: false,
    isGameOver: false
  }

  constructor() {
    console.log('📊 GameState initialized')
  }

  /**
   * Get current game state
   */
  public getCurrentState(): GameStateType {
    return this.currentState
  }

  /**
   * Set game state
   */
  public setState(newState: GameStateType): void {
    const previousState = this.currentState
    this.currentState = newState
    console.log(`🔄 Game state changed: ${previousState} → ${newState}`)
  }

  /**
   * Get state data
   */
  public getStateData(): GameStateData {
    return { ...this.stateData }
  }

  /**
   * Update state data
   */
  public updateStateData(updates: Partial<GameStateData>): void {
    this.stateData = { ...this.stateData, ...updates }
  }

  /**
   * Check if current state is a specific type
   */
  public isState(state: GameStateType): boolean {
    return this.currentState === state
  }

  /**
   * Check if game is in playing state
   */
  public isPlaying(): boolean {
    return this.currentState === GameStateType.PLAYING
  }

  /**
   * Check if game is paused
   */
  public isPaused(): boolean {
    return this.currentState === GameStateType.PAUSED
  }

  /**
   * Check if game is over
   */
  public isGameOver(): boolean {
    return this.currentState === GameStateType.GAME_OVER
  }

  /**
   * Reset game state to initial values
   */
  public reset(): void {
    this.currentState = GameStateType.MENU
    this.stateData = {
      currentLevel: 1,
      score: 0,
      lives: 3,
      isPaused: false,
      isGameOver: false
    }
    console.log('🔄 Game state reset')
  }
} 
// Circuit Breaker - Game State Management
// Handles different game states and transitions

import { logger } from '../utils/Logger';
import { LevelScoreData } from './UnifiedScoringSystem';

export enum GameStateType {
  MENU = 'menu',
  HOW_TO_PLAY = 'how_to_play', // How to play screen
  ATTRACT_MODE = 'attract_mode', // Auto-play demo mode
  PLAYING = 'playing',
  PAUSED = 'paused',
  CONFIRM_MENU = 'confirm_menu', // Confirmation dialog for returning to menu
  SETTINGS = 'settings', // Settings menu overlay
  SAVE_LOAD = 'save_load', // Save/load menu overlay
  STATS = 'stats', // Stats menu overlay
  WIN_SCREEN = 'win_screen', // Level completion screen
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over',
  LOADING = 'loading',
}

export interface GameStateData {
  currentLevel: number;
  score: number; // Legacy score field - kept for compatibility
  totalScore: number; // New unified total score
  lives: number;
  isPaused: boolean;
  isGameOver: boolean;
  debugMode: boolean;
  // Power-up related state
  activePowerUps: string[];
  powerUpEffects: {
    timeScale?: number;
    magneticForce?: number;
    shieldActive?: boolean;
    barSpeedMultiplier?: number;
    scanActive?: boolean;
  };
  // Unified scoring system data
  levelScores: LevelScoreData[];
  currentLevelStartTime?: number;
}

export class GameState {
  private currentState: GameStateType = GameStateType.MENU;
  private stateData: GameStateData = {
    currentLevel: 1,
    score: 0,
    totalScore: 0,
    lives: 3,
    isPaused: false,
    isGameOver: false,
    debugMode: false,
    // Power-up related state
    activePowerUps: [],
    powerUpEffects: {},
    // Unified scoring system data
    levelScores: [],
    currentLevelStartTime: undefined,
  };

  constructor() {
    logger.info('📊 GameState initialized', null, 'GameState');
  }

  /**
   * Get current game state
   */
  public getCurrentState(): GameStateType {
    return this.currentState;
  }

  /**
   * Set game state
   */
  public setState(newState: GameStateType): void {
    const previousState = this.currentState;
    this.currentState = newState;
    logger.info(`🔄 Game state changed: ${previousState} → ${newState}`, null, 'GameState');
  }

  /**
   * Get state data
   */
  public getStateData(): GameStateData {
    return { ...this.stateData };
  }

  /**
   * Update state data
   */
  public updateStateData(updates: Partial<GameStateData>): void {
    this.stateData = { ...this.stateData, ...updates };
  }

  /**
   * Check if current state is a specific type
   */
  public isState(state: GameStateType): boolean {
    return this.currentState === state;
  }

  /**
   * Check if game is in playing state
   */
  public isPlaying(): boolean {
    return this.currentState === GameStateType.PLAYING;
  }

  /**
   * Check if game is paused
   */
  public isPaused(): boolean {
    return this.currentState === GameStateType.PAUSED;
  }

  /**
   * Check if game is over
   */
  public isGameOver(): boolean {
    return this.currentState === GameStateType.GAME_OVER;
  }

  /**
   * Check if confirmation dialog is showing
   */
  public isConfirmingMenu(): boolean {
    return this.currentState === GameStateType.CONFIRM_MENU;
  }

  /**
   * Check if in attract mode
   */
  public isAttractMode(): boolean {
    return this.currentState === GameStateType.ATTRACT_MODE;
  }

  /**
   * Check if in loading state
   */
  public isLoading(): boolean {
    return this.currentState === GameStateType.LOADING;
  }

  /**
   * Check if in settings state
   */
  public isSettings(): boolean {
    return this.currentState === GameStateType.SETTINGS;
  }

  /**
   * Check if in save/load state
   */
  public isSaveLoad(): boolean {
    return this.currentState === GameStateType.SAVE_LOAD;
  }

  /**
   * Check if in stats state
   */
  public isStats(): boolean {
    return this.currentState === GameStateType.STATS;
  }

  /**
   * Check if in how to play state
   */
  public isHowToPlay(): boolean {
    return this.currentState === GameStateType.HOW_TO_PLAY;
  }

  /**
   * Check if in win screen state
   */
  public isWinScreen(): boolean {
    return this.currentState === GameStateType.WIN_SCREEN;
  }

  /**
   * Check if debug mode is enabled
   */
  public isDebugMode(): boolean {
    return this.stateData.debugMode;
  }

  /**
   * Toggle debug mode
   */
  public toggleDebugMode(): void {
    this.stateData.debugMode = !this.stateData.debugMode;
    logger.info(
      `🐛 Debug mode ${this.stateData.debugMode ? 'enabled' : 'disabled'}`,
      null,
      'GameState',
    );
  }

  /**
   * Set debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.stateData.debugMode = enabled;
    logger.info(`🐛 Debug mode ${enabled ? 'enabled' : 'disabled'}`, null, 'GameState');
  }

  /**
   * Update total score from unified scoring system
   */
  public updateTotalScore(totalScore: number): void {
    this.stateData.totalScore = totalScore;
  }

  /**
   * Add level score data
   */
  public addLevelScore(levelScore: LevelScoreData): void {
    this.stateData.levelScores.push(levelScore);
    this.stateData.totalScore += levelScore.levelPoints;
  }

  /**
   * Get current total score from unified system
   */
  public getTotalScore(): number {
    return this.stateData.totalScore;
  }

  /**
   * Get level scores history
   */
  public getLevelScores(): LevelScoreData[] {
    return [...this.stateData.levelScores];
  }

  /**
   * Set current level start time
   */
  public setCurrentLevelStartTime(time: number): void {
    this.stateData.currentLevelStartTime = time;
  }

  /**
   * Get current level start time
   */
  public getCurrentLevelStartTime(): number | undefined {
    return this.stateData.currentLevelStartTime;
  }

  /**
   * Reset game state to initial values
   */
  public reset(): void {
    this.currentState = GameStateType.MENU;
    this.stateData = {
      currentLevel: 1,
      score: 0,
      totalScore: 0,
      lives: 3,
      isPaused: false,
      isGameOver: false,
      debugMode: false,
      // Power-up related state
      activePowerUps: [],
      powerUpEffects: {},
      // Unified scoring system data
      levelScores: [],
      currentLevelStartTime: undefined,
    };
    logger.info('🔄 Game state reset', null, 'GameState');
  }
}

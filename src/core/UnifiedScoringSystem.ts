// Circuit Breaker - Unified Scoring System
// Implements the Level Points = BaseLevelValue / LevelTime formula

import { logger } from '../utils/Logger';

export interface LevelScoreData {
  levelId: number;
  baseLevelValue: number;
  rawTime: number; // Time in seconds
  adjustedTime: number; // Time after power-up adjustments
  levelPoints: number;
  timeReductions: number; // Time cuts from power-ups
  assistPenalties: number; // Time penalties from assist power-ups
}

export interface ScoreSession {
  totalScore: number;
  levelScores: LevelScoreData[];
  sessionStartTime: number;
  sessionEndTime?: number;
}

export class UnifiedScoringSystem {
  private static readonly BASE_LEVEL_VALUE_START = 100000;
  private static readonly BASE_LEVEL_VALUE_INCREMENT = 20000;
  
  private currentSession: ScoreSession;
  private currentLevelStartTime: number = 0;
  private currentLevelTimeReductions: number = 0;
  private currentLevelAssistPenalties: number = 0;

  constructor() {
    this.currentSession = {
      totalScore: 0,
      levelScores: [],
      sessionStartTime: Date.now(),
    };
    logger.info('📊 UnifiedScoringSystem initialized', null, 'UnifiedScoringSystem');
  }

  /**
   * Calculate BaseLevelValue for a given level
   */
  public static calculateBaseLevelValue(levelId: number): number {
    return UnifiedScoringSystem.BASE_LEVEL_VALUE_START + 
           (levelId - 1) * UnifiedScoringSystem.BASE_LEVEL_VALUE_INCREMENT;
  }

  /**
   * Start a new scoring session
   */
  public startNewSession(): void {
    this.currentSession = {
      totalScore: 0,
      levelScores: [],
      sessionStartTime: Date.now(),
    };
    this.currentLevelStartTime = 0;
    this.currentLevelTimeReductions = 0;
    this.currentLevelAssistPenalties = 0;
    logger.info('🎮 New scoring session started', null, 'UnifiedScoringSystem');
  }

  /**
   * Start timing a level
   */
  public startLevel(levelId: number): void {
    this.currentLevelStartTime = Date.now();
    this.currentLevelTimeReductions = 0;
    this.currentLevelAssistPenalties = 0;
    logger.info(`⏰ Started timing level ${levelId}`, null, 'UnifiedScoringSystem');
  }

  /**
   * Add time reduction from power-ups (Time Cut Node)
   */
  public addTimeReduction(seconds: number): void {
    this.currentLevelTimeReductions += seconds;
    logger.info(`⚡ Time reduction added: ${seconds}s (total: ${this.currentLevelTimeReductions}s)`, null, 'UnifiedScoringSystem');
  }

  /**
   * Add time penalty from assist power-ups (Slow-Mo, Magnetic Guide, etc.)
   */
  public addAssistPenalty(seconds: number): void {
    this.currentLevelAssistPenalties += seconds;
    logger.info(`⚖️ Assist penalty added: ${seconds}s (total: ${this.currentLevelAssistPenalties}s)`, null, 'UnifiedScoringSystem');
  }

  /**
   * Add bonus points to the current session (e.g., saucer waiting points)
   */
  public addBonusPoints(points: number): void {
    this.currentSession.totalScore += points;
    logger.info(`🎰 Bonus points added: ${points} (total: ${this.currentSession.totalScore.toFixed(1)})`, null, 'UnifiedScoringSystem');
  }

  /**
   * Complete a level and calculate score
   */
  public completeLevel(levelId: number): LevelScoreData {
    if (this.currentLevelStartTime === 0) {
      throw new Error('Level not started - call startLevel() first');
    }

    // Calculate raw time in seconds
    const rawTime = (Date.now() - this.currentLevelStartTime) / 1000;

    // Calculate adjusted time: RawTime - TimeReductions + AssistPenalties
    const adjustedTime = Math.max(0.1, rawTime - this.currentLevelTimeReductions + this.currentLevelAssistPenalties);

    // Calculate BaseLevelValue
    const baseLevelValue = UnifiedScoringSystem.calculateBaseLevelValue(levelId);

    // Calculate Level Points: BaseLevelValue / AdjustedTime
    const levelPoints = baseLevelValue / adjustedTime;

    // Create level score data
    const levelScoreData: LevelScoreData = {
      levelId,
      baseLevelValue,
      rawTime,
      adjustedTime,
      levelPoints,
      timeReductions: this.currentLevelTimeReductions,
      assistPenalties: this.currentLevelAssistPenalties,
    };

    // Add to session
    this.currentSession.levelScores.push(levelScoreData);
    this.currentSession.totalScore += levelPoints;

    logger.info(
      `🎯 Level ${levelId} completed: ${levelPoints.toFixed(2)} points ` +
      `(${baseLevelValue}/${adjustedTime.toFixed(2)}s = ${levelPoints.toFixed(2)})`,
      null,
      'UnifiedScoringSystem'
    );

    // Reset level timing
    this.currentLevelStartTime = 0;
    this.currentLevelTimeReductions = 0;
    this.currentLevelAssistPenalties = 0;

    return levelScoreData;
  }

  /**
   * Get current session data
   */
  public getCurrentSession(): ScoreSession {
    return { ...this.currentSession };
  }

  /**
   * Get current total score
   */
  public getCurrentTotalScore(): number {
    return this.currentSession.totalScore;
  }

  /**
   * Get level scores breakdown
   */
  public getLevelScores(): LevelScoreData[] {
    return [...this.currentSession.levelScores];
  }

  /**
   * Get current level timing status
   */
  public getCurrentLevelStatus(): {
    isActive: boolean;
    rawTime: number;
    timeReductions: number;
    assistPenalties: number;
  } {
    return {
      isActive: this.currentLevelStartTime > 0,
      rawTime: this.currentLevelStartTime > 0 ? (Date.now() - this.currentLevelStartTime) / 1000 : 0,
      timeReductions: this.currentLevelTimeReductions,
      assistPenalties: this.currentLevelAssistPenalties,
    };
  }

  /**
   * End the current session
   */
  public endSession(): ScoreSession {
    this.currentSession.sessionEndTime = Date.now();
    logger.info(
      `🏁 Scoring session ended: ${this.currentSession.totalScore.toFixed(2)} total points ` +
      `across ${this.currentSession.levelScores.length} levels`,
      null,
      'UnifiedScoringSystem'
    );
    return { ...this.currentSession };
  }

  /**
   * Get scoring summary for display
   */
  public getScoringSummary(): {
    totalScore: number;
    levelsCompleted: number;
    averageScore: number;
    bestLevelScore: number;
    worstLevelScore: number;
  } {
    const levelScores = this.currentSession.levelScores;
    const levelPoints = levelScores.map(ls => ls.levelPoints);
    
    return {
      totalScore: this.currentSession.totalScore,
      levelsCompleted: levelScores.length,
      averageScore: levelScores.length > 0 ? this.currentSession.totalScore / levelScores.length : 0,
      bestLevelScore: levelPoints.length > 0 ? Math.max(...levelPoints) : 0,
      worstLevelScore: levelPoints.length > 0 ? Math.min(...levelPoints) : 0,
    };
  }

  /**
   * Format score for display
   */
  public static formatScore(score: number): string {
    return score.toFixed(1);
  }

  /**
   * Get level points preview (for UI display before completion)
   */
  public getLevelPointsPreview(levelId: number): number {
    if (this.currentLevelStartTime === 0) return 0;
    
    const rawTime = (Date.now() - this.currentLevelStartTime) / 1000;
    const adjustedTime = Math.max(0.1, rawTime - this.currentLevelTimeReductions + this.currentLevelAssistPenalties);
    const baseLevelValue = UnifiedScoringSystem.calculateBaseLevelValue(levelId);
    
    return baseLevelValue / adjustedTime;
  }
} 
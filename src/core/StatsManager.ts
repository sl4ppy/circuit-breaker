// Circuit Breaker - Stats Manager
// Tracks gameplay metrics, performance data, and user behavior analytics

import { logger } from '../utils/Logger';

export interface LevelStats {
  levelId: number;
  attempts: number;
  completions: number;
  bestTime: number; // milliseconds
  bestScore: number;
  totalPlayTime: number; // milliseconds
  ballsLost: number;
  goalsReached: number;
  averageAttempts: number;
  completionRate: number; // percentage
  lastPlayed: number; // timestamp
}

export interface PerformanceStats {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  fpsSamples: number[];
  memoryUsage?: number; // if available
  loadTimes: {
    gameStart: number;
    levelLoad: number;
    assetLoad: number;
  };
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    platform: string;
    language: string;
  };
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration: number; // milliseconds
  levelsPlayed: number[];
  goalsReached: number;
  ballsLost: number;
  score: number;
  completed: boolean;
}

export interface GameStats {
  version: string;
  lastUpdated: number;
  
  // Global gameplay stats
  totalPlayTime: number; // milliseconds
  totalSessions: number;
  totalGamesStarted: number;
  totalGamesCompleted: number;
  totalGoalsReached: number;
  totalBallsLost: number;
  totalDeaths: number;
  
  // High scores and records
  highestScore: number;
  highestLevel: number;
  longestSession: number; // milliseconds
  fastestLevelCompletion: number; // milliseconds
  
  // Completion stats
  levelsCompleted: number;
  totalLevelAttempts: number;
  averageCompletionRate: number; // percentage
  
  // Level-specific stats
  levelStats: Map<number, LevelStats>;
  
  // Performance stats
  performance: PerformanceStats;
  
  // Recent sessions (last 10)
  recentSessions: SessionStats[];
  
  // Achievement stats
  achievementsUnlocked: number;
  totalAchievements: number;
  achievementProgress: number; // percentage
}

export interface StatsEvent {
  type: 'game_start' | 'game_complete' | 'level_start' | 'level_complete' | 
        'goal_reached' | 'ball_lost' | 'death' | 'pause' | 'resume' | 
        'session_start' | 'session_end' | 'fps_update' | 'achievement_unlocked' | 'powerup_collected';
  timestamp: number;
  data?: any;
}

export class StatsManager {
  private stats: GameStats;
  private currentSession: SessionStats | null = null;
  private fpsSamples: number[] = [];
  private readonly MAX_FPS_SAMPLES = 100;
  private readonly STATS_KEY = 'circuit_breaker_stats';
  private readonly VERSION = '1.0.0';

  constructor() {
    this.stats = this.loadStats();
    this.initializePerformanceStats();
    logger.info('📊 StatsManager initialized', null, 'StatsManager');
  }

  /**
   * Record a gameplay event
   */
  public recordEvent(event: StatsEvent): void {
    try {
      switch (event.type) {
        case 'game_start':
          this.handleGameStart(event);
          break;
        case 'game_complete':
          this.handleGameComplete(event);
          break;
        case 'level_start':
          this.handleLevelStart(event);
          break;
        case 'level_complete':
          this.handleLevelComplete(event);
          break;
        case 'goal_reached':
          this.handleGoalReached(event);
          break;
        case 'ball_lost':
          this.handleBallLost(event);
          break;
        case 'death':
          this.handleDeath(event);
          break;
        case 'session_start':
          this.handleSessionStart(event);
          break;
        case 'session_end':
          this.handleSessionEnd(event);
          break;
        case 'fps_update':
          this.handleFPSUpdate(event);
          break;
        case 'achievement_unlocked':
          this.handleAchievementUnlocked(event);
          break;
      }

      // Auto-save stats periodically
      this.saveStats();
    } catch (error) {
      logger.error('❌ Failed to record stats event:', error, 'StatsManager');
    }
  }

  /**
   * Get current game stats
   */
  public getStats(): GameStats {
    return { ...this.stats };
  }

  /**
   * Get stats for a specific level
   */
  public getLevelStats(levelId: number): LevelStats | null {
    return this.stats.levelStats.get(levelId) || null;
  }

  /**
   * Get performance stats
   */
  public getPerformanceStats(): PerformanceStats {
    return { ...this.stats.performance };
  }

  /**
   * Get current session stats
   */
  public getCurrentSession(): SessionStats | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Reset all stats
   */
  public resetStats(): void {
    this.stats = this.createNewStats();
    this.currentSession = null;
    this.fpsSamples = [];
    this.saveStats();
    logger.info('🔄 All stats reset', null, 'StatsManager');
  }

  /**
   * Export stats as JSON
   */
  public exportStats(): string {
    const exportData = {
      ...this.stats,
      levelStats: Object.fromEntries(this.stats.levelStats),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import stats from JSON
   */
  public importStats(jsonData: string): boolean {
    try {
      const importedStats = JSON.parse(jsonData);
      
      // Validate imported data
      if (!this.validateStats(importedStats)) {
        logger.error('❌ Invalid stats data format', null, 'StatsManager');
        return false;
      }

              // Convert levelStats back to Map
        if (importedStats.levelStats && typeof importedStats.levelStats === 'object') {
          const levelStatsMap = new Map<number, LevelStats>();
          for (const [key, value] of Object.entries(importedStats.levelStats)) {
            levelStatsMap.set(parseInt(key), value as LevelStats);
          }
          importedStats.levelStats = levelStatsMap;
        }

      this.stats = importedStats;
      this.saveStats();
      logger.info('📥 Stats imported successfully', null, 'StatsManager');
      return true;
    } catch (error) {
      logger.error('❌ Failed to import stats:', error, 'StatsManager');
      return false;
    }
  }

  /**
   * Get stats summary for display
   */
  public getStatsSummary(): {
    totalPlayTime: string;
    gamesPlayed: number;
    completionRate: string;
    averageScore: number;
    favoriteLevel: number;
    mostChallengingLevel: number;
  } {
    const totalPlayTime = this.formatPlayTime(this.stats.totalPlayTime);
    const gamesPlayed = this.stats.totalGamesStarted;
    const completionRate = this.stats.averageCompletionRate.toFixed(1) + '%';
    const averageScore = this.stats.totalGamesCompleted > 0 
      ? Math.round(this.stats.highestScore / this.stats.totalGamesCompleted)
      : 0;

    // Find favorite level (most completed)
    let favoriteLevel = 1;
    let maxCompletions = 0;
    for (const [levelId, levelStats] of this.stats.levelStats) {
      if (levelStats.completions > maxCompletions) {
        maxCompletions = levelStats.completions;
        favoriteLevel = levelId;
      }
    }

    // Find most challenging level (lowest completion rate)
    let mostChallengingLevel = 1;
    let lowestRate = 100;
    for (const [levelId, levelStats] of this.stats.levelStats) {
      if (levelStats.attempts > 0 && levelStats.completionRate < lowestRate) {
        lowestRate = levelStats.completionRate;
        mostChallengingLevel = levelId;
      }
    }

    return {
      totalPlayTime,
      gamesPlayed,
      completionRate,
      averageScore,
      favoriteLevel,
      mostChallengingLevel,
    };
  }

  /**
   * Handle game start event
   */
  private handleGameStart(event: StatsEvent): void {
    this.stats.totalGamesStarted++;
    this.stats.lastUpdated = event.timestamp;
    logger.debug('📊 Game start recorded', null, 'StatsManager');
  }

  /**
   * Handle game complete event
   */
  private handleGameComplete(event: StatsEvent): void {
    this.stats.totalGamesCompleted++;
    this.stats.lastUpdated = event.timestamp;
    
    if (this.currentSession) {
      this.currentSession.completed = true;
      this.currentSession.endTime = event.timestamp;
      this.currentSession.duration = event.timestamp - this.currentSession.startTime;
    }
    
    logger.debug('📊 Game complete recorded', null, 'StatsManager');
  }

  /**
   * Handle level start event
   */
  private handleLevelStart(event: StatsEvent): void {
    const levelId = event.data?.levelId || 1;
    let levelStats = this.stats.levelStats.get(levelId);
    
    if (!levelStats) {
      levelStats = this.createLevelStats(levelId);
      this.stats.levelStats.set(levelId, levelStats);
    }
    
    levelStats.attempts++;
    levelStats.lastPlayed = event.timestamp;
    
    if (this.currentSession) {
      this.currentSession.levelsPlayed.push(levelId);
    }
    
    logger.debug(`📊 Level ${levelId} start recorded`, null, 'StatsManager');
  }

  /**
   * Handle level complete event
   */
  private handleLevelComplete(event: StatsEvent): void {
    const levelId = event.data?.levelId || 1;
    const completionTime = event.data?.completionTime || 0;
    const score = event.data?.score || 0;
    
    const levelStats = this.stats.levelStats.get(levelId);
    if (levelStats) {
      levelStats.completions++;
      levelStats.completionRate = (levelStats.completions / levelStats.attempts) * 100;
      
      if (completionTime > 0 && (levelStats.bestTime === 0 || completionTime < levelStats.bestTime)) {
        levelStats.bestTime = completionTime;
      }
      
      if (score > levelStats.bestScore) {
        levelStats.bestScore = score;
      }
    }
    
    this.stats.levelsCompleted = Math.max(this.stats.levelsCompleted, levelId);
    this.stats.highestLevel = Math.max(this.stats.highestLevel, levelId);
    
    logger.debug(`📊 Level ${levelId} complete recorded`, null, 'StatsManager');
  }

  /**
   * Handle goal reached event
   */
  private handleGoalReached(_event: StatsEvent): void {
    this.stats.totalGoalsReached++;
    
    if (this.currentSession) {
      this.currentSession.goalsReached++;
    }
    
    logger.debug('📊 Goal reached recorded', null, 'StatsManager');
  }

  /**
   * Handle ball lost event
   */
  private handleBallLost(_event: StatsEvent): void {
    this.stats.totalBallsLost++;
    
    if (this.currentSession) {
      this.currentSession.ballsLost++;
    }
    
    logger.debug('📊 Ball lost recorded', null, 'StatsManager');
  }

  /**
   * Handle death event
   */
  private handleDeath(_event: StatsEvent): void {
    this.stats.totalDeaths++;
    logger.debug('📊 Death recorded', null, 'StatsManager');
  }

  /**
   * Handle session start event
   */
  private handleSessionStart(event: StatsEvent): void {
    this.stats.totalSessions++;
    
    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: event.timestamp,
      duration: 0,
      levelsPlayed: [],
      goalsReached: 0,
      ballsLost: 0,
      score: 0,
      completed: false,
    };
    
    logger.debug('📊 Session start recorded', null, 'StatsManager');
  }

  /**
   * Handle session end event
   */
  private handleSessionEnd(event: StatsEvent): void {
    if (this.currentSession) {
      this.currentSession.endTime = event.timestamp;
      this.currentSession.duration = event.timestamp - this.currentSession.startTime;
      
      // Add to recent sessions
      this.stats.recentSessions.unshift(this.currentSession);
      if (this.stats.recentSessions.length > 10) {
        this.stats.recentSessions = this.stats.recentSessions.slice(0, 10);
      }
      
      // Update longest session
      if (this.currentSession.duration > this.stats.longestSession) {
        this.stats.longestSession = this.currentSession.duration;
      }
      
      this.currentSession = null;
    }
    
    logger.debug('📊 Session end recorded', null, 'StatsManager');
  }

  /**
   * Handle FPS update event
   */
  private handleFPSUpdate(event: StatsEvent): void {
    const fps = event.data?.fps || 0;
    
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > this.MAX_FPS_SAMPLES) {
      this.fpsSamples.shift();
    }
    
    // Update performance stats
    this.stats.performance.averageFPS = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.stats.performance.minFPS = Math.min(...this.fpsSamples);
    this.stats.performance.maxFPS = Math.max(...this.fpsSamples);
    this.stats.performance.fpsSamples = [...this.fpsSamples];
  }

  /**
   * Handle achievement unlocked event
   */
  private handleAchievementUnlocked(_event: StatsEvent): void {
    this.stats.achievementsUnlocked++;
    this.stats.achievementProgress = (this.stats.achievementsUnlocked / this.stats.totalAchievements) * 100;
    logger.debug('📊 Achievement unlocked recorded', null, 'StatsManager');
  }

  /**
   * Create new stats object
   */
  private createNewStats(): GameStats {
    return {
      version: this.VERSION,
      lastUpdated: Date.now(),
      totalPlayTime: 0,
      totalSessions: 0,
      totalGamesStarted: 0,
      totalGamesCompleted: 0,
      totalGoalsReached: 0,
      totalBallsLost: 0,
      totalDeaths: 0,
      highestScore: 0,
      highestLevel: 1,
      longestSession: 0,
      fastestLevelCompletion: 0,
      levelsCompleted: 0,
      totalLevelAttempts: 0,
      averageCompletionRate: 0,
      levelStats: new Map(),
      performance: this.createPerformanceStats(),
      recentSessions: [],
      achievementsUnlocked: 0,
      totalAchievements: 0,
      achievementProgress: 0,
    };
  }

  /**
   * Create performance stats object
   */
  private createPerformanceStats(): PerformanceStats {
    return {
      averageFPS: 0,
      minFPS: 0,
      maxFPS: 0,
      fpsSamples: [],
      loadTimes: {
        gameStart: 0,
        levelLoad: 0,
        assetLoad: 0,
      },
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }

  /**
   * Create level stats object
   */
  private createLevelStats(levelId: number): LevelStats {
    return {
      levelId,
      attempts: 0,
      completions: 0,
      bestTime: 0,
      bestScore: 0,
      totalPlayTime: 0,
      ballsLost: 0,
      goalsReached: 0,
      averageAttempts: 0,
      completionRate: 0,
      lastPlayed: 0,
    };
  }

  /**
   * Initialize performance stats
   */
  private initializePerformanceStats(): void {
    this.stats.performance = this.createPerformanceStats();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): GameStats {
    try {
      const savedStats = localStorage.getItem(this.STATS_KEY);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        
        // Convert levelStats back to Map
        if (parsedStats.levelStats && typeof parsedStats.levelStats === 'object') {
          parsedStats.levelStats = new Map(Object.entries(parsedStats.levelStats));
        }
        
        // Validate and migrate if needed
        if (this.validateStats(parsedStats)) {
          logger.info('📂 Stats loaded from storage', null, 'StatsManager');
          return parsedStats;
        }
      }
    } catch (error) {
      logger.error('❌ Failed to load stats:', error, 'StatsManager');
    }
    
    logger.info('🆕 Creating new stats', null, 'StatsManager');
    return this.createNewStats();
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      const statsToSave = {
        ...this.stats,
        levelStats: Object.fromEntries(this.stats.levelStats),
      };
      localStorage.setItem(this.STATS_KEY, JSON.stringify(statsToSave));
    } catch (error) {
      logger.error('❌ Failed to save stats:', error, 'StatsManager');
    }
  }

  /**
   * Validate stats data structure
   */
  private validateStats(stats: any): stats is GameStats {
    return stats && 
           typeof stats.version === 'string' &&
           typeof stats.lastUpdated === 'number' &&
           typeof stats.totalPlayTime === 'number';
  }

  /**
   * Format play time for display
   */
  private formatPlayTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
} 
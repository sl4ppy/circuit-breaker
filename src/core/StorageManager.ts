// Circuit Breaker - Storage Manager
// Handles save/load operations, data validation, and error recovery

import { logger } from '../utils/Logger';
import { LevelScoreData, ScoreSession } from './UnifiedScoringSystem';

export interface GameProgress {
  version: string;
  lastSaved: number;
  currentLevel: number;
  highestLevel: number;
  totalScore: number; // Legacy score field - kept for compatibility
  lives: number;
  completedLevels: Set<number>;
  highScores: Map<number, number>; // level -> score (legacy)
  achievements: Set<string>;
  settings: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    audioEnabled: boolean;
  };
  playTime: number; // Total play time in milliseconds
  gamesPlayed: number;
  totalBallsLost: number;
  totalGoalsReached: number;
  // New unified scoring system data
  unifiedTotalScore?: number; // Total score from unified scoring system
  scoreSessions?: ScoreSession[]; // Historical scoring sessions
  bestLevelScores?: Map<number, LevelScoreData>; // level -> best score data
  allTimeHighScore?: number; // Best unified total score ever achieved
}

export interface SaveSlot {
  id: number;
  name: string;
  lastPlayed: number;
  progress: GameProgress;
}

export class StorageManager {
  private readonly STORAGE_KEY = 'circuit_breaker_save';
  private readonly SAVE_SLOTS_KEY = 'circuit_breaker_slots';
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly MAX_SAVE_SLOTS = 3;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  private autoSaveTimer: number | null = null;
  private lastAutoSave: number = 0;

  constructor() {
    logger.info('💾 StorageManager initialized', null, 'StorageManager');
  }

  /**
   * Create a new game progress object
   */
  public createNewProgress(): GameProgress {
    return {
      version: this.CURRENT_VERSION,
      lastSaved: Date.now(),
      currentLevel: 1,
      highestLevel: 1,
      totalScore: 0,
      lives: 3,
      completedLevels: new Set(),
      highScores: new Map(),
      achievements: new Set(),
      settings: {
        masterVolume: 0.7,
        musicVolume: 0.4,
        sfxVolume: 0.8,
        audioEnabled: true,
      },
      playTime: 0,
      gamesPlayed: 0,
      totalBallsLost: 0,
      totalGoalsReached: 0,
      // Initialize new unified scoring fields
      unifiedTotalScore: 0,
      scoreSessions: [],
      bestLevelScores: new Map(),
      allTimeHighScore: 0,
    };
  }

  /**
   * Save game progress to localStorage
   */
  public saveProgress(progress: GameProgress, slotId: number = 0): boolean {
    try {
      // Update save timestamp
      progress.lastSaved = Date.now();
      progress.version = this.CURRENT_VERSION;

      // Validate progress data
      if (!this.validateProgress(progress)) {
        logger.error('❌ Invalid progress data, save aborted', null, 'StorageManager');
        return false;
      }

      // Convert Sets and Maps to arrays/objects for JSON serialization
      const serializedProgress = this.serializeProgress(progress);

      // Save to localStorage
      const saveKey = `${this.STORAGE_KEY}_${slotId}`;
      localStorage.setItem(saveKey, JSON.stringify(serializedProgress));

      // Update save slot metadata
      this.updateSaveSlot(slotId, progress);

      logger.info(`💾 Game progress saved to slot ${slotId}`, null, 'StorageManager');
      return true;
    } catch (error) {
      logger.error('❌ Failed to save game progress:', error, 'StorageManager');
      return false;
    }
  }

  /**
   * Load game progress from localStorage
   */
  public loadProgress(slotId: number = 0): GameProgress | null {
    try {
      const saveKey = `${this.STORAGE_KEY}_${slotId}`;
      const savedData = localStorage.getItem(saveKey);

      if (!savedData) {
        logger.info(`📂 No save data found in slot ${slotId}`, null, 'StorageManager');
        return null;
      }

      // Parse and validate saved data
      const parsedData = JSON.parse(savedData);
      const progress = this.deserializeProgress(parsedData);

      if (!this.validateProgress(progress)) {
        logger.error('❌ Invalid save data, loading aborted', null, 'StorageManager');
        return null;
      }

      // Check version compatibility
      if (!this.isVersionCompatible(progress.version)) {
        logger.warn('⚠️ Save data version mismatch, attempting migration', null, 'StorageManager');
        const migratedProgress = this.migrateProgress(progress);
        return migratedProgress;
      }

      logger.info(`📂 Game progress loaded from slot ${slotId}`, null, 'StorageManager');
      return progress;
    } catch (error) {
      logger.error('❌ Failed to load game progress:', error, 'StorageManager');
      return null;
    }
  }

  /**
   * Auto-save game progress
   */
  public autoSave(progress: GameProgress, slotId: number = 0): boolean {
    const now = Date.now();
    
    // Only auto-save if enough time has passed
    if (now - this.lastAutoSave < this.AUTO_SAVE_INTERVAL) {
      return false;
    }

    const success = this.saveProgress(progress, slotId);
    if (success) {
      this.lastAutoSave = now;
      logger.debug('🔄 Auto-save completed', null, 'StorageManager');
    }
    
    return success;
  }

  /**
   * Start auto-save timer
   */
  public startAutoSave(progress: GameProgress, slotId: number = 0): void {
    this.stopAutoSave();
    
    this.autoSaveTimer = window.setInterval(() => {
      this.autoSave(progress, slotId);
    }, this.AUTO_SAVE_INTERVAL);
    
    logger.debug('🔄 Auto-save timer started', null, 'StorageManager');
  }

  /**
   * Stop auto-save timer
   */
  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      logger.debug('🔄 Auto-save timer stopped', null, 'StorageManager');
    }
  }

  /**
   * Get all available save slots
   */
  public getSaveSlots(): SaveSlot[] {
    try {
      const slotsData = localStorage.getItem(this.SAVE_SLOTS_KEY);
      if (!slotsData) return [];

      const slots = JSON.parse(slotsData);
      return slots.filter((slot: SaveSlot) => slot && slot.progress);
    } catch (error) {
      logger.error('❌ Failed to load save slots:', error, 'StorageManager');
      return [];
    }
  }

  /**
   * Delete a save slot
   */
  public deleteSaveSlot(slotId: number): boolean {
    try {
      const saveKey = `${this.STORAGE_KEY}_${slotId}`;
      localStorage.removeItem(saveKey);
      
      // Remove from save slots metadata
      const slots = this.getSaveSlots();
      const updatedSlots = slots.filter(slot => slot.id !== slotId);
      localStorage.setItem(this.SAVE_SLOTS_KEY, JSON.stringify(updatedSlots));
      
      logger.info(`🗑️ Save slot ${slotId} deleted`, null, 'StorageManager');
      return true;
    } catch (error) {
      logger.error('❌ Failed to delete save slot:', error, 'StorageManager');
      return false;
    }
  }

  /**
   * Clear all save data
   */
  public clearAllSaves(): boolean {
    try {
      // Clear all save slots
      for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
        const saveKey = `${this.STORAGE_KEY}_${i}`;
        localStorage.removeItem(saveKey);
      }
      
      // Clear save slots metadata
      localStorage.removeItem(this.SAVE_SLOTS_KEY);
      
      logger.info('🗑️ All save data cleared', null, 'StorageManager');
      return true;
    } catch (error) {
      logger.error('❌ Failed to clear save data:', error, 'StorageManager');
      return false;
    }
  }

  /**
   * Validate progress data
   */
  private validateProgress(progress: GameProgress): boolean {
    if (!progress || typeof progress !== 'object') return false;
    
    // Check required fields
    const requiredFields = [
      'version', 'lastSaved', 'currentLevel', 'highestLevel',
      'totalScore', 'lives', 'completedLevels', 'highScores',
      'achievements', 'settings', 'playTime', 'gamesPlayed',
      'totalBallsLost', 'totalGoalsReached',
    ];
    
    for (const field of requiredFields) {
      if (!(field in progress)) {
        logger.error(`❌ Missing required field: ${field}`, null, 'StorageManager');
        return false;
      }
    }
    
    // Validate data types and ranges
    if (progress.currentLevel < 1 || progress.highestLevel < 1) return false;
    if (progress.totalScore < 0) return false;
    if (progress.lives < 0 || progress.lives > 10) return false;
    if (progress.playTime < 0) return false;
    if (progress.gamesPlayed < 0) return false;
    
    return true;
  }

  /**
   * Serialize progress for storage
   */
  private serializeProgress(progress: GameProgress): any {
    return {
      ...progress,
      completedLevels: Array.from(progress.completedLevels),
      highScores: Object.fromEntries(progress.highScores),
      achievements: Array.from(progress.achievements),
      // Serialize new unified scoring data
      bestLevelScores: progress.bestLevelScores ? Object.fromEntries(progress.bestLevelScores) : {},
      scoreSessions: progress.scoreSessions || [],
    };
  }

  /**
   * Deserialize progress from storage
   */
  private deserializeProgress(data: any): GameProgress {
    return {
      ...data,
      completedLevels: new Set(data.completedLevels || []),
      highScores: new Map(Object.entries(data.highScores || {})),
      achievements: new Set(data.achievements || []),
      // Deserialize new unified scoring data
      bestLevelScores: data.bestLevelScores ? new Map(Object.entries(data.bestLevelScores)) : new Map(),
      scoreSessions: data.scoreSessions || [],
      unifiedTotalScore: data.unifiedTotalScore || 0,
      allTimeHighScore: data.allTimeHighScore || 0,
    };
  }

  /**
   * Check if save version is compatible
   */
  private isVersionCompatible(_version: string): boolean {
    // For now, accept any version and migrate if needed
    // In the future, this could be more strict
    return true;
  }

  /**
   * Migrate progress data to current version
   */
  private migrateProgress(progress: GameProgress): GameProgress {
    // Add any missing fields with defaults
    const migrated = {
      ...this.createNewProgress(),
      ...progress,
    };
    
    // Ensure all required fields exist
    if (!migrated.completedLevels) migrated.completedLevels = new Set();
    if (!migrated.highScores) migrated.highScores = new Map();
    if (!migrated.achievements) migrated.achievements = new Set();
    if (!migrated.settings) migrated.settings = this.createNewProgress().settings;
    
    logger.info('🔄 Progress data migrated to current version', null, 'StorageManager');
    return migrated;
  }

  /**
   * Update save slot metadata
   */
  private updateSaveSlot(slotId: number, progress: GameProgress): void {
    try {
      const slots = this.getSaveSlots();
      const existingSlotIndex = slots.findIndex(slot => slot.id === slotId);
      
      const slotData: SaveSlot = {
        id: slotId,
        name: `Save ${slotId + 1}`,
        lastPlayed: Date.now(),
        progress: progress,
      };
      
      if (existingSlotIndex >= 0) {
        slots[existingSlotIndex] = slotData;
      } else {
        slots.push(slotData);
      }
      
      // Sort by last played (newest first)
      slots.sort((a, b) => b.lastPlayed - a.lastPlayed);
      
      localStorage.setItem(this.SAVE_SLOTS_KEY, JSON.stringify(slots));
    } catch (error) {
      logger.error('❌ Failed to update save slot metadata:', error, 'StorageManager');
    }
  }

  /**
   * Update unified scoring data in progress
   */
  public updateUnifiedScoringData(
    progress: GameProgress, 
    scoreSession: ScoreSession, 
    levelScores: LevelScoreData[],
  ): void {
    // Update unified total score
    progress.unifiedTotalScore = scoreSession.totalScore;
    
    // Update all-time high score
    if (scoreSession.totalScore > (progress.allTimeHighScore || 0)) {
      progress.allTimeHighScore = scoreSession.totalScore;
      logger.info(`🏆 New all-time high score: ${scoreSession.totalScore.toFixed(1)}`, null, 'StorageManager');
    }
    
    // Add this session to history
    if (!progress.scoreSessions) progress.scoreSessions = [];
    progress.scoreSessions.push(scoreSession);
    
    // Keep only the last 10 sessions to manage storage
    if (progress.scoreSessions.length > 10) {
      progress.scoreSessions = progress.scoreSessions.slice(-10);
    }
    
    // Update best scores for each level
    if (!progress.bestLevelScores) progress.bestLevelScores = new Map();
    
    for (const levelScore of levelScores) {
      const currentBest = progress.bestLevelScores.get(levelScore.levelId);
      if (!currentBest || levelScore.levelPoints > currentBest.levelPoints) {
        progress.bestLevelScores.set(levelScore.levelId, levelScore);
        logger.info(`🎯 New best score for Level ${levelScore.levelId}: ${levelScore.levelPoints.toFixed(1)}`, null, 'StorageManager');
      }
    }
  }

  /**
   * Get best level score for a specific level
   */
  public getBestLevelScore(progress: GameProgress, levelId: number): LevelScoreData | null {
    if (!progress.bestLevelScores) return null;
    return progress.bestLevelScores.get(levelId) || null;
  }

  /**
   * Get unified scoring statistics
   */
  public getUnifiedScoringStats(progress: GameProgress): {
    allTimeHighScore: number;
    averageSessionScore: number;
    totalSessions: number;
    bestLevelCount: number;
  } {
    const allTimeHighScore = progress.allTimeHighScore || 0;
    const sessions = progress.scoreSessions || [];
    const totalSessions = sessions.length;
    const averageSessionScore = totalSessions > 0 
      ? sessions.reduce((sum, session) => sum + session.totalScore, 0) / totalSessions 
      : 0;
    const bestLevelCount = progress.bestLevelScores ? progress.bestLevelScores.size : 0;
    
    return {
      allTimeHighScore,
      averageSessionScore,
      totalSessions,
      bestLevelCount,
    };
  }

  /**
   * Get storage usage information
   */
  public getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_KEY) || key === this.SAVE_SLOTS_KEY) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      // Estimate available storage (localStorage typically 5-10MB)
      const available = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      logger.error('❌ Failed to get storage info:', error, 'StorageManager');
      return { used: 0, available: 0, percentage: 0 };
    }
  }
} 
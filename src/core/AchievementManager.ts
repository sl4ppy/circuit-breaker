// Circuit Breaker - Achievement Manager
// Tracks player accomplishments and provides achievement notifications

import { logger } from '../utils/Logger';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
  category: 'gameplay' | 'completion' | 'skill' | 'collection';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AchievementNotification {
  id: string;
  name: string;
  description: string;
  icon: string;
  timestamp: number;
  category: string;
  rarity: string;
}

export class AchievementManager {
  private achievements: Map<string, Achievement> = new Map();
  private notifications: AchievementNotification[] = [];
  private onAchievementUnlocked?: (achievement: Achievement) => void;

  constructor() {
    this.initializeAchievements();
    logger.info('🏆 AchievementManager initialized', null, 'AchievementManager');
  }

  /**
   * Initialize all available achievements
   */
  private initializeAchievements(): void {
    // Gameplay achievements
    this.addAchievement({
      id: 'first_goal',
      name: 'First Contact',
      description: 'Reach your first goal',
      icon: '🎯',
      unlocked: false,
      category: 'gameplay',
      rarity: 'common',
    });

    this.addAchievement({
      id: 'level_complete',
      name: 'Circuit Master',
      description: 'Complete a level',
      icon: '⚡',
      unlocked: false,
      category: 'gameplay',
      rarity: 'common',
    });

    this.addAchievement({
      id: 'perfect_level',
      name: 'Perfect Circuit',
      description: 'Complete a level without losing any balls',
      icon: '💎',
      unlocked: false,
      category: 'skill',
      rarity: 'rare',
    });

    this.addAchievement({
      id: 'speed_runner',
      name: 'Speed Runner',
      description: 'Complete a level in under 30 seconds',
      icon: '🏃',
      unlocked: false,
      category: 'skill',
      rarity: 'rare',
    });

    this.addAchievement({
      id: 'survivor',
      name: 'Survivor',
      description: 'Complete 5 levels in a single game',
      icon: '🛡️',
      unlocked: false,
      category: 'gameplay',
      rarity: 'epic',
    });

    this.addAchievement({
      id: 'high_scorer',
      name: 'High Scorer',
      description: 'Score 10,000 points in a single game',
      icon: '🏆',
      unlocked: false,
      category: 'skill',
      rarity: 'epic',
    });

    this.addAchievement({
      id: 'goal_hunter',
      name: 'Goal Hunter',
      description: 'Reach 50 goals total',
      icon: '🎯',
      unlocked: false,
      category: 'completion',
      rarity: 'rare',
      progress: 0,
      maxProgress: 50,
    });

    this.addAchievement({
      id: 'level_explorer',
      name: 'Level Explorer',
      description: 'Unlock 10 levels',
      icon: '🗺️',
      unlocked: false,
      category: 'completion',
      rarity: 'rare',
      progress: 0,
      maxProgress: 10,
    });

    this.addAchievement({
      id: 'persistent_player',
      name: 'Persistent Player',
      description: 'Play 10 games',
      icon: '🎮',
      unlocked: false,
      category: 'completion',
      rarity: 'common',
      progress: 0,
      maxProgress: 10,
    });

    this.addAchievement({
      id: 'time_investor',
      name: 'Time Investor',
      description: 'Play for 1 hour total',
      icon: '⏰',
      unlocked: false,
      category: 'completion',
      rarity: 'common',
      progress: 0,
      maxProgress: 3600000, // 1 hour in milliseconds
    });

    this.addAchievement({
      id: 'ball_conservationist',
      name: 'Ball Conservationist',
      description: 'Complete a level with only 1 ball',
      icon: '🔵',
      unlocked: false,
      category: 'skill',
      rarity: 'epic',
    });

    this.addAchievement({
      id: 'chain_reaction',
      name: 'Chain Reaction',
      description: 'Reach 3 goals in quick succession',
      icon: '⚡',
      unlocked: false,
      category: 'skill',
      rarity: 'legendary',
    });

    this.addAchievement({
      id: 'veteran_player',
      name: 'Veteran Player',
      description: 'Play for 5 hours total',
      icon: '👴',
      unlocked: false,
      category: 'completion',
      rarity: 'epic',
      progress: 0,
      maxProgress: 18000000, // 5 hours in milliseconds
    });

    this.addAchievement({
      id: 'master_circuit',
      name: 'Master Circuit',
      description: 'Complete all levels',
      icon: '👑',
      unlocked: false,
      category: 'completion',
      rarity: 'legendary',
    });
  }

  /**
   * Add an achievement to the system
   */
  private addAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
  }

  /**
   * Set callback for achievement unlocks
   */
  public setAchievementCallback(callback: (achievement: Achievement) => void): void {
    this.onAchievementUnlocked = callback;
  }

  /**
   * Check and update achievements based on game events
   */
  public checkAchievements(gameStats: {
    currentLevel: number;
    totalScore: number;
    lives: number;
    goalsReached: number;
    levelsCompleted: number;
    gamesPlayed: number;
    totalPlayTime: number;
    ballsLost: number;
    perfectLevels: number;
    quickCompletions: number;
  }): void {
    // Check first goal achievement
    if (gameStats.goalsReached >= 1) {
      this.unlockAchievement('first_goal');
    }

    // Check level completion achievements
    if (gameStats.levelsCompleted >= 1) {
      this.unlockAchievement('level_complete');
    }

    // Check perfect level achievement
    if (gameStats.perfectLevels >= 1) {
      this.unlockAchievement('perfect_level');
    }

    // Check speed runner achievement
    if (gameStats.quickCompletions >= 1) {
      this.unlockAchievement('speed_runner');
    }

    // Check survivor achievement
    if (gameStats.levelsCompleted >= 5) {
      this.unlockAchievement('survivor');
    }

    // Check high scorer achievement
    if (gameStats.totalScore >= 10000) {
      this.unlockAchievement('high_scorer');
    }

    // Check ball conservationist achievement
    if (gameStats.lives >= 2 && gameStats.levelsCompleted >= 1) {
      this.unlockAchievement('ball_conservationist');
    }

    // Update progress-based achievements
    this.updateProgressAchievement('goal_hunter', gameStats.goalsReached);
    this.updateProgressAchievement('level_explorer', gameStats.currentLevel);
    this.updateProgressAchievement('persistent_player', gameStats.gamesPlayed);
    this.updateProgressAchievement('time_investor', gameStats.totalPlayTime);
    this.updateProgressAchievement('veteran_player', gameStats.totalPlayTime);

    // Check master circuit achievement
    if (gameStats.currentLevel >= 20) { // Assuming 20 levels total
      this.unlockAchievement('master_circuit');
    }
  }

  /**
   * Unlock an achievement
   */
  public unlockAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    
    if (!achievement || achievement.unlocked) {
      return false;
    }

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();

    // Create notification
    const notification: AchievementNotification = {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      timestamp: Date.now(),
      category: achievement.category,
      rarity: achievement.rarity,
    };

    this.notifications.push(notification);

    // Call callback if set
    if (this.onAchievementUnlocked) {
      this.onAchievementUnlocked(achievement);
    }

    logger.info(`🏆 Achievement unlocked: ${achievement.name}`, null, 'AchievementManager');
    return true;
  }

  /**
   * Update progress for progress-based achievements
   */
  private updateProgressAchievement(achievementId: string, currentProgress: number): void {
    const achievement = this.achievements.get(achievementId);
    
    if (!achievement || achievement.unlocked || !achievement.maxProgress) {
      return;
    }

    achievement.progress = Math.min(currentProgress, achievement.maxProgress);

    // Check if achievement should be unlocked
    if (achievement.progress >= achievement.maxProgress) {
      this.unlockAchievement(achievementId);
    }
  }

  /**
   * Get all achievements
   */
  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get unlocked achievements
   */
  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(category: string): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }

  /**
   * Get achievements by rarity
   */
  public getAchievementsByRarity(rarity: string): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.rarity === rarity);
  }

  /**
   * Get recent notifications
   */
  public getRecentNotifications(limit: number = 5): AchievementNotification[] {
    return this.notifications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear old notifications
   */
  public clearOldNotifications(olderThan: number = 24 * 60 * 60 * 1000): void { // 24 hours
    const cutoff = Date.now() - olderThan;
    this.notifications = this.notifications.filter(n => n.timestamp > cutoff);
  }

  /**
   * Get achievement progress
   */
  public getAchievementProgress(achievementId: string): { current: number; max: number; percentage: number } | null {
    const achievement = this.achievements.get(achievementId);
    
    if (!achievement || !achievement.maxProgress) {
      return null;
    }

    const current = achievement.progress || 0;
    const percentage = (current / achievement.maxProgress) * 100;

    return {
      current,
      max: achievement.maxProgress,
      percentage: Math.min(percentage, 100),
    };
  }

  /**
   * Get achievement statistics
   */
  public getAchievementStats(): {
    total: number;
    unlocked: number;
    percentage: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
    byRarity: Record<string, { total: number; unlocked: number }>;
    } {
    const achievements = Array.from(this.achievements.values());
    const unlocked = achievements.filter(a => a.unlocked);
    
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    const byRarity: Record<string, { total: number; unlocked: number }> = {};

    // Initialize counters
    for (const achievement of achievements) {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = { total: 0, unlocked: 0 };
      }
      if (!byRarity[achievement.rarity]) {
        byRarity[achievement.rarity] = { total: 0, unlocked: 0 };
      }

      byCategory[achievement.category].total++;
      byRarity[achievement.rarity].total++;

      if (achievement.unlocked) {
        byCategory[achievement.category].unlocked++;
        byRarity[achievement.rarity].unlocked++;
      }
    }

    return {
      total: achievements.length,
      unlocked: unlocked.length,
      percentage: achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0,
      byCategory,
      byRarity,
    };
  }

  /**
   * Load achievements from save data
   */
  public loadAchievements(unlockedAchievementIds: string[]): void {
    for (const achievementId of unlockedAchievementIds) {
      const achievement = this.achievements.get(achievementId);
      if (achievement) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
      }
    }
    
    logger.info(`📂 Loaded ${unlockedAchievementIds.length} achievements from save`, null, 'AchievementManager');
  }

  /**
   * Get unlocked achievement IDs for saving
   */
  public getUnlockedAchievementIds(): string[] {
    return Array.from(this.achievements.values())
      .filter(a => a.unlocked)
      .map(a => a.id);
  }

  /**
   * Reset all achievements (for testing)
   */
  public resetAchievements(): void {
    for (const achievement of this.achievements.values()) {
      achievement.unlocked = false;
      achievement.unlockedAt = undefined;
      achievement.progress = 0;
    }
    
    this.notifications = [];
    logger.info('🔄 All achievements reset', null, 'AchievementManager');
  }
} 
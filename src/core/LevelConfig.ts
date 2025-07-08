export interface LevelHoleConfig {
  powerUpHoles: number;
  animatedHoles: number;
  standardHoles: number;
  goals: number;
  description: string;
}

export interface LevelConfig {
  levels: Record<string, LevelHoleConfig>;
  defaults: Omit<LevelHoleConfig, 'description'>;
}

export class LevelConfigManager {
  private static config: LevelConfig | null = null;

  /**
   * Load the level configuration from JSON
   */
  public static async loadConfig(): Promise<LevelConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const response = await fetch('./src/core/levelConfig.json');
      if (!response.ok) {
        throw new Error(`Failed to load level config: ${response.statusText}`);
      }
      
      const loadedConfig = await response.json() as LevelConfig;
      this.config = loadedConfig;
      return this.config;
    } catch (error) {
      console.error('Failed to load level configuration, using defaults:', error);
      
      // Fallback to default configuration
      this.config = {
        levels: {
          '1': { powerUpHoles: 1, animatedHoles: 2, standardHoles: 20, goals: 2, description: 'Circuit Level 1' },
          '2': { powerUpHoles: 2, animatedHoles: 3, standardHoles: 25, goals: 3, description: 'Circuit Level 2' },
          '3': { powerUpHoles: 3, animatedHoles: 4, standardHoles: 30, goals: 3, description: 'Circuit Level 3' },
          '4': { powerUpHoles: 3, animatedHoles: 4, standardHoles: 35, goals: 3, description: 'Circuit Level 4' },
          '5': { powerUpHoles: 3, animatedHoles: 4, standardHoles: 40, goals: 3, description: 'Circuit Level 5' },
        },
        defaults: {
          powerUpHoles: 1,
          animatedHoles: 2,
          standardHoles: 20,
          goals: 2,
        },
      };
      
      return this.config;
    }
  }

  /**
   * Get configuration for a specific level
   */
  public static getLevelConfig(levelId: number): LevelHoleConfig {
    if (!this.config) {
      throw new Error('Level configuration not loaded. Call loadConfig() first.');
    }

    const levelKey = levelId.toString();
    const levelConfig = this.config.levels[levelKey];
    
    if (!levelConfig) {
      // Fallback to defaults if level not found
      return {
        ...this.config.defaults,
        description: `Circuit Level ${levelId} - Navigate through the holes to reach the goal circuit. Difficulty: ${levelId}/5`,
      };
    }

    return levelConfig;
  }

  /**
   * Get all available level IDs
   */
  public static getAvailableLevelIds(): number[] {
    if (!this.config) {
      throw new Error('Level configuration not loaded. Call loadConfig() first.');
    }

    return Object.keys(this.config.levels).map(id => parseInt(id)).sort((a, b) => a - b);
  }

  /**
   * Reload configuration (useful for development)
   */
  public static async reloadConfig(): Promise<LevelConfig> {
    this.config = null;
    return this.loadConfig();
  }
} 
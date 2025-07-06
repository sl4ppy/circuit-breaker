// Circuit Breaker - Stats Menu Component
// Displays comprehensive game statistics and analytics

import { StatsManager } from '../core/StatsManager';
import { fontManager } from '../utils/FontManager';
import { logger } from '../utils/Logger';

export interface StatsMenuConfig {
  onClose: () => void;
  statsManager: StatsManager;
}

export class StatsMenu {
  private config: StatsMenuConfig;
  private currentTab: 'overview' | 'levels' | 'performance' | 'sessions' = 'overview';
  private scrollOffset: number = 0;
  private readonly TAB_HEIGHT = 40;
  private readonly SCROLL_SPEED = 20;

  constructor(config: StatsMenuConfig) {
    this.config = config;
    logger.info('📊 StatsMenu initialized', null, 'StatsMenu');
  }

  /**
   * Render the stats menu
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;

    // Draw background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, 360, 640);

    // Draw main container
    this.drawContainer(ctx);
    
    // Draw header
    this.drawHeader(ctx);
    
    // Draw tabs
    this.drawTabs(ctx);
    
    // Draw content based on current tab
    this.drawContent(ctx);
    
    // Draw footer
    this.drawFooter(ctx);
  }

  /**
   * Handle input
   */
  public handleInput(key: string): void {
    switch (key) {
      case 'Escape':
        this.config.onClose();
        break;
      case 'Digit1':
      case '1':
        this.currentTab = 'overview';
        break;
      case 'Digit2':
      case '2':
        this.currentTab = 'levels';
        break;
      case 'Digit3':
      case '3':
        this.currentTab = 'performance';
        break;
      case 'Digit4':
      case '4':
        this.currentTab = 'sessions';
        break;
      case 'ArrowUp':
        this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_SPEED);
        break;
      case 'ArrowDown':
        this.scrollOffset += this.SCROLL_SPEED;
        break;
    }
  }

  /**
   * Draw main container
   */
  private drawContainer(ctx: CanvasRenderingContext2D): void {
    const containerWidth = 340;
    const containerHeight = 580;
    const containerX = (360 - containerWidth) / 2;
    const containerY = 30;

    // Draw container background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(containerX, containerY, containerWidth, containerHeight);

    // Draw neon border
    ctx.strokeStyle = '#b600f9';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#b600f9';
    ctx.shadowBlur = 10;
    ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);
    ctx.shadowBlur = 0;
  }

  /**
   * Draw header
   */
  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#b600f9';
    fontManager.setFont(ctx, 'display', 20, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('GAME STATISTICS', Math.round(180), Math.round(60));

    // Draw subtitle
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('ANALYTICS & PERFORMANCE DATA', Math.round(180), Math.round(75));
  }

  /**
   * Draw tabs
   */
  private drawTabs(ctx: CanvasRenderingContext2D): void {
    const tabs = [
      { key: 'overview', label: 'OVERVIEW', number: '1' },
      { key: 'levels', label: 'LEVELS', number: '2' },
      { key: 'performance', label: 'PERFORMANCE', number: '3' },
      { key: 'sessions', label: 'SESSIONS', number: '4' },
    ];

    const tabWidth = 85;
    const tabY = 90;

    tabs.forEach((tab, index) => {
      const tabX = 10 + index * tabWidth;
      const isActive = this.currentTab === tab.key;

      // Draw tab background
      ctx.fillStyle = isActive ? '#b600f9' : '#333333';
      ctx.fillRect(Math.round(tabX), Math.round(tabY), tabWidth - 2, this.TAB_HEIGHT);

      // Draw tab border
      ctx.strokeStyle = isActive ? '#ffffff' : '#666666';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(tabX), Math.round(tabY), tabWidth - 2, this.TAB_HEIGHT);

      // Draw tab text
      ctx.fillStyle = isActive ? '#ffffff' : '#cccccc';
      fontManager.setFont(ctx, 'primary', 8, 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, Math.round(tabX + (tabWidth - 2) / 2), Math.round(tabY + 15));
      ctx.fillText(`[${tab.number}]`, Math.round(tabX + (tabWidth - 2) / 2), Math.round(tabY + 28));
    });
  }

  /**
   * Draw content based on current tab
   */
  private drawContent(ctx: CanvasRenderingContext2D): void {
    const contentY = 155;
    const contentHeight = 405;

    // Set up clipping for scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, contentY, 340, contentHeight);
    ctx.clip();

    // Apply scroll offset
    ctx.translate(0, -this.scrollOffset);

    switch (this.currentTab) {
      case 'overview':
        this.drawOverviewContent(ctx, contentY);
        break;
      case 'levels':
        this.drawLevelsContent(ctx, contentY);
        break;
      case 'performance':
        this.drawPerformanceContent(ctx, contentY);
        break;
      case 'sessions':
        this.drawSessionsContent(ctx, contentY);
        break;
    }

    ctx.restore();
  }

  /**
   * Draw overview content
   */
  private drawOverviewContent(ctx: CanvasRenderingContext2D, startY: number): void {
    const stats = this.config.statsManager.getStats();
    const summary = this.config.statsManager.getStatsSummary();

    let y = startY;

    // Draw summary stats
    this.drawStatRow(ctx, 'TOTAL PLAY TIME', summary.totalPlayTime, y);
    y += 25;
    this.drawStatRow(ctx, 'GAMES PLAYED', summary.gamesPlayed.toString(), y);
    y += 25;
    this.drawStatRow(ctx, 'COMPLETION RATE', summary.completionRate, y);
    y += 25;
    this.drawStatRow(ctx, 'AVERAGE SCORE', summary.averageScore.toString(), y);
    y += 25;
    this.drawStatRow(ctx, 'FAVORITE LEVEL', `Level ${summary.favoriteLevel}`, y);
    y += 25;
    this.drawStatRow(ctx, 'MOST CHALLENGING', `Level ${summary.mostChallengingLevel}`, y);
    y += 35;

    // Draw achievement progress
    this.drawProgressBar(ctx, 'ACHIEVEMENT PROGRESS', stats.achievementProgress, y);
    y += 30;
    this.drawStatRow(ctx, 'ACHIEVEMENTS UNLOCKED', `${stats.achievementsUnlocked}/${stats.totalAchievements}`, y);
    y += 35;

    // Draw high scores
    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 12, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('HIGH SCORES & RECORDS', Math.round(20), Math.round(y));
    y += 20;

    this.drawStatRow(ctx, 'HIGHEST SCORE', stats.highestScore.toString(), y);
    y += 25;
    this.drawStatRow(ctx, 'HIGHEST LEVEL', stats.highestLevel.toString(), y);
    y += 25;
    this.drawStatRow(ctx, 'LONGEST SESSION', this.formatPlayTime(stats.longestSession), y);
    y += 25;
    this.drawStatRow(ctx, 'FASTEST COMPLETION', this.formatPlayTime(stats.fastestLevelCompletion), y);
  }

  /**
   * Draw levels content
   */
  private drawLevelsContent(ctx: CanvasRenderingContext2D, startY: number): void {
    const stats = this.config.statsManager.getStats();
    let y = startY + 15; // Add padding below tabs

    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 12, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('LEVEL STATISTICS', Math.round(20), Math.round(y));
    y += 25;

    // Draw level headers
    ctx.fillStyle = '#b600f9';
    fontManager.setFont(ctx, 'primary', 10, 'bold');
    ctx.fillText('LEVEL', Math.round(20), Math.round(y));
    ctx.fillText('ATTEMPTS', Math.round(80), Math.round(y));
    ctx.fillText('COMPLETIONS', Math.round(140), Math.round(y));
    ctx.fillText('RATE', Math.round(200), Math.round(y));
    ctx.fillText('BEST TIME', Math.round(250), Math.round(y));
    ctx.fillText('BEST SCORE', Math.round(320), Math.round(y));
    y += 20;

    // Draw level data
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 9);

    for (const [levelId, levelStats] of stats.levelStats) {
      if (y - startY > 400) break; // Limit visible levels

      ctx.fillText(`Level ${levelId}`, Math.round(20), Math.round(y));
      ctx.fillText(levelStats.attempts.toString(), Math.round(80), Math.round(y));
      ctx.fillText(levelStats.completions.toString(), Math.round(140), Math.round(y));
      ctx.fillText(`${levelStats.completionRate.toFixed(1)}%`, Math.round(200), Math.round(y));
      ctx.fillText(this.formatPlayTime(levelStats.bestTime), Math.round(250), Math.round(y));
      ctx.fillText(levelStats.bestScore.toString(), Math.round(320), Math.round(y));
      y += 18;
    }
  }

  /**
   * Draw performance content
   */
  private drawPerformanceContent(ctx: CanvasRenderingContext2D, startY: number): void {
    const performance = this.config.statsManager.getPerformanceStats();
    let y = startY + 15; // Add padding below tabs

    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 12, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('PERFORMANCE METRICS', Math.round(20), Math.round(y));
    y += 25;

    // FPS stats
    this.drawStatRow(ctx, 'AVERAGE FPS', `${performance.averageFPS.toFixed(1)}`, y);
    y += 25;
    this.drawStatRow(ctx, 'MIN FPS', performance.minFPS.toString(), y);
    y += 25;
    this.drawStatRow(ctx, 'MAX FPS', performance.maxFPS.toString(), y);
    y += 35;

    // Load times
    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 10, 'bold');
    ctx.fillText('LOAD TIMES', Math.round(20), Math.round(y));
    y += 20;

    this.drawStatRow(ctx, 'GAME START', `${performance.loadTimes.gameStart}ms`, y);
    y += 25;
    this.drawStatRow(ctx, 'LEVEL LOAD', `${performance.loadTimes.levelLoad}ms`, y);
    y += 25;
    this.drawStatRow(ctx, 'ASSET LOAD', `${performance.loadTimes.assetLoad}ms`, y);
    y += 35;

    // Device info
    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 10, 'bold');
    ctx.fillText('DEVICE INFORMATION', Math.round(20), Math.round(y));
    y += 20;

    this.drawStatRow(ctx, 'PLATFORM', performance.deviceInfo.platform, y);
    y += 25;
    this.drawStatRow(ctx, 'RESOLUTION', performance.deviceInfo.screenResolution, y);
    y += 25;
    this.drawStatRow(ctx, 'LANGUAGE', performance.deviceInfo.language, y);
    y += 25;

    // User agent (truncated)
    const userAgent = performance.deviceInfo.userAgent.length > 30 
      ? performance.deviceInfo.userAgent.substring(0, 30) + '...'
      : performance.deviceInfo.userAgent;
    this.drawStatRow(ctx, 'BROWSER', userAgent, y);
  }

  /**
   * Draw sessions content
   */
  private drawSessionsContent(ctx: CanvasRenderingContext2D, startY: number): void {
    const stats = this.config.statsManager.getStats();
    let y = startY + 15; // Add padding below tabs

    ctx.fillStyle = '#00ff99';
    fontManager.setFont(ctx, 'primary', 12, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('RECENT SESSIONS', Math.round(20), Math.round(y));
    y += 25;

    // Session headers
    ctx.fillStyle = '#b600f9';
    fontManager.setFont(ctx, 'primary', 9, 'bold');
    ctx.fillText('DURATION', Math.round(20), Math.round(y));
    ctx.fillText('GOALS', Math.round(80), Math.round(y));
    ctx.fillText('BALLS LOST', Math.round(120), Math.round(y));
    ctx.fillText('SCORE', Math.round(180), Math.round(y));
    ctx.fillText('STATUS', Math.round(240), Math.round(y));
    y += 15;

    // Session data
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 8);

    for (const session of stats.recentSessions) {
      if (y - startY > 400) break; // Limit visible sessions

      const duration = this.formatPlayTime(session.duration);
      const status = session.completed ? 'COMPLETE' : 'INCOMPLETE';
      const statusColor = session.completed ? '#00ff99' : '#ff6666';

      ctx.fillText(duration, Math.round(20), Math.round(y));
      ctx.fillText(session.goalsReached.toString(), Math.round(80), Math.round(y));
      ctx.fillText(session.ballsLost.toString(), Math.round(120), Math.round(y));
      ctx.fillText(session.score.toString(), Math.round(180), Math.round(y));
      
      ctx.fillStyle = statusColor;
      ctx.fillText(status, Math.round(240), Math.round(y));
      ctx.fillStyle = '#ffffff';
      
      y += 16;
    }
  }

  /**
   * Draw a stat row
   */
  private drawStatRow(ctx: CanvasRenderingContext2D, label: string, value: string, y: number): void {
    ctx.fillStyle = '#cccccc';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.textAlign = 'left';
    ctx.fillText(label, Math.round(20), Math.round(y));

    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 10, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText(value, Math.round(330), Math.round(y));
  }

  /**
   * Draw a progress bar
   */
  private drawProgressBar(ctx: CanvasRenderingContext2D, label: string, percentage: number, y: number): void {
    // Draw label
    ctx.fillStyle = '#cccccc';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.textAlign = 'left';
    ctx.fillText(label, Math.round(20), Math.round(y));

    // Draw percentage
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 10, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText(`${percentage.toFixed(1)}%`, Math.round(330), Math.round(y));

    y += 15;

    // Draw progress bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(Math.round(20), Math.round(y), 300, 8);

    // Draw progress bar fill
    const fillWidth = (percentage / 100) * 300;
    ctx.fillStyle = '#00ff99';
    ctx.fillRect(Math.round(20), Math.round(y), fillWidth, 8);

    // Draw progress bar border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(20), Math.round(y), 300, 8);
  }

  /**
   * Draw footer
   */
  private drawFooter(ctx: CanvasRenderingContext2D): void {
    const footerY = 580;

    // Draw instructions
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 9);
    ctx.textAlign = 'center';
    ctx.fillText('1-4: Switch tabs | ↑↓: Scroll | ESC: Close', Math.round(180), Math.round(footerY));

    // Draw last updated
    const stats = this.config.statsManager.getStats();
    const lastUpdated = new Date(stats.lastUpdated).toLocaleString();
    ctx.fillText(`Last updated: ${lastUpdated}`, Math.round(180), Math.round(footerY + 15));
  }

  /**
   * Format play time for display
   */
  private formatPlayTime(ms: number): string {
    if (ms === 0) return 'N/A';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
} 
// Circuit Breaker - Win Screen Component
// Displays unified scoring breakdown and level completion information

import { fontManager } from '../utils/FontManager';
import { logger } from '../utils/Logger';
import { LevelScoreData } from '../core/UnifiedScoringSystem';

export interface WinScreenConfig {
  onContinue: () => void;
  levelTime: number; // milliseconds (for compatibility)
  sessionTotal: number; // milliseconds (for compatibility)
  levelId: number;
  score: number; // Level points from unified scoring system
  levelScoreData?: LevelScoreData; // New unified scoring data
  totalScore?: number; // Total score across all levels
}

export class WinScreen {
  private config: WinScreenConfig;
  private animationTime: number = 0;

  constructor(config: WinScreenConfig) {
    this.config = config;
    logger.info(`🏆 WinScreen initialized for Level ${config.levelId}`, null, 'WinScreen');
  }

  /**
   * Update the win screen animation
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    // No auto-advance - wait for player input only
  }

  /**
   * Render the win screen
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;

    // Draw background overlay with fade-in
    const backgroundAlpha = Math.min(this.animationTime / 500, 0.95); // Fade in over 500ms
    ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
    ctx.fillRect(0, 0, 360, 640);

    // Draw main container
    this.drawContainer(ctx);
    
    // Draw header
    this.drawHeader(ctx);
    
    // Draw level info
    this.drawLevelInfo(ctx);
    
    // Draw timing information
    this.drawTimingInfo(ctx);
    
    // Draw continue prompt
    this.drawContinuePrompt(ctx);
  }

  /**
   * Handle input
   */
  public handleInput(key: string): void {
    // Any key continues (ignore empty keys)
    if (key && key.trim() !== '') {
      this.config.onContinue();
    }
  }

  /**
   * Draw main container
   */
  private drawContainer(ctx: CanvasRenderingContext2D): void {
    const containerWidth = 320;
    const containerHeight = 400;
    const containerX = (360 - containerWidth) / 2;
    const containerY = (640 - containerHeight) / 2;

    // Container slide-in animation
    const slideProgress = Math.min(this.animationTime / 800, 1); // Slide in over 800ms
    const slideOffset = (1 - this.easeOutCubic(slideProgress)) * 50;
    const actualY = containerY + slideOffset;

    // Draw container background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(containerX, actualY, containerWidth, containerHeight);

    // Draw neon border with glow
    ctx.strokeStyle = '#00f0ff'; // Electric Blue
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.strokeRect(containerX, actualY, containerWidth, containerHeight);
    ctx.shadowBlur = 0;

    // Draw inner border
    ctx.strokeStyle = '#b600f9'; // Neon Purple
    ctx.lineWidth = 1;
    ctx.strokeRect(containerX + 5, actualY + 5, containerWidth - 10, containerHeight - 10);
  }

  /**
   * Draw header
   */
  private drawHeader(ctx: CanvasRenderingContext2D): void {
    const containerY = (640 - 400) / 2;
    const slideProgress = Math.min(this.animationTime / 800, 1);
    const slideOffset = (1 - this.easeOutCubic(slideProgress)) * 50;
    const headerY = containerY + slideOffset + 40;

    // Level completed text
    ctx.fillStyle = '#00f0ff';
    fontManager.setFont(ctx, 'display', 24, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETED', 180, headerY);

    // Success indicator
    ctx.fillStyle = '#00ff00';
    fontManager.setFont(ctx, 'primary', 12);
    ctx.fillText('✓ ALL GOALS REACHED', 180, headerY + 25);
  }

  /**
   * Draw level information with unified scoring
   */
  private drawLevelInfo(ctx: CanvasRenderingContext2D): void {
    const containerY = (640 - 400) / 2;
    const slideProgress = Math.min(this.animationTime / 800, 1);
    const slideOffset = (1 - this.easeOutCubic(slideProgress)) * 50;
    const infoY = containerY + slideOffset + 100;

    // Level number
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 16, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${this.config.levelId}`, 180, infoY);

    // Level points earned
    ctx.fillStyle = '#ffff00';
    fontManager.setFont(ctx, 'primary', 14);
    ctx.fillText(`LEVEL POINTS: ${this.config.score.toFixed(1)}`, 180, infoY + 25);

    // Total score if available
    if (this.config.totalScore !== undefined) {
      ctx.fillStyle = '#00ff00';
      fontManager.setFont(ctx, 'primary', 12, 'bold');
      ctx.fillText(`TOTAL SCORE: ${this.config.totalScore.toFixed(1)}`, 180, infoY + 45);
    }
  }

  /**
   * Draw unified scoring breakdown with animation
   */
  private drawTimingInfo(ctx: CanvasRenderingContext2D): void {
    const containerY = (640 - 400) / 2;
    const slideProgress = Math.min(this.animationTime / 800, 1);
    const slideOffset = (1 - this.easeOutCubic(slideProgress)) * 50;
    const timingY = containerY + slideOffset + 190;

    if (!this.config.levelScoreData) {
      // Fallback to old display if no unified scoring data
      this.drawLegacyTimingInfo(ctx, timingY);
      return;
    }

    const scoreData = this.config.levelScoreData;

    // Raw time (appears first)
    const rawTimeDelay = 1000; // 1 second delay
    if (this.animationTime > rawTimeDelay) {
      const rawTimeAlpha = Math.min((this.animationTime - rawTimeDelay) / 500, 1);
      ctx.fillStyle = `rgba(0, 240, 255, ${rawTimeAlpha})`;
      fontManager.setFont(ctx, 'primary', 10);
      ctx.textAlign = 'left';
      ctx.fillText('RAW TIME:', 60, timingY);

      ctx.fillStyle = `rgba(255, 255, 255, ${rawTimeAlpha})`;
      fontManager.setFont(ctx, 'primary', 12);
      ctx.textAlign = 'right';
      ctx.fillText(`${scoreData.rawTime.toFixed(3)}s`, 300, timingY);
    }

    // Time adjustments (appears second)
    const adjustmentsDelay = 1500; // 1.5 seconds delay
    if (this.animationTime > adjustmentsDelay && (scoreData.timeReductions > 0 || scoreData.assistPenalties > 0)) {
      const adjustAlpha = Math.min((this.animationTime - adjustmentsDelay) / 500, 1);
      
      if (scoreData.timeReductions > 0) {
        ctx.fillStyle = `rgba(0, 255, 0, ${adjustAlpha})`;
        fontManager.setFont(ctx, 'primary', 9);
        ctx.textAlign = 'left';
        ctx.fillText('TIME CUTS:', 60, timingY + 18);

        ctx.fillStyle = `rgba(0, 255, 0, ${adjustAlpha})`;
        fontManager.setFont(ctx, 'primary', 10);
        ctx.textAlign = 'right';
        ctx.fillText(`-${scoreData.timeReductions.toFixed(1)}s`, 300, timingY + 18);
      }

      if (scoreData.assistPenalties > 0) {
        ctx.fillStyle = `rgba(255, 165, 0, ${adjustAlpha})`;
        fontManager.setFont(ctx, 'primary', 9);
        ctx.textAlign = 'left';
        ctx.fillText('ASSIST PENALTY:', 60, timingY + 33);

        ctx.fillStyle = `rgba(255, 165, 0, ${adjustAlpha})`;
        fontManager.setFont(ctx, 'primary', 10);
        ctx.textAlign = 'right';
        ctx.fillText(`+${scoreData.assistPenalties.toFixed(1)}s`, 300, timingY + 33);
      }
    }

    // Adjusted time and calculation (appears third)
    const calculationDelay = 2000; // 2 seconds delay
    if (this.animationTime > calculationDelay) {
      const calcAlpha = Math.min((this.animationTime - calculationDelay) / 500, 1);
      
      // Draw separator line
      ctx.strokeStyle = `rgba(182, 0, 249, ${calcAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, timingY + 50);
      ctx.lineTo(300, timingY + 50);
      ctx.stroke();

      // Adjusted time
      ctx.fillStyle = `rgba(255, 255, 0, ${calcAlpha})`;
      fontManager.setFont(ctx, 'primary', 10, 'bold');
      ctx.textAlign = 'left';
      ctx.fillText('ADJUSTED TIME:', 60, timingY + 68);

      ctx.fillStyle = `rgba(255, 255, 0, ${calcAlpha})`;
      fontManager.setFont(ctx, 'primary', 12, 'bold');
      ctx.textAlign = 'right';
      ctx.fillText(`${scoreData.adjustedTime.toFixed(3)}s`, 300, timingY + 68);

      // Scoring calculation
      ctx.fillStyle = `rgba(136, 136, 136, ${calcAlpha})`;
      fontManager.setFont(ctx, 'primary', 8);
      ctx.textAlign = 'center';
      ctx.fillText(`${scoreData.baseLevelValue} ÷ ${scoreData.adjustedTime.toFixed(3)} = ${scoreData.levelPoints.toFixed(1)}`, 180, timingY + 85);
    }
  }

  /**
   * Draw legacy timing information (fallback)
   */
  private drawLegacyTimingInfo(ctx: CanvasRenderingContext2D, timingY: number): void {
    // Level time (appears first)
    const levelTimeDelay = 1000; // 1 second delay
    if (this.animationTime > levelTimeDelay) {
      const levelTimeAlpha = Math.min((this.animationTime - levelTimeDelay) / 500, 1);
      ctx.fillStyle = `rgba(0, 240, 255, ${levelTimeAlpha})`;
      fontManager.setFont(ctx, 'primary', 12);
      ctx.textAlign = 'left';
      ctx.fillText('LEVEL TIME:', 60, timingY);

      ctx.fillStyle = `rgba(255, 255, 255, ${levelTimeAlpha})`;
      fontManager.setFont(ctx, 'primary', 16, 'bold');
      ctx.textAlign = 'right';
      ctx.fillText(this.formatTime(this.config.levelTime), 300, timingY);
    }

    // Session total (appears with merge animation)
    const sessionTotalDelay = 1800; // 1.8 seconds delay
    if (this.animationTime > sessionTotalDelay) {
      const sessionAlpha = Math.min((this.animationTime - sessionTotalDelay) / 500, 1);
      
      // Draw separator line
      ctx.strokeStyle = `rgba(182, 0, 249, ${sessionAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, timingY + 20);
      ctx.lineTo(300, timingY + 20);
      ctx.stroke();

      // Previous session time
      const previousSessionTime = this.config.sessionTotal - this.config.levelTime;
      ctx.fillStyle = `rgba(136, 136, 136, ${sessionAlpha})`;
      fontManager.setFont(ctx, 'primary', 10);
      ctx.textAlign = 'left';
      ctx.fillText('PREVIOUS:', 60, timingY + 40);

      ctx.fillStyle = `rgba(136, 136, 136, ${sessionAlpha})`;
      fontManager.setFont(ctx, 'primary', 12);
      ctx.textAlign = 'right';
      ctx.fillText(this.formatTime(previousSessionTime), 300, timingY + 40);

      // Session total
      ctx.fillStyle = `rgba(0, 255, 0, ${sessionAlpha})`;
      fontManager.setFont(ctx, 'primary', 12, 'bold');
      ctx.textAlign = 'left';
      ctx.fillText('SESSION TOTAL:', 60, timingY + 65);

      ctx.fillStyle = `rgba(0, 255, 0, ${sessionAlpha})`;
      fontManager.setFont(ctx, 'primary', 18, 'bold');
      ctx.textAlign = 'right';
      ctx.fillText(this.formatTime(this.config.sessionTotal), 300, timingY + 65);
    }
  }

  /**
   * Draw continue prompt
   */
  private drawContinuePrompt(ctx: CanvasRenderingContext2D): void {
    const containerY = (640 - 400) / 2;
    const slideProgress = Math.min(this.animationTime / 800, 1);
    const slideOffset = (1 - this.easeOutCubic(slideProgress)) * 50;
    const promptY = containerY + slideOffset + 320;

    // Flashing continue prompt
    const flashDelay = 2500; // 2.5 seconds delay
    if (this.animationTime > flashDelay) {
      const flashCycle = (this.animationTime - flashDelay) % 1000; // 1 second cycle
      const flashAlpha = 0.5 + 0.5 * Math.sin(flashCycle / 1000 * Math.PI * 2);
      
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      fontManager.setFont(ctx, 'primary', 12, 'bold');
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ANY KEY TO CONTINUE', 180, promptY);

      // Additional prompt for clarity
      ctx.fillStyle = `rgba(136, 136, 136, ${flashAlpha * 0.8})`;
      fontManager.setFont(ctx, 'primary', 8);
      ctx.fillText('SPACE, ENTER, OR CLICK TO ADVANCE', 180, promptY + 15);
    }
  }

  /**
   * Format time from milliseconds to MM:SS.sss
   */
  private formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }

  /**
   * Ease out cubic animation
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
} 
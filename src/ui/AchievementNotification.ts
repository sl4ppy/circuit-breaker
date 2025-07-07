// Circuit Breaker - Achievement Notification Component
// Shows popup notifications when achievements are unlocked

import { Achievement } from '../core/AchievementManager';
import { logger } from '../utils/Logger';

export interface AchievementNotificationConfig {
  onComplete: () => void;
}

export class AchievementNotification {
  private config: AchievementNotificationConfig;
  private achievement: Achievement | null = null;
  private isVisible: boolean = false;
  private startTime: number = 0;
  private animationPhase: 'slideIn' | 'show' | 'slideOut' = 'slideIn';
  private slideInDuration: number = 500;
  private slideOutDuration: number = 500;
  private showDuration: number = 3000;

  constructor(config: AchievementNotificationConfig) {
    this.config = config;
    logger.info('🏆 AchievementNotification initialized', null, 'AchievementNotification');
  }

  /**
   * Show an achievement notification
   */
  public show(achievement: Achievement): void {
    this.achievement = achievement;
    this.isVisible = true;
    this.startTime = Date.now();
    this.animationPhase = 'slideIn';
    logger.info(`🏆 Showing achievement notification: ${achievement.name}`, null, 'AchievementNotification');
  }

  /**
   * Hide the notification
   */
  public hide(): void {
    this.isVisible = false;
    this.achievement = null;
    this.animationPhase = 'slideIn';
  }

  /**
   * Check if notification is visible
   */
  public isNotificationVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Update notification animation
   */
  public update(_deltaTime: number): void {
    if (!this.isVisible || !this.achievement) return;

    const elapsed = Date.now() - this.startTime;

    // Handle animation phases
    if (this.animationPhase === 'slideIn' && elapsed >= this.slideInDuration) {
      this.animationPhase = 'show';
      this.startTime = Date.now();
    } else if (this.animationPhase === 'show' && elapsed >= this.showDuration) {
      this.animationPhase = 'slideOut';
      this.startTime = Date.now();
    } else if (this.animationPhase === 'slideOut' && elapsed >= this.slideOutDuration) {
      this.hide();
      this.config.onComplete();
    }
  }

  /**
   * Render the achievement notification
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.achievement) return;

    const elapsed = Date.now() - this.startTime;
    let progress = 0;
    let yOffset = 0;

    // Calculate animation progress and position
    switch (this.animationPhase) {
    case 'slideIn':
      progress = Math.min(elapsed / this.slideInDuration, 1);
      yOffset = (1 - progress) * 100; // Slide down from above
      break;
    case 'show':
      progress = 1;
      yOffset = 0;
      break;
    case 'slideOut':
      progress = Math.min(elapsed / this.slideOutDuration, 1);
      yOffset = progress * 100; // Slide up and out
      break;
    }

    // Apply easing
    const easeProgress = this.easeOutBack(progress);

    // Notification position (top-right corner)
    const notificationWidth = 300;
    const notificationHeight = 80;
    const x = 360 - notificationWidth - 20 + (1 - easeProgress) * notificationWidth;
    const y = 20 + yOffset;

    // Background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + notificationHeight);
    gradient.addColorStop(0, '#2a2a3e');
    gradient.addColorStop(1, '#1a1a2e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, notificationWidth, notificationHeight);

    // Border with rarity color
    const rarityColors = {
      common: '#cccccc',
      rare: '#4a90e2',
      epic: '#9b59b6',
      legendary: '#f39c12',
    };
    
    ctx.strokeStyle = rarityColors[this.achievement.rarity] || '#cccccc';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, notificationWidth, notificationHeight);

    // Achievement icon
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.achievement.icon, x + 30, y + 45);

    // Achievement name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Interceptor"';
    ctx.textAlign = 'left';
    ctx.fillText(this.achievement.name, x + 60, y + 30);

    // Achievement description
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px "Interceptor"';
    ctx.fillText(this.achievement.description, x + 60, y + 50);

    // Rarity badge
    const rarityText = this.achievement.rarity.toUpperCase();
    ctx.fillStyle = rarityColors[this.achievement.rarity] || '#cccccc';
    ctx.font = '10px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText(rarityText, x + notificationWidth - 40, y + 25);

    // Progress bar for progress-based achievements
    if (this.achievement.maxProgress && this.achievement.progress !== undefined) {
      const progressBarWidth = 80;
      const progressBarHeight = 6;
      const progressBarX = x + notificationWidth - progressBarWidth - 20;
      const progressBarY = y + notificationHeight - 20;

      // Background
      ctx.fillStyle = '#444444';
      ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

      // Progress
      const progressPercent = this.achievement.progress / this.achievement.maxProgress;
      ctx.fillStyle = rarityColors[this.achievement.rarity] || '#4a90e2';
      ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progressPercent, progressBarHeight);

      // Progress text
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Interceptor"';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${this.achievement.progress}/${this.achievement.maxProgress}`,
        progressBarX + progressBarWidth / 2,
        progressBarY - 5,
      );
    }

    // Sparkle effect for legendary achievements
    if (this.achievement.rarity === 'legendary') {
      this.renderSparkles(ctx, x, y, notificationWidth, notificationHeight, elapsed);
    }
  }

  /**
   * Render sparkle effects for legendary achievements
   */
  private renderSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, elapsed: number): void {
    const sparkleCount = 8;
    const sparkleSize = 2;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (elapsed * 0.001 + i * Math.PI * 2 / sparkleCount) % (Math.PI * 2);
      const radius = 30 + Math.sin(elapsed * 0.002 + i) * 10;
      const sparkleX = x + width / 2 + Math.cos(angle) * radius;
      const sparkleY = y + height / 2 + Math.sin(angle) * radius;
      
      const alpha = 0.5 + 0.5 * Math.sin(elapsed * 0.003 + i);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fillRect(sparkleX - sparkleSize / 2, sparkleY - sparkleSize / 2, sparkleSize, sparkleSize);
    }
  }

  /**
   * Easing function for smooth animations
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
} 
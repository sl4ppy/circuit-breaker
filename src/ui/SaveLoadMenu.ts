// Circuit Breaker - Save/Load Menu Component
// Handles save slot management and game progress display

import { SaveSlot, GameProgress } from '../core/StorageManager';
import { Achievement } from '../core/AchievementManager';
import { logger } from '../utils/Logger';

export interface SaveLoadMenuConfig {
  onClose: () => void;
  onLoadGame: (slotId: number) => void;
  onNewGame: (slotId: number) => void;
  onDeleteSlot: (slotId: number) => void;
  getSaveSlots: () => SaveSlot[];
  getCurrentProgress: () => GameProgress | null;
  getAchievements: () => Achievement[];
}

export class SaveLoadMenu {
  private config: SaveLoadMenuConfig;
  private selectedSlot: number = 0;
  private isConfirmingDelete: boolean = false;
  private deleteSlotId: number = -1;
  private isVisible: boolean = false;

  // UI state
  private hoveredSlot: number = -1;
  private scrollOffset: number = 0;
  private message: string = '';
  private messageTimer: number = 0;
  private messageType: 'info' | 'success' | 'error' = 'info';

  constructor(config: SaveLoadMenuConfig) {
    this.config = config;
    logger.info('💾 SaveLoadMenu initialized', null, 'SaveLoadMenu');
  }

  /**
   * Show the save/load menu
   */
  public show(): void {
    this.isVisible = true;
    this.selectedSlot = 0;
    this.isConfirmingDelete = false;
    this.deleteSlotId = -1;
    this.hoveredSlot = -1;
    this.scrollOffset = 0;
    this.clearMessage();
    logger.info('💾 Save/Load menu opened', null, 'SaveLoadMenu');
  }

  /**
   * Hide the save/load menu
   */
  public hide(): void {
    this.isVisible = false;
    logger.info('💾 Save/Load menu closed', null, 'SaveLoadMenu');
  }

  /**
   * Check if menu is visible
   */
  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Handle pointer move events
   */
  public handlePointerMove(x: number, y: number): void {
    if (!this.isVisible) return;

    // Check slot hover
    const slotY = this.getSlotYPosition();
    const slotHeight = 80;
    const startY = 150 + slotY;

    for (let i = 0; i < 3; i++) {
      const slotStartY = startY + (i * (slotHeight + 10));
      const slotEndY = slotStartY + slotHeight;

      if (y >= slotStartY && y <= slotEndY && x >= 50 && x <= 310) {
        this.hoveredSlot = i;
        return;
      }
    }

    this.hoveredSlot = -1;
  }

  /**
   * Handle pointer down events
   */
  public handlePointerDown(x: number, y: number): void {
    if (!this.isVisible) return;

    if (this.isConfirmingDelete) {
      this.handleDeleteConfirmationClick(x, y);
      return;
    }

    // Check slot selection
    const slotY = this.getSlotYPosition();
    const slotHeight = 80;
    const startY = 150 + slotY;

    for (let i = 0; i < 3; i++) {
      const slotStartY = startY + (i * (slotHeight + 10));
      const slotEndY = slotStartY + slotHeight;

      if (y >= slotStartY && y <= slotEndY && x >= 50 && x <= 310) {
        this.selectedSlot = i;
        return;
      }
    }

    // Check button clicks
    this.handleButtonClick(x, y);
  }

  /**
   * Handle pointer up events
   */
  public handlePointerUp(_x: number, _y: number): void {
    if (!this.isVisible) return;
  }

  /**
   * Handle keyboard input
   */
  public handleKeyPress(key: string): boolean {
    if (!this.isVisible) return false;

    switch (key) {
    case 'Escape':
      if (this.isConfirmingDelete) {
        this.cancelDelete();
      } else {
        this.config.onClose();
      }
      return true;

    case 'Enter':
      if (this.isConfirmingDelete) {
        this.confirmDelete();
      } else {
        this.loadSelectedSlot();
      }
      return true;

    case 'KeyN':
      if (!this.isConfirmingDelete) {
        this.newGameInSelectedSlot();
      }
      return true;

    case 'KeyD':
      if (!this.isConfirmingDelete) {
        this.deleteSelectedSlot();
      }
      return true;

    case 'ArrowUp':
      this.selectedSlot = Math.max(0, this.selectedSlot - 1);
      return true;

    case 'ArrowDown':
      this.selectedSlot = Math.min(2, this.selectedSlot + 1);
      return true;
    }

    return false;
  }

  /**
   * Render the save/load menu
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 360, 640);

    // Menu background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 50, 320, 540);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px "Cyberpunks"';
    ctx.textAlign = 'center';
    ctx.fillText('SAVE/LOAD GAME', 180, 90);

    if (this.isConfirmingDelete) {
      this.renderDeleteConfirmation(ctx);
    } else {
      this.renderSaveSlots(ctx);
      this.renderButtons(ctx);
      this.renderProgressInfo(ctx);
      this.renderMessage(ctx);
    }
  }

  /**
   * Render save slots
   */
  private renderSaveSlots(ctx: CanvasRenderingContext2D): void {
    const slots = this.config.getSaveSlots();
    const slotY = this.getSlotYPosition();
    const slotHeight = 80;
    const startY = 150 + slotY;

    for (let i = 0; i < 3; i++) {
      const slotStartY = startY + (i * (slotHeight + 10));
      const slot = slots.find(s => s.id === i);
      const isSelected = this.selectedSlot === i;
      const isHovered = this.hoveredSlot === i;

      // Slot background
      if (isSelected) {
        ctx.fillStyle = '#4a90e2';
      } else if (isHovered) {
        ctx.fillStyle = '#2a2a4e';
      } else {
        ctx.fillStyle = '#2a2a3e';
      }
      ctx.fillRect(50, slotStartY, 260, slotHeight);

      // Slot border
      ctx.strokeStyle = isSelected ? '#ffffff' : '#444444';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, slotStartY, 260, slotHeight);

      if (slot) {
        // Slot has data
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Interceptor"';
        ctx.textAlign = 'left';
        ctx.fillText(`Save ${i + 1}`, 70, slotStartY + 25);

        // Level and score info
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px "Interceptor"';
        ctx.fillText(`Level: ${slot.progress.currentLevel}`, 70, slotStartY + 45);
        ctx.fillText(`Score: ${slot.progress.totalScore.toLocaleString()}`, 70, slotStartY + 65);

        // Last played date
        const date = new Date(slot.lastPlayed);
        ctx.fillStyle = '#888888';
        ctx.font = '12px "Interceptor"';
        ctx.fillText(date.toLocaleDateString(), 200, slotStartY + 25);
        ctx.fillText(date.toLocaleTimeString(), 200, slotStartY + 45);
      } else {
        // Empty slot
        ctx.fillStyle = '#666666';
        ctx.font = '16px "Interceptor"';
        ctx.textAlign = 'center';
        ctx.fillText('Empty Slot', 180, slotStartY + 45);
      }
    }
  }

  /**
   * Render action buttons
   */
  private renderButtons(ctx: CanvasRenderingContext2D): void {
    const buttonY = 450;
    const buttonHeight = 40;
    const buttonWidth = 80;

    // Load button
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(60, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText('LOAD', 100, buttonY + 25);

    // New Game button
    ctx.fillStyle = '#50c878';
    ctx.fillRect(150, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText('NEW', 190, buttonY + 25);

    // Delete button
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(240, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText('DELETE', 280, buttonY + 25);

    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '12px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText('Use arrow keys to navigate, Enter to select', 180, buttonY + 70);
    ctx.fillText('ESC to close', 180, buttonY + 85);
  }

  /**
   * Render progress information
   */
  private renderProgressInfo(ctx: CanvasRenderingContext2D): void {
    const currentProgress = this.config.getCurrentProgress();
    if (!currentProgress) return;

    const infoY = 550;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Interceptor"';
    ctx.textAlign = 'left';

    // Progress stats
    ctx.fillText(`Total Play Time: ${this.formatPlayTime(currentProgress.playTime)}`, 60, infoY);
    ctx.fillText(`Games Played: ${currentProgress.gamesPlayed}`, 60, infoY + 20);
    ctx.fillText(`Goals Reached: ${currentProgress.totalGoalsReached}`, 60, infoY + 40);
    ctx.fillText(`Balls Lost: ${currentProgress.totalBallsLost}`, 60, infoY + 60);

    // Achievement progress
    const achievements = this.config.getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    ctx.fillText(`Achievements: ${unlockedCount}/${achievements.length}`, 200, infoY);
  }

  /**
   * Render delete confirmation dialog
   */
  private renderDeleteConfirmation(ctx: CanvasRenderingContext2D): void {
    // Confirmation background
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(80, 200, 200, 150);

    // Border
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 200, 200, 150);

    // Warning text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText('DELETE SAVE SLOT?', 180, 230);
    ctx.fillText(`Save ${this.deleteSlotId + 1}`, 180, 250);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = '14px "Interceptor"';
    ctx.fillText('This action cannot be undone!', 180, 270);

    // Buttons
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(100, 280, 60, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Interceptor"';
    ctx.fillText('YES', 130, 300);

    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(200, 280, 60, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NO', 230, 300);
  }

  /**
   * Handle button clicks
   */
  private handleButtonClick(x: number, y: number): void {
    const buttonY = 450;
    const buttonHeight = 40;
    const buttonWidth = 80;

    if (y >= buttonY && y <= buttonY + buttonHeight) {
      // Load button
      if (x >= 60 && x <= 60 + buttonWidth) {
        this.loadSelectedSlot();
      }
      // New Game button
      else if (x >= 150 && x <= 150 + buttonWidth) {
        this.newGameInSelectedSlot();
      }
      // Delete button
      else if (x >= 240 && x <= 240 + buttonWidth) {
        this.deleteSelectedSlot();
      }
    }
  }

  /**
   * Handle delete confirmation clicks
   */
  private handleDeleteConfirmationClick(x: number, y: number): void {
    // Yes button
    if (x >= 100 && x <= 160 && y >= 280 && y <= 310) {
      this.confirmDelete();
    }
    // No button
    else if (x >= 200 && x <= 260 && y >= 280 && y <= 310) {
      this.cancelDelete();
    }
  }

  /**
   * Load the selected save slot
   */
  private loadSelectedSlot(): void {
    const slots = this.config.getSaveSlots();
    const slot = slots.find(s => s.id === this.selectedSlot);
    
    if (slot) {
      logger.info(`📂 Loading save slot ${this.selectedSlot}`, null, 'SaveLoadMenu');
      this.showMessage(`Loading save slot ${this.selectedSlot + 1}...`, 'info', 1000);
      setTimeout(() => {
        this.config.onLoadGame(this.selectedSlot);
        this.hide();
      }, 1000);
    } else {
      logger.warn(`⚠️ No save data in slot ${this.selectedSlot}`, null, 'SaveLoadMenu');
      this.showMessage('No save data in this slot', 'error');
    }
  }

  /**
   * Start a new game in the selected slot
   */
  private newGameInSelectedSlot(): void {
    logger.info(`🆕 Starting new game in slot ${this.selectedSlot}`, null, 'SaveLoadMenu');
    this.showMessage(`Starting new game in slot ${this.selectedSlot + 1}...`, 'success', 1000);
    setTimeout(() => {
      this.config.onNewGame(this.selectedSlot);
      this.hide();
    }, 1000);
  }

  /**
   * Delete the selected save slot
   */
  private deleteSelectedSlot(): void {
    const slots = this.config.getSaveSlots();
    const slot = slots.find(s => s.id === this.selectedSlot);
    
    if (slot) {
      this.isConfirmingDelete = true;
      this.deleteSlotId = this.selectedSlot;
      logger.info(`🗑️ Confirming deletion of save slot ${this.selectedSlot}`, null, 'SaveLoadMenu');
    } else {
      logger.warn(`⚠️ No save data to delete in slot ${this.selectedSlot}`, null, 'SaveLoadMenu');
      this.showMessage('No save data to delete', 'error');
    }
  }

  /**
   * Confirm slot deletion
   */
  private confirmDelete(): void {
    logger.info(`🗑️ Deleting save slot ${this.deleteSlotId}`, null, 'SaveLoadMenu');
    this.config.onDeleteSlot(this.deleteSlotId);
    this.showMessage(`Save slot ${this.deleteSlotId + 1} deleted`, 'success');
    this.cancelDelete();
  }

  /**
   * Cancel slot deletion
   */
  private cancelDelete(): void {
    this.isConfirmingDelete = false;
    this.deleteSlotId = -1;
  }

  /**
   * Get slot Y position with scroll offset
   */
  private getSlotYPosition(): number {
    return this.scrollOffset;
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

  /**
   * Show a message to the user
   */
  private showMessage(text: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 3000): void {
    this.message = text;
    this.messageType = type;
    this.messageTimer = Date.now() + duration;
    logger.info(`💾 Save/Load Menu: ${text}`, null, 'SaveLoadMenu');
  }

  /**
   * Clear the current message
   */
  private clearMessage(): void {
    this.message = '';
    this.messageTimer = 0;
  }

  /**
   * Update message timer
   */
  public update(_deltaTime: number): void {
    if (this.message && this.messageTimer > 0 && Date.now() > this.messageTimer) {
      this.clearMessage();
    }
  }

  /**
   * Render message overlay
   */
  private renderMessage(ctx: CanvasRenderingContext2D): void {
    if (!this.message) return;

    // Message background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(60, 400, 240, 40);

    // Message border
    const borderColor = this.messageType === 'error' ? '#e74c3c' : 
      this.messageType === 'success' ? '#50c878' : '#4a90e2';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 400, 240, 40);

    // Message text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Interceptor"';
    ctx.textAlign = 'center';
    ctx.fillText(this.message, 180, 425);
  }
} 
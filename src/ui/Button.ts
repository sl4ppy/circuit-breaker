import { AudioManager } from '../audio/AudioManager';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  audioManager: AudioManager;
  soundKey?: string;
  nineSlice?: HTMLImageElement | null;
}

export class Button {
  private config: ButtonConfig;
  private isHovered = false;
  private isPressed = false;

  constructor(config: ButtonConfig) {
    this.config = config;
    // Register event listeners elsewhere (UI manager or main loop)
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height, label, nineSlice } = this.config;
    // Draw 9-slice background if provided, else fallback
    if (nineSlice) {
      // Placeholder: draw as simple rect for now, 9-slice logic to be added
      ctx.drawImage(nineSlice, x, y, width, height);
    } else {
      ctx.save();
      ctx.fillStyle = this.isPressed ? '#00f0ff' : this.isHovered ? '#b600f9' : '#222';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Draw label
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '18px Interceptor, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
    ctx.restore();
  }

  public handlePointerMove(px: number, py: number) {
    const { x, y, width, height, audioManager } = this.config;
    const wasHovered = this.isHovered;
    this.isHovered = px >= x && px <= x + width && py >= y && py <= y + height;
    if (this.isHovered && !wasHovered) {
      audioManager.playSound(this.config.soundKey || 'ui_hover');
    }
  }

  public handlePointerDown(_px: number, _py: number) {
    if (this.isHovered) {
      this.isPressed = true;
    }
  }

  public handlePointerUp(_px: number, _py: number) {
    if (this.isHovered && this.isPressed) {
      this.config.audioManager.playSound(this.config.soundKey || 'ui_click');
      this.config.onClick();
    }
    this.isPressed = false;
  }

  public setLabel(label: string): void {
    this.config.label = label;
  }
} 
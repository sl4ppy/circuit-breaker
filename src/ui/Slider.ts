import { AudioManager } from '../audio/AudioManager';

export interface SliderConfig {
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  audioManager: AudioManager;
  soundKey?: string;
  nineSlice?: HTMLImageElement | null;
}

export class Slider {
  private config: SliderConfig;
  private isDragging = false;

  constructor(config: SliderConfig) {
    this.config = config;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width, min, max, value, nineSlice } = this.config;
    // Draw 9-slice background if provided, else fallback
    if (nineSlice) {
      ctx.drawImage(nineSlice, x, y, width, 16);
    } else {
      ctx.save();
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, 16, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Draw handle
    const percent = (value - min) / (max - min);
    const handleX = x + percent * width;
    ctx.save();
    ctx.fillStyle = '#b600f9';
    ctx.beginPath();
    ctx.arc(handleX, y + 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public handlePointerDown(px: number, py: number) {
    const { x, y, width } = this.config;
    if (py >= y && py <= y + 16 && px >= x && px <= x + width) {
      this.isDragging = true;
      this.updateValueFromPointer(px);
    }
  }

  public handlePointerMove(px: number, _py: number) {
    if (this.isDragging) {
      this.updateValueFromPointer(px);
    }
  }

  public handlePointerUp(_px: number, _py: number) {
    if (this.isDragging) {
      this.isDragging = false;
      this.config.audioManager.playSound(this.config.soundKey || 'ui_click');
    }
  }

  private updateValueFromPointer(px: number) {
    const { x, width, min, max, onChange, audioManager } = this.config;
    let percent = (px - x) / width;
    percent = Math.max(0, Math.min(1, percent));
    const newValue = min + percent * (max - min);
    if (newValue !== this.config.value) {
      this.config.value = newValue;
      onChange(newValue);
      audioManager.playSound(this.config.soundKey || 'ui_slide');
    }
  }

  public setValue(value: number): void {
    this.config.value = Math.max(this.config.min, Math.min(this.config.max, value));
  }
} 
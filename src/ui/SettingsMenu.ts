import { Button } from './Button';
import { Slider } from './Slider';
import { AudioManager } from '../audio/AudioManager';
import { logger } from '../utils/Logger';

export interface SettingsMenuConfig {
  audioManager: AudioManager;
  onClose: () => void;
  onBackToMenu?: () => void;
  isFromPauseMenu?: boolean;
}

export class SettingsMenu {
  private config: SettingsMenuConfig;
  private isVisible = false;
  private buttons: Button[] = [];
  private sliders: Slider[] = [];
  private masterVolumeSlider!: Slider;
  private musicVolumeSlider!: Slider;
  private sfxVolumeSlider!: Slider;
  private muteButton!: Button;
  private closeButton!: Button;
  private backToMenuButton?: Button;

  constructor(config: SettingsMenuConfig) {
    this.config = config;
    this.createControls();
  }

  private createControls(): void {
    const { audioManager, onClose, onBackToMenu, isFromPauseMenu } = this.config;

    // Volume sliders
    this.masterVolumeSlider = new Slider({
      x: 80,
      y: 200,
      width: 200,
      min: 0,
      max: 1,
      value: audioManager.getConfig().masterVolume,
      onChange: (value) => {
        audioManager.setMasterVolume(value);
        logger.debug(`Master volume set to: ${value}`, null, 'SettingsMenu');
      },
      audioManager,
      soundKey: 'ui_slide',
    });

    this.musicVolumeSlider = new Slider({
      x: 80,
      y: 250,
      width: 200,
      min: 0,
      max: 1,
      value: audioManager.getConfig().musicVolume,
      onChange: (value) => {
        audioManager.setMusicVolume(value);
        logger.debug(`Music volume set to: ${value}`, null, 'SettingsMenu');
      },
      audioManager,
      soundKey: 'ui_slide',
    });

    this.sfxVolumeSlider = new Slider({
      x: 80,
      y: 300,
      width: 200,
      min: 0,
      max: 1,
      value: audioManager.getConfig().sfxVolume,
      onChange: (value) => {
        audioManager.setSFXVolume(value);
        logger.debug(`SFX volume set to: ${value}`, null, 'SettingsMenu');
      },
      audioManager,
      soundKey: 'ui_slide',
    });

    // Mute button
    this.muteButton = new Button({
      x: 80,
      y: 350,
      width: 200,
      height: 40,
      label: audioManager.getConfig().enabled ? 'Mute Audio' : 'Unmute Audio',
      onClick: () => {
        const newEnabled = !audioManager.getConfig().enabled;
        audioManager.setEnabled(newEnabled);
        this.muteButton.setLabel(newEnabled ? 'Mute Audio' : 'Unmute Audio');
        logger.debug(`Audio ${newEnabled ? 'enabled' : 'disabled'}`, null, 'SettingsMenu');
      },
      audioManager,
      soundKey: 'ui_click',
    });

    // Close button
    this.closeButton = new Button({
      x: 80,
      y: 420,
      width: 200,
      height: 40,
      label: 'Close',
      onClick: onClose,
      audioManager,
      soundKey: 'ui_click',
    });

    // Back to menu button (only if from pause menu)
    if (isFromPauseMenu && onBackToMenu) {
      this.backToMenuButton = new Button({
        x: 80,
        y: 470,
        width: 200,
        height: 40,
        label: 'Back to Menu',
        onClick: onBackToMenu,
        audioManager,
        soundKey: 'ui_click',
      });
    }

    // Collect all controls for event handling
    this.sliders = [this.masterVolumeSlider, this.musicVolumeSlider, this.sfxVolumeSlider];
    this.buttons = [this.muteButton, this.closeButton];
    if (this.backToMenuButton) {
      this.buttons.push(this.backToMenuButton);
    }
  }

  public show(): void {
    this.isVisible = true;
    logger.info('Settings menu opened', null, 'SettingsMenu');
  }

  public hide(): void {
    this.isVisible = false;
    logger.info('Settings menu closed', null, 'SettingsMenu');
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;

    // Draw semi-transparent background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 360, 640);
    ctx.restore();

    // Draw menu panel
    ctx.save();
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(50, 100, 260, 440, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw title
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.font = '24px Cyberpunks, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', 180, 140);
    ctx.restore();

    // Draw labels
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Interceptor, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Master Volume:', 80, 190);
    ctx.fillText('Music Volume:', 80, 240);
    ctx.fillText('SFX Volume:', 80, 290);
    ctx.restore();

    // Draw controls
    this.sliders.forEach(slider => slider.draw(ctx));
    this.buttons.forEach(button => button.draw(ctx));
  }

  public handlePointerMove(x: number, y: number): void {
    if (!this.isVisible) return;
    this.buttons.forEach(button => button.handlePointerMove(x, y));
  }

  public handlePointerDown(x: number, y: number): void {
    if (!this.isVisible) return;
    this.buttons.forEach(button => button.handlePointerDown(x, y));
    this.sliders.forEach(slider => slider.handlePointerDown(x, y));
  }

  public handlePointerUp(x: number, y: number): void {
    if (!this.isVisible) return;
    this.buttons.forEach(button => button.handlePointerUp(x, y));
    this.sliders.forEach(slider => slider.handlePointerUp(x, y));
  }

  public updateVolumeDisplays(): void {
    const config = this.config.audioManager.getConfig();
    this.masterVolumeSlider.setValue(config.masterVolume);
    this.musicVolumeSlider.setValue(config.musicVolume);
    this.sfxVolumeSlider.setValue(config.sfxVolume);
    this.muteButton.setLabel(config.enabled ? 'Mute Audio' : 'Unmute Audio');
  }

  public get isFromPauseMenu(): boolean {
    return !!this.config.isFromPauseMenu;
  }
} 
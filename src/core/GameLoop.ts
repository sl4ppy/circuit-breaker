// Circuit Breaker - Game Loop
// Handles the main game loop with fixed timestep and performance optimization

import { GameState, GameStateType } from './GameState';
import { Renderer } from '../rendering/Renderer';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { Game } from './Game';
import { fontManager } from '../utils/FontManager';
import { logger } from '../utils/Logger';

export class GameLoop {
  private animationId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly timestep: number = 1000 / 60; // 60 FPS
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private renderer: Renderer | null = null;
  private physicsEngine: PhysicsEngine | null = null;
  private game: Game | null = null;
  
  // FPS tracking
  private fpsUpdateTime: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 60;
  private readonly FPS_UPDATE_INTERVAL: number = 1000; // Update FPS every second

  constructor() {
    logger.info('🔄 GameLoop initialized', null, 'GameLoop');
  }

  /**
   * Start the game loop
   */
  public start(
    gameState: GameState,
    renderer?: Renderer,
    physicsEngine?: PhysicsEngine,
    game?: Game,
  ): void {
    if (this.isRunning) {
      logger.warn('⚠️ Game loop is already running');
      return;
    }

    this.renderer = renderer || null;
    this.physicsEngine = physicsEngine || null;
    this.game = game || null;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;

    logger.info('▶️ Game loop started', null, 'GameLoop');
    this.gameLoop(gameState);
  }

  /**
   * Main game loop with fixed timestep
   */
  private gameLoop(gameState: GameState): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update FPS tracking
    this.updateFPSTracking(currentTime);

    // Apply power-up time scaling to the entire game loop
    let scaledDeltaTime = deltaTime;
    if (this.game && this.game.getPowerUpManager) {
      const powerUpEffects = this.game.getPowerUpManager().getPowerUpEffects();
      if (powerUpEffects.timeScale) {
        scaledDeltaTime = deltaTime * powerUpEffects.timeScale;
        console.log(`⏰ GameLoop: timeScale=${powerUpEffects.timeScale}, deltaTime=${deltaTime}ms -> ${scaledDeltaTime}ms`);
      }
    }

    // Accumulate time with scaling
    this.accumulator += scaledDeltaTime;

    // Update with fixed timestep
    while (this.accumulator >= this.timestep) {
      if (!this.isPaused) {
        this.update(gameState, this.timestep);
      }
      this.accumulator -= this.timestep;
    }

    // Render
    this.render(gameState);

    // Continue loop
    this.animationId = requestAnimationFrame(() => this.gameLoop(gameState));
  }

  /**
   * Update game logic
   */
  private update(_gameState: GameState, deltaTime: number): void {
    // Update game logic if available
    if (this.game && this.game.update) {
      this.game.update(deltaTime);
    }

    // Update physics if available
    if (this.physicsEngine) {
      this.physicsEngine.update(deltaTime);
    }
  }

  /**
   * Render the game
   */
  private render(gameState: GameState): void {
    if (!this.renderer) return;

    // Clear canvas
    this.renderer.clear();

    // Render game based on state
    if (gameState.isLoading()) {
      this.renderLoading(gameState);
    } else if (gameState.isPlaying()) {
      this.renderGameplay(gameState);
      this.renderAchievementNotification();
    } else if (gameState.isAttractMode()) {
      this.renderAttractMode(gameState);
    } else if (gameState.isState(GameStateType.SETTINGS)) {
      // Draw the appropriate background for the settings overlay
      const game = this.game;
      const ctx = this.renderer.getContext();
      if (!ctx || !game || typeof game['settingsMenu'] === 'undefined' || !game['settingsMenu']) return;
      // Use the public isFromPauseMenu getter
      if (game['settingsMenu'].isFromPauseMenu) {
        this.renderPaused();
      } else {
        this.renderMenu(gameState);
      }
      // Draw the settings menu overlay on top
      game['settingsMenu'].draw(ctx);
    } else if (gameState.isState(GameStateType.SAVE_LOAD)) {
      // Draw the appropriate background for the save/load overlay
      const game = this.game;
      const ctx = this.renderer.getContext();
      if (!ctx || !game || typeof game['saveLoadMenu'] === 'undefined' || !game['saveLoadMenu']) return;
      
      // Always draw menu background for save/load menu
      this.renderMenu(gameState);
      
      // Draw the save/load menu overlay on top
      game['saveLoadMenu'].render(ctx);
    } else if (gameState.isState(GameStateType.STATS)) {
      // Draw the appropriate background for the stats overlay
      const game = this.game;
      const ctx = this.renderer.getContext();
      if (!ctx || !game || typeof game['statsMenu'] === 'undefined' || !game['statsMenu']) return;
      
      // Always draw menu background for stats menu
      this.renderMenu(gameState);
      
      // Draw the stats menu overlay on top
      game['statsMenu'].render(ctx);
    } else if (gameState.isState(GameStateType.WIN_SCREEN)) {
      // Draw the win screen
      const game = this.game;
      const ctx = this.renderer.getContext();
      if (!ctx || !game || typeof game['winScreen'] === 'undefined' || !game['winScreen']) return;
      
      // Draw the gameplay background (blurred/dimmed)
      this.renderGameplay(gameState);
      
      // Draw the win screen overlay on top
      game['winScreen'].render(ctx);
    } else if (gameState.isState(GameStateType.MENU)) {
      this.renderMenu(gameState);
    } else if (gameState.isState(GameStateType.HOW_TO_PLAY)) {
      this.renderHowToPlay(gameState);
    } else if (gameState.isState(GameStateType.PAUSED)) {
      this.renderPaused();
    } else if (gameState.isState(GameStateType.CONFIRM_MENU)) {
      this.renderConfirmDialog(gameState);
    } else if (gameState.isState(GameStateType.GAME_OVER)) {
      this.renderGameOver(gameState);
    }
  }

  /**
   * Render gameplay
   */
  private renderGameplay(gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw background
    this.renderer.drawBackground();

    // Draw all physics objects except balls first
    if (this.physicsEngine) {
      for (const obj of this.physicsEngine.getObjects()) {
        // Skip balls - we'll draw them last
        if (obj.id === 'game-ball' || obj.id.includes('ball')) {
          continue;
        }

        // Render other objects as simple circles
        ctx.beginPath();
        const pos = obj.position || { x: obj.x || 0, y: obj.y || 0 };
        const radius = obj.radius || 10;
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

        // Different colors for different object types
        if (obj.isStatic) {
          ctx.fillStyle = '#ff0066'; // Red for static obstacles
          ctx.shadowColor = '#ff0066';
        } else {
          ctx.fillStyle = '#00ffff'; // Cyan for dynamic objects
          ctx.shadowColor = '#00ffff';
        }

        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();

        // Debug info for non-ball objects - only show if debug mode is enabled
        if (
          gameState.isDebugMode() &&
          this.physicsEngine.getDebug &&
          this.physicsEngine.getDebug()
        ) {
          // Draw velocity vectors for debugging
          if (!obj.isStatic && obj.velocity) {
            const velScale = 3; // Reduced scale for performance
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(
              pos.x + obj.velocity.x * velScale,
              pos.y + obj.velocity.y * velScale,
            );
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
          }

          // Draw minimal object info
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px Courier New';
          ctx.textAlign = 'center';
          ctx.fillText(obj.id, pos.x, pos.y - radius - 5);
        }
      }

      // Only draw debug info when debug mode is enabled
      if (
        gameState.isDebugMode() &&
        this.physicsEngine.getDebug &&
        this.physicsEngine.getDebug()
      ) {
        // Draw collision manifolds for debugging
        if (this.physicsEngine.getCollisionManifolds) {
          const manifolds = this.physicsEngine.getCollisionManifolds();
          for (const manifold of manifolds) {
            // Draw collision point
            ctx.beginPath();
            ctx.arc(
              manifold.contactPoint.x,
              manifold.contactPoint.y,
              2,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            ctx.closePath();
          }
        }

        // Draw constraints for debugging
        if (this.physicsEngine.getConstraints) {
          const constraints = this.physicsEngine.getConstraints();
          for (const constraint of constraints) {
            if (constraint.type === 'distance' && constraint.objectB) {
              // Draw distance constraint as a line
              ctx.beginPath();
              ctx.moveTo(
                constraint.objectA.position.x,
                constraint.objectA.position.y,
              );
              ctx.lineTo(
                constraint.objectB.position.x,
                constraint.objectB.position.y,
              );
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.closePath();
            }
          }
        }
      }
    }

    // Draw placeholder text - only in debug mode
    if (gameState.isDebugMode()) {
      ctx.fillStyle = '#00ffff';
      ctx.font = '20px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Circuit Breaker', 180, 40);
      ctx.font = '12px Courier New';
      ctx.fillText('Robust Physics System Active', 180, 60);
    }

    // Call game's render method for additional elements (holes, UI, etc.)
    if (this.game && this.game.renderGameplay) {
      this.game.renderGameplay();
    }

    // Draw balls LAST so they appear on top of everything
    if (this.physicsEngine) {
      for (const obj of this.physicsEngine.getObjects()) {
        // Only render balls
        if (obj.id === 'game-ball' || obj.id.includes('ball')) {
          if (this.renderer) {
            // Get animation state from game if available
            const animationState =
              this.game && this.game.getHoleAnimationState
                ? this.game.getHoleAnimationState() || undefined
                : undefined;
            
            // Check if ball is in saucer waiting state to determine sprite
            const spriteName = this.game && this.game.getBallSpriteForSaucerState
              ? this.game.getBallSpriteForSaucerState(obj.id)
              : 'ball_normal';
            
            this.renderer.drawChromeBall(obj, animationState, spriteName);
          }

          // Debug info for balls - only show if debug mode is enabled
          if (
            gameState.isDebugMode() &&
            this.physicsEngine.getDebug &&
            this.physicsEngine.getDebug()
          ) {
            const pos = obj.position || { x: obj.x || 0, y: obj.y || 0 };
            const radius = obj.radius || 10;

            // Draw velocity vectors for debugging
            if (!obj.isStatic && obj.velocity) {
              const velScale = 3; // Reduced scale for performance
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y);
              ctx.lineTo(
                pos.x + obj.velocity.x * velScale,
                pos.y + obj.velocity.y * velScale,
              );
              ctx.strokeStyle = '#ffff00';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.closePath();
            }

            // Draw minimal object info
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(obj.id, pos.x, pos.y - radius - 5);
          }
        }
      }
    }

    // Enhanced debug info - only show if debug mode is enabled
    if (gameState.isDebugMode() && this.physicsEngine) {
      const objects = this.physicsEngine.getObjects();
      const dynamicObjects = objects.filter(obj => !obj.isStatic).length;
      const staticObjects = objects.filter(obj => obj.isStatic).length;

      ctx.font = '10px Courier New';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00ffff';
      ctx.fillText(
        `Objects: ${dynamicObjects} dynamic, ${staticObjects} static`,
        10,
        610,
      );
      ctx.fillText(`Gravity: ${this.physicsEngine.getGravity()}`, 10, 625);

      // Show collision count
      if (this.physicsEngine.getCollisionManifolds) {
        const collisionCount =
          this.physicsEngine.getCollisionManifolds().length;
        ctx.fillText(`Collisions: ${collisionCount}`, 200, 610);
      }

      // Show physics performance info
      ctx.fillText('Physics: Optimized Verlet (1 substep)', 10, 595);
    }
  }

  /**
   * Render loading screen
   */
  private renderLoading(_gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw background
    this.renderer.drawBackground();

    // Get loading progress from game instance
    const loadingProgress =
      this.game && this.game.getLoadingProgress
        ? this.game.getLoadingProgress()
        : 0;
    const loadingStatus =
      this.game && this.game.getLoadingStatus
        ? this.game.getLoadingStatus()
        : 'Initializing...';
    const isLoadingComplete =
      this.game && this.game.isLoadingComplete
        ? this.game.isLoadingComplete()
        : false;

    // Draw main title with animated neon glow and pulsing stroke
    ctx.save();
    ctx.shadowColor = '#00f0ff'; // Electric Blue
    ctx.shadowBlur = 20;
    
    // Create pulsing stroke effect
    const loadingTitleTime = Date.now();
    const titlePulseIntensity = 0.5 + 0.5 * Math.sin(loadingTitleTime / 1000);
    ctx.strokeStyle = `rgba(0, 240, 255, ${titlePulseIntensity})`; // Pulsing Electric Blue
    ctx.lineWidth = 3;
    fontManager.setFont(ctx, 'display', 72, 'bold');
    ctx.textAlign = 'center';
    
    // Draw stroke outline first
    ctx.strokeText('CIRCUIT', 180, 120);
    ctx.strokeText('BREAKER', 180, 180);
    
    // Draw fill text on top
    ctx.fillStyle = '#b600f9'; // Neon Purple
    ctx.fillText('CIRCUIT', 180, 120);
    ctx.fillText('BREAKER', 180, 180);
    ctx.restore();

    // Draw loading text with pulse effect
    const time = Date.now();
    const pulseAlpha = 0.6 + 0.4 * Math.sin(time / 600);
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#00f0ff'; // Electric Blue
    fontManager.setFont(ctx, 'primary', 18, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', 180, 260);
    ctx.restore();

    // Draw progress bar background
    const barWidth = 300;
    const barHeight = 20;
    const barX = (360 - barWidth) / 2;
    const barY = 300;

    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw progress bar border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Draw progress bar fill
    const progressWidth = (loadingProgress / 100) * (barWidth - 4);
    if (progressWidth > 0) {
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(barX + 2, barY + 2, progressWidth, barHeight - 4);
    }

    // Draw progress percentage
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 14);
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(loadingProgress)}%`, 180, 345);

    // Draw loading status with different styling when complete
    if (isLoadingComplete) {
      // Pulsing "Press any key" message when complete
      const pulseAlpha = 0.6 + 0.4 * Math.sin(time / 400);
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      ctx.shadowColor = '#00ff99'; // Acid Green
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00ff99'; // Acid Green
      fontManager.setFont(ctx, 'primary', 14, 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(loadingStatus, 180, 370);
      ctx.restore();
    } else {
      // Normal status text while loading
      ctx.fillStyle = '#888888';
      fontManager.setFont(ctx, 'primary', 12);
      ctx.textAlign = 'center';
      ctx.fillText(loadingStatus, 180, 370);

      // Draw spinning loading indicator only while loading
      const spinnerSize = 30;
      const spinnerX = 180;
      const spinnerY = 400;
      const rotation = (time / 100) % (Math.PI * 2);

      ctx.save();
      ctx.translate(spinnerX, spinnerY);
      ctx.rotate(rotation);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, spinnerSize / 2, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    // Draw version info
    ctx.fillStyle = '#444444';
    fontManager.setFont(ctx, 'primary', 8);
    ctx.fillText('Circuit Breaker v0.6.0', 180, 590);
    ctx.fillText('Chris Van Doren - July 2025', 180, 605);
  }

  /**
   * Render attract mode
   */
  private renderAttractMode(gameState: GameState): void {
    if (!this.renderer) return;

    // Render the gameplay (same as playing state)
    this.renderGameplay(gameState);

    // Add attract mode overlay
    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw semi-transparent overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, 360, 640);

    // Draw main title with audio-reactive pulsing stroke effect
    ctx.save();
    ctx.shadowColor = '#00f0ff'; // Electric Blue
    ctx.shadowBlur = 20;
    
    // Create dramatically audio-reactive pulsing stroke effect
    // const titleTime = Date.now(); // removed unused
    let pulseIntensity = 0.1; // Minimal base pulse
    
    // Add dramatic audio reactivity if music is playing
    if (this.game && this.game.getAudioLevel) {
      const audioLevel = this.game.getAudioLevel();
      const audioReactivity = audioLevel * 8.0; // Extremely dramatic reactivity
      pulseIntensity = Math.min(1.0, pulseIntensity + audioReactivity); // Audio completely dominates
    }
    
    // Keep Electric Blue color, only change opacity and width
    ctx.strokeStyle = `rgba(0, 240, 255, ${pulseIntensity})`; // Audio-reactive Electric Blue opacity
    // Ramp stroke width: 0px up to 0.40 audio level, then ramp to 12px
    let strokeWidth = 0;
    if (pulseIntensity > 0.40) {
      const rampProgress = (pulseIntensity - 0.40) / (1.0 - 0.25); // 0 to 1 over the ramp range
      strokeWidth = rampProgress * 12; // Ramp from 0 to 12px
    }
    ctx.lineWidth = strokeWidth;
    fontManager.setFont(ctx, 'display', 48, 'bold'); // Smaller size for attract mode
    ctx.textAlign = 'center';
    
    // Draw stroke outline first
    ctx.strokeText('CIRCUIT', 180, 60);
    ctx.strokeText('BREAKER', 180, 100);
    
    // Draw fill text on top
    ctx.fillStyle = '#b600f9'; // Neon Purple
    ctx.fillText('CIRCUIT', 180, 60);
    ctx.fillText('BREAKER', 180, 100);
    ctx.restore();

    // Draw demo text
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 14);
    ctx.textAlign = 'center';
    ctx.fillText('CIRCUIT BREAKER DEMO', 180, 120);
    ctx.fillText('Press any key to return to menu', 180, 140);

    // Draw controls reminder
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('A/Z - Left Side Up/Down', 180, 580);
    ctx.fillText('↑/↓ - Right Side Up/Down', 180, 595);
    ctx.fillText('SPACE - Start/Place Ball', 180, 610);
    ctx.fillText('D - Toggle Debug Mode', 180, 625);

    ctx.restore();
  }

  /**
   * Render menu
   */
  private renderMenu(gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw background
    this.renderer.drawBackground();

    // Draw subtle grid pattern
    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let x = 0; x <= 360; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= 640; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(360, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw main title with animated neon glow and pulsing stroke
    ctx.save();
    ctx.shadowColor = '#00f0ff'; // Electric Blue
    ctx.shadowBlur = 20;
    
    // Create dramatically audio-reactive pulsing stroke effect
    const titleTime = Date.now();
    let pulseIntensity = 0.1; // Minimal base pulse
    
    // Add dramatic audio reactivity if music is playing
    if (this.game && this.game.getAudioLevel) {
      const audioLevel = this.game.getAudioLevel();
      const audioReactivity = audioLevel * 8.0; // Extremely dramatic reactivity
      pulseIntensity = Math.min(1.0, pulseIntensity + audioReactivity); // Audio completely dominates
      
      // Debug: Log audio levels to see if they're changing
      if (titleTime % 1000 < 16) { // Log once per second (60fps = ~16ms per frame)
        console.log(`🎵 Audio Level: ${audioLevel.toFixed(3)}, Pulse: ${pulseIntensity.toFixed(3)}`);
      }
    }
    
    // Keep Electric Blue color, only change opacity and width
    ctx.strokeStyle = `rgba(0, 240, 255, ${pulseIntensity})`; // Audio-reactive Electric Blue opacity
    // Ramp stroke width: 0px up to 0.25 audio level, then ramp to 12px
    let strokeWidth = 0;
    if (pulseIntensity > 0.40) {
      const rampProgress = (pulseIntensity - 0.40) / (1.0 - 0.25); // 0 to 1 over the ramp range
      strokeWidth = rampProgress * 12; // Ramp from 0 to 12px
    }
    ctx.lineWidth = strokeWidth;
    fontManager.setFont(ctx, 'display', 72, 'bold');
    ctx.textAlign = 'center';
    
    // Draw stroke outline first
    ctx.strokeText('CIRCUIT', 180, 120);
    ctx.strokeText('BREAKER', 180, 180);
    
    // Draw fill text on top
    ctx.fillStyle = '#b600f9'; // Neon Purple
    ctx.fillText('CIRCUIT', 180, 120);
    ctx.fillText('BREAKER', 180, 180);
    ctx.restore();

    // Draw subtitle with neon stroke outline
    ctx.save();
    ctx.strokeStyle = '#00f0ff'; // Electric Blue
    ctx.lineWidth = 2;
    fontManager.setFont(ctx, 'primary', 16);
    ctx.textAlign = 'center';
    
    // Draw stroke outline first
    ctx.strokeText('NEON CYBERPUNK PINBALL', 180, 280);
    
    // Draw fill text on top
    ctx.fillStyle = '#b600f9'; // Neon Purple
    ctx.fillText('NEON CYBERPUNK PINBALL', 180, 280);
    ctx.restore();

    // Draw description
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 12);
    ctx.fillText('Navigate the ball through cyber holes', 180, 320);
    ctx.fillText('to reach all goals and break the circuit', 180, 340);

    // Draw start instruction with pulse effect
    const time = Date.now();
    const pulseAlpha = 0.5 + 0.5 * Math.sin(time / 500);
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.shadowColor = '#00ff99'; // Acid Green
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff99'; // Acid Green
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('CLICK OR PRESS SPACE TO START', 180, 420);
    ctx.restore();

    // Draw bright "How to Play" button
    ctx.save();
    const buttonPulse = 0.7 + 0.3 * Math.sin(time / 300); // Faster pulse for attention
    ctx.globalAlpha = buttonPulse;
    ctx.shadowColor = '#ff6600'; // Orange glow
    ctx.shadowBlur = 15;
    
    // Draw button background
    const buttonWidth = 180;
    const buttonHeight = 40;
    const buttonX = 180 - buttonWidth / 2;
    const buttonY = 460;
    
    ctx.fillStyle = '#ff6600'; // Bright Orange
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button border
    ctx.strokeStyle = '#ffaa33';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button text
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 16, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', 180, buttonY + 26);
    ctx.restore();
    
    // Draw hint text
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('Press H or click button above', 180, 520);

    // Draw menu shortcuts
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('S - Settings  •  L - Save/Load  •  T - Statistics', 180, 550);

    // Draw debug mode status at bottom
    const debugStatus = gameState.isDebugMode() ? 'ON' : 'OFF';
    const debugColor = gameState.isDebugMode() ? '#00ff99' : '#b600f9'; // Acid Green or Neon Purple
    ctx.fillStyle = debugColor;
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText(`[D] DEBUG MODE: ${debugStatus}`, 180, 580);

    // Draw version info
    ctx.fillStyle = '#444444';
    fontManager.setFont(ctx, 'primary', 8);
    ctx.fillText('Circuit Breaker v1.0.1', 180, 615);
    ctx.fillText('Created by Chris Van Doren in July of 2025', 180, 630);
  }

  /**
   * Render how to play screen
   */
  private renderHowToPlay(gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw background
    this.renderer.drawBackground();

    // Draw subtle grid pattern
    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let x = 0; x <= 360; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= 640; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(360, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw title
    ctx.save();
    ctx.shadowColor = '#00f0ff'; // Electric Blue
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#b600f9'; // Neon Purple
    fontManager.setFont(ctx, 'display', 48, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', 180, 80);
    ctx.restore();

    // Draw game objective
    ctx.fillStyle = '#00f0ff'; // Electric Blue
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('OBJECTIVE:', 180, 120);
    
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 11);
    ctx.fillText('Navigate the ball through cyber holes to reach', 180, 140);
    ctx.fillText('ALL goal holes and complete each level.', 180, 155);
    ctx.fillText('Avoid falling off the playfield!', 180, 170);

    // Draw power-ups section
    ctx.fillStyle = '#00ff99'; // Acid Green
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('POWER-UPS & BONUSES:', 180, 200);
    
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('• SAUCERS: Ball sinks in, gets power-up, then ejects', 180, 220);
    ctx.fillText('• SLOW-MO SURGE: Slows down time for precision', 180, 235);
    ctx.fillText('• MAGNETIC GUIDE: Attracts ball toward goals', 180, 250);
    ctx.fillText('• CIRCUIT PATCH: Repairs bar damage & extends life', 180, 265);
    ctx.fillText('• OVERCLOCK BOOST: Increases bar movement speed', 180, 280);
    ctx.fillText('• SCAN REVEAL: Shows hidden animated holes', 180, 295);

    // Draw controls section
    ctx.fillStyle = '#ff6600'; // Orange
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('CONTROLS:', 180, 325);
    
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('KEYBOARD:', 180, 345);
    ctx.fillText('• A/Z - Left Side Up/Down', 180, 360);
    ctx.fillText('• ↑/↓ or L/, - Right Side Up/Down', 180, 375);
    ctx.fillText('• SPACE - Start/Place Ball', 180, 390);
    
    ctx.fillText('TOUCH CONTROLS (Mobile):', 180, 410);
    ctx.fillText('• Touch above/below bar sides to move up/down', 180, 425);
    ctx.fillText('• Left side of screen controls left bar end', 180, 440);
    ctx.fillText('• Right side of screen controls right bar end', 180, 455);
    
    ctx.fillText('MENUS:', 180, 475);
    ctx.fillText('• S - Settings  • L - Save/Load  • T - Statistics', 180, 490);

    // Draw back instruction with pulse effect
    const time = Date.now();
    const pulseAlpha = 0.5 + 0.5 * Math.sin(time / 500);
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.shadowColor = '#00ff99'; // Acid Green
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff99'; // Acid Green
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('PRESS ESC OR BACKSPACE TO RETURN', 180, 540);
    ctx.restore();

    // Draw debug mode status at bottom
    const debugStatus = gameState.isDebugMode() ? 'ON' : 'OFF';
    const debugColor = gameState.isDebugMode() ? '#00ff99' : '#b600f9'; // Acid Green or Neon Purple
    ctx.fillStyle = debugColor;
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText(`[D] DEBUG MODE: ${debugStatus}`, 180, 580);

    // Draw version info
    ctx.fillStyle = '#444444';
    fontManager.setFont(ctx, 'primary', 8);
    ctx.fillText('Circuit Breaker v1.0.1', 180, 615);
    ctx.fillText('Created by Chris Van Doren in July of 2025', 180, 630);
  }

  /**
   * Render paused state
   */
  private renderPaused(): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw paused overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 360, 640);

    // Draw paused title
    ctx.fillStyle = '#00f0ff'; // Electric Blue
    fontManager.setFont(ctx, 'display', 24, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 180, 280);

    // Draw instructions
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 14);
    ctx.fillText('Press ESC to resume', 180, 320);
    ctx.fillText('Press S for Settings', 180, 340);
    ctx.fillText('Press Y to return to menu', 180, 360);
  }

  /**
   * Render confirmation dialog
   */
  private renderConfirmDialog(gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // First render the current gameplay in the background (dimmed)
    this.renderGameplay(gameState);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 360, 640);

    // Draw dialog box background
    const dialogWidth = 280;
    const dialogHeight = 160;
    const dialogX = (360 - dialogWidth) / 2;
    const dialogY = (640 - dialogHeight) / 2;

    // Draw dialog background with neon border
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);

    ctx.strokeStyle = '#b600f9'; // Neon Purple border
    ctx.lineWidth = 3;
    ctx.shadowColor = '#b600f9';
    ctx.shadowBlur = 10;
    ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
    ctx.shadowBlur = 0;

    // Draw dialog title
    ctx.fillStyle = '#b600f9'; // Neon Purple
    fontManager.setFont(ctx, 'primary', 18, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('RETURN TO MENU?', 180, dialogY + 40);

    // Draw confirmation message
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 12);
    ctx.fillText('Your progress will be lost.', 180, dialogY + 70);
    ctx.fillText('Are you sure?', 180, dialogY + 90);

    // Draw buttons with glow effects
    const buttonY = dialogY + 120;

    // YES button (Electric Blue)
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    fontManager.setFont(ctx, 'primary', 14, 'bold');
    ctx.fillText('[Y] YES', 130, buttonY);

    // NO button (Acid Green)
    ctx.fillStyle = '#00ff99';
    ctx.shadowColor = '#00ff99';
    ctx.shadowBlur = 8;
    ctx.fillText('[N] NO', 230, buttonY);

    ctx.shadowBlur = 0;

    // Draw instruction text
    ctx.fillStyle = '#888888';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('Press Y to confirm, N or ESC to cancel', 180, dialogY + 145);
  }

  /**
   * Render achievement notification overlay
   */
  private renderAchievementNotification(): void {
    const game = this.game;
    const ctx = this.renderer?.getContext();
    if (!ctx || !game || typeof game['achievementNotification'] === 'undefined' || !game['achievementNotification']) return;
    
    game['achievementNotification'].render(ctx);
  }

  /**
   * Render game over state
   */
  private renderGameOver(gameState: GameState): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Draw dark background
    this.renderer.drawBackground();

    // Draw red alert grid
    ctx.strokeStyle = '#330000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let x = 0; x <= 360; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= 640; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(360, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw GAME OVER with red glow
    ctx.save();
    ctx.shadowColor = '#b600f9'; // Neon Purple
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#b600f9'; // Neon Purple
    fontManager.setFont(ctx, 'display', 28, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 180, 200);
    ctx.restore();

    // Draw circuit broken subtitle
    ctx.fillStyle = '#ff6666';
    fontManager.setFont(ctx, 'primary', 14);
    ctx.textAlign = 'center';
    ctx.fillText('CIRCUIT BREAKER MALFUNCTION', 180, 230);

    // Get and display score
    const stateData = gameState.getStateData();
    ctx.fillStyle = '#ffffff';
    fontManager.setFont(ctx, 'primary', 16);
    ctx.fillText(`FINAL SCORE: ${stateData.score}`, 180, 280);
    ctx.fillText(`LEVEL REACHED: ${stateData.currentLevel}`, 180, 310);

    // Draw restart instruction with pulse effect
    const time = Date.now();
    const pulseAlpha = 0.5 + 0.5 * Math.sin(time / 400);
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.shadowColor = '#00ff99'; // Acid Green
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff99'; // Acid Green
    fontManager.setFont(ctx, 'primary', 12, 'bold');
    ctx.fillText('CLICK OR PRESS SPACE TO RETURN TO MENU', 180, 400);
    ctx.restore();

    // Draw system message
    ctx.fillStyle = '#666666';
    fontManager.setFont(ctx, 'primary', 10);
    ctx.fillText('SYSTEM: Preparing for circuit restart...', 180, 480);
  }

  /**
   * Pause the game loop
   */
  public pause(): void {
    this.isPaused = true;
    logger.info('⏸️ Game loop paused', null, 'GameLoop');
  }

  /**
   * Resume the game loop
   */
  public resume(): void {
    this.isPaused = false;
    logger.info('▶️ Game loop resumed', null, 'GameLoop');
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    logger.info('⏹️ Game loop stopped', null, 'GameLoop');
  }

  /**
   * Check if game loop is running
   */
  public isGameLoopRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if game loop is paused
   */
  public isGameLoopPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Update FPS tracking
   */
  private updateFPSTracking(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= this.FPS_UPDATE_INTERVAL) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      
      // Record FPS event if game is available
      if (this.game && this.game['statsManager']) {
        this.game['statsManager'].recordEvent({
          type: 'fps_update',
          timestamp: Date.now(),
          data: { fps: this.currentFPS },
        });
      }
    }
  }

  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.currentFPS;
  }
}

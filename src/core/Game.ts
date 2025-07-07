// Circuit Breaker - Main Game Class
// Handles game state management and core game loop

import { GameState, GameStateType } from './GameState';
import { GameLoop } from './GameLoop';
import { Renderer } from '../rendering/Renderer';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { TiltingBar } from './TiltingBar';
import { InputManager } from '../input/InputManager';
import { LevelManager, Level, Hole } from './Level';
import { AudioManager } from '../audio/AudioManager';
import { fontManager } from '../utils/FontManager';
import { logger } from '../utils/Logger';
import { SettingsMenu } from '../ui/SettingsMenu';
import { SaveLoadMenu } from '../ui/SaveLoadMenu';
import { AchievementNotification } from '../ui/AchievementNotification';
import { StatsMenu } from '../ui/StatsMenu';
import { StorageManager, GameProgress } from './StorageManager';
import { AchievementManager } from './AchievementManager';
import { StatsManager } from './StatsManager';
import { PowerUpManager, PowerUpType } from './PowerUpManager';


export class Game {
  private gameState: GameState;
  private gameLoop: GameLoop;
  private renderer: Renderer;
  private physicsEngine: PhysicsEngine;
  private inputManager: InputManager;
  private tiltingBar: TiltingBar;
  private levelManager: LevelManager;
  private audioManager: AudioManager;
  private settingsMenu: SettingsMenu;
  private saveLoadMenu: SaveLoadMenu;
  private achievementNotification: AchievementNotification;
  private statsMenu: StatsMenu;
  private storageManager: StorageManager;
  private achievementManager: AchievementManager;
  private statsManager: StatsManager;
  private powerUpManager: PowerUpManager;
  private currentLevel: Level | null = null;
  private isRunning: boolean = false;
  private levelCompletionHandled: boolean = false;

  // Hole animation state
  private isAnimatingHoleFall: boolean = false;
  private holeAnimationState: {
    ballId: string;
    holePosition: { x: number; y: number };
    startTime: number;
    duration: number;
    startPosition: { x: number; y: number };
    scale: number;
    opacity: number;
    isGoalHole: boolean; // Track if this is a goal hole animation
    isPowerUpHole: boolean; // Track if this is a power-up hole animation
  } | null = null;

  // Attract mode properties
  private menuTimer: number = 0;
  private readonly attractModeDelay: number = 10000; // 10 seconds in milliseconds
  private attractModeTimer: number = 0;
  // private attractModeAutoPlayInterval: number = 0; // TODO: Implement attract mode auto-play

  // Loading properties
  private loadingProgress: number = 0;
  private loadingStatus: string = 'Initializing...';
  private assetsToLoad: string[] = [];
  private loadedAssets: number = 0;
  private loadingComplete: boolean = false;

  // Game progress tracking
  private gameProgress!: GameProgress; // Will be initialized in loadGameProgress()
  private currentSaveSlot: number = 0;
  private sessionStartTime: number = 0;
  private lastAutoSave: number = 0;

  constructor() {
    this.gameState = new GameState();
    this.gameLoop = new GameLoop();
    this.renderer = new Renderer();
    this.physicsEngine = new PhysicsEngine();
    this.inputManager = new InputManager();
    this.levelManager = new LevelManager();
    this.audioManager = new AudioManager();
    this.storageManager = new StorageManager();
    this.achievementManager = new AchievementManager();
    this.statsManager = new StatsManager();
    this.powerUpManager = new PowerUpManager();
    this.settingsMenu = new SettingsMenu({
      audioManager: this.audioManager,
      onClose: () => this.closeSettings(),
      onBackToMenu: () => this.backToMenuFromSettings(),
    });
    this.saveLoadMenu = new SaveLoadMenu({
      onClose: () => this.closeSaveLoadMenu(),
      onLoadGame: (slotId: number) => this.loadGameFromSlot(slotId),
      onNewGame: (slotId: number) => this.startNewGameInSlot(slotId),
      onDeleteSlot: (slotId: number) => this.deleteSaveSlot(slotId),
      getSaveSlots: () => this.storageManager.getSaveSlots(),
      getCurrentProgress: () => this.gameProgress,
      getAchievements: () => this.achievementManager.getAllAchievements(),
    });
    this.achievementNotification = new AchievementNotification({
      onComplete: () => {
        // Achievement notification completed
        logger.debug('🏆 Achievement notification completed', null, 'Game');
      },
    });
    this.statsMenu = new StatsMenu({
      onClose: () => this.closeStatsMenu(),
      statsManager: this.statsManager,
    });
    this.tiltingBar = new TiltingBar({
      position: { x: 180, y: 590 }, // Center of 360px width screen, near bottom
      width: 360, // Full width of screen
      height: 8,
      maxRotation: Math.PI / 4, // 45 degrees
      rotationSpeed: 3,
      friction: 0.05, // Low friction for smooth rolling
    });
    logger.info('🎮 Circuit Breaker - Game initialized', null, 'Game');
  }

  /**
   * Initialize the game, set up all systems, and prepare for gameplay.
   */
  public async init(): Promise<void> {
    try {
      logger.info('🎮 Initializing Circuit Breaker...', null, 'Game');

      // Initialize renderer with canvas
      const canvas = document.getElementById(
        'game-canvas',
      ) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas element not found');
      }
      this.renderer.init(canvas);
      
      // Load sprites and atlas
      logger.info('🎨 Loading sprite atlas...', null, 'Game');
      await this.renderer.loadSprites();
      logger.info('✅ Sprite atlas loading completed', null, 'Game');

      // Preload custom fonts
      await fontManager.preloadFonts();

      // Initialize physics engine with realistic pinball settings
      this.physicsEngine.setGravity(0, 520); // Stronger gravity for heavier pinball
      this.physicsEngine.setAirResistance(0.999); // Minimal air resistance
      this.physicsEngine.setBounds(360, 640); // Match canvas size
      this.physicsEngine.setTiltingBar(this.tiltingBar);

      // Set up physics audio callback for collision sounds
      this.physicsEngine.setAudioCallback((velocity: number, type: string) => {
        // Only play collision sounds when actually playing the game
        if (this.gameState.isPlaying() && type === 'bounce') {
          this.audioManager.playBounceSound(velocity);
        }
      });

      // Override physics engine's ball held check to include saucer state
      const originalIsBallHeld = this.physicsEngine.isBallHeld.bind(this.physicsEngine);
      this.physicsEngine.isBallHeld = (ballId: string) => {
        // Check if ball is in a saucer
        if (this.currentLevel && this.currentLevel.isBallInSaucer(ballId)) {
          return true;
        }
        return originalIsBallHeld(ballId);
      };

      // Override physics engine's held ball target to get saucer position
      const originalGetHeldBallTarget = this.physicsEngine.getHeldBallTarget.bind(this.physicsEngine);
      this.physicsEngine.getHeldBallTarget = (ballId: string) => {
        // Get saucer position for held ball
        if (this.currentLevel) {
          // Find which hole has this ball in saucer mode
          const levelData = this.currentLevel.getLevelData();
          for (const hole of levelData.holes) {
            if (hole.saucerState?.isActive && hole.saucerState.ballId === ballId) {
              return this.currentLevel.getSaucerBallPosition(hole.id);
            }
          }
        }
        return originalGetHeldBallTarget(ballId);
      };

      // Initialize input manager
      this.inputManager.init(canvas);

      // Initialize audio system
      await this.audioManager.init();

      // Load game progress
      this.loadGameProgress();

      // Set up achievement callback
      this.achievementManager.setAchievementCallback((achievement) => {
        logger.info(`🏆 Achievement unlocked: ${achievement.name}`, null, 'Game');
        this.achievementNotification.show(achievement);
      });

      // Create main game ball starting off the left side of playfield
      // Real pinball specifications: 1 1/16" diameter (27mm), ~80-100g weight
      const ballRadius = 14; // Slightly larger for more substantial feel
      const ballStartX = -50; // Off the left side (hidden)
      const ballStartY = 300; // Middle height (will be repositioned when started)

      // Get ball physics properties from power-up manager
      const ballPhysics = this.powerUpManager.getBallPhysicsProperties();
      
      // Create main game ball with realistic pinball physics
      const ball = this.physicsEngine.createObject({
        id: 'game-ball',
        x: ballStartX,
        y: ballStartY,
        radius: ballRadius,
        mass: ballPhysics.mass,
        restitution: ballPhysics.restitution,
        friction: ballPhysics.friction,
        isStatic: false,
      });

      this.physicsEngine.addObject(ball);

      // Sync physics engine debug mode with game state debug mode
      this.physicsEngine.setDebug(this.gameState.isDebugMode());

      // Initialize power-ups for the run
      this.powerUpManager.initializeRun();
      
          // Load the first level
    this.currentLevel = this.levelManager.loadLevel(1);
    if (this.currentLevel) {
      this.currentLevel.start();
      this.levelCompletionHandled = false; // Initialize completion flag
      
      logger.info('🎯 Level 1 loaded and started', null, 'Game');
    }

      this.isRunning = true;
      
      // Record session start
      this.statsManager.recordEvent({
        type: 'session_start',
        timestamp: Date.now(),
      });
      
      logger.info('✅ Circuit Breaker initialized successfully', null, 'Game');
    } catch (error) {
      logger.error('❌ Failed to initialize Circuit Breaker:', error, 'Game');
      throw error;
    }
  }

  /**
   * Start the main game loop.
   */
  public start(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ Game not initialized. Call init() first.', null, 'Game');
      return;
    }

    logger.info('▶️ Starting Circuit Breaker...', null, 'Game');
    this.gameState.setState(GameStateType.LOADING);
    this.gameLoop.start(
      this.gameState,
      this.renderer,
      this.physicsEngine,
      this,
    );

    // Start asset loading process
    this.startAssetLoading();
  }

  /**
   * Update the game state and handle input, called every frame.
   * @param deltaTime Time elapsed since last frame (ms)
   */
  public update(deltaTime: number): void {
    // Update input
    this.inputManager.update();

    // Handle loading input - transition to menu when user interacts
    if (this.gameState.isLoading()) {
      if (this.loadingComplete && this.hasAnyInput()) {
        logger.debug('🎮 User interaction detected - transitioning to menu', null, 'Game');
        this.completeLoading();
      }
      // Don't process other input during loading
      this.inputManager.endFrame();
      return;
    }

    // Handle menu input - start new game when clicking or pressing space
    if (this.gameState.isState(GameStateType.MENU)) {
      // Check for any user interaction to reset menu timer
      if (this.hasAnyInput()) {
        this.menuTimer = 0;
      }

      if (
        this.inputManager.isActionJustPressed('start') ||
        this.inputManager.isMouseJustPressed()
      ) {
        logger.info('🎮 Starting new game...', null, 'Game');
        this.startNewGame();
        this.menuTimer = 0; // Reset timer

        // Resume audio context on user interaction (required by browsers)
        this.audioManager.resumeContext();

        // Play UI click sound
        this.audioManager.playSound('ui_click');
      }

      // Handle debug mode toggle
      if (this.inputManager.isKeyJustPressed('KeyD')) {
        this.gameState.toggleDebugMode();
        this.menuTimer = 0; // Reset timer

        // Update physics engine debug mode to match
        this.physicsEngine.setDebug(this.gameState.isDebugMode());

        // Play UI click sound
        this.audioManager.playSound('ui_click');
      }

      // Handle settings key (S key)
      if (this.inputManager.isKeyJustPressed('KeyS')) {
        logger.info('⚙️ Opening settings menu...', null, 'Game');
        this.openSettings();
        this.menuTimer = 0; // Reset timer
      }

      // Handle save/load key (L key)
      if (this.inputManager.isKeyJustPressed('KeyL')) {
        logger.info('💾 Opening save/load menu...', null, 'Game');
        this.openSaveLoadMenu();
        this.menuTimer = 0; // Reset timer
      }

      // Handle stats key (T key)
      if (this.inputManager.isKeyJustPressed('KeyT')) {
        logger.info('📊 Opening stats menu...', null, 'Game');
        this.openStatsMenu();
        this.menuTimer = 0; // Reset timer
      }

      // Update menu timer and check for attract mode
      this.menuTimer += deltaTime;
      if (this.menuTimer >= this.attractModeDelay) {
        logger.debug('🎬 Starting attract mode...', null, 'Game');
        this.startAttractMode();
      }
    }

    // Handle attract mode input
    if (this.gameState.isAttractMode()) {
      // Exit attract mode on any key press
      if (this.hasAnyInput()) {
        logger.debug('🏠 Exiting attract mode - returning to menu...', null, 'Game');
        this.exitAttractMode();
      }

      // Update attract mode auto-play
      this.updateAttractMode(deltaTime);
    }

    // Handle game over input - return to menu when clicking or pressing space
    if (this.gameState.isState(GameStateType.GAME_OVER)) {
      if (
        this.inputManager.isActionJustPressed('start') ||
        this.inputManager.isMouseJustPressed()
      ) {
        logger.info('🏠 Returning to menu...', null, 'Game');
        this.gameState.reset();

        // Play UI click sound
        this.audioManager.playSound('ui_click');

        // Return to menu music
        this.playMenuMusic();
      }
    }

    // Handle paused state input
    if (this.gameState.isPaused()) {
      // Handle escape key to resume
      if (this.inputManager.isActionJustPressed('pause')) {
        logger.info('▶️ Resuming game...', null, 'Game');
        this.gameState.setState(GameStateType.PLAYING);
        this.audioManager.playSound('ui_click');
      }
      // Handle settings key
      else if (this.inputManager.isKeyJustPressed('KeyS')) {
        logger.info('⚙️ Opening settings from pause menu...', null, 'Game');
        this.openSettings();
      }
      // Handle Y key to return to menu
      else if (this.inputManager.isKeyJustPressed('KeyY')) {
        logger.info('🏠 Returning to menu from pause...', null, 'Game');
        this.gameState.reset();
        this.audioManager.playSound('ui_click');
        this.playMenuMusic();
      }
    }

    // Handle settings menu input
    if (this.gameState.isSettings()) {
      // Handle settings menu pointer events
      const mousePos = this.inputManager.getMousePosition();
      if (mousePos) {
        this.settingsMenu.handlePointerMove(mousePos.x, mousePos.y);
        
        if (this.inputManager.isMouseJustPressed()) {
          this.settingsMenu.handlePointerDown(mousePos.x, mousePos.y);
        }
        
        if (this.inputManager.isMouseJustReleased()) {
          this.settingsMenu.handlePointerUp(mousePos.x, mousePos.y);
        }
      }

      // Handle escape key to close settings
      if (this.inputManager.isActionJustPressed('pause')) {
        logger.info('⚙️ Closing settings menu...', null, 'Game');
        this.closeSettings();
      }
    }

    // Handle save/load menu input
    if (this.gameState.isSaveLoad()) {
      // Update save/load menu
      this.saveLoadMenu.update(deltaTime);
      
      // Handle save/load menu pointer events
      const mousePos = this.inputManager.getMousePosition();
      if (mousePos) {
        this.saveLoadMenu.handlePointerMove(mousePos.x, mousePos.y);
        
        if (this.inputManager.isMouseJustPressed()) {
          this.saveLoadMenu.handlePointerDown(mousePos.x, mousePos.y);
        }
        
        if (this.inputManager.isMouseJustReleased()) {
          this.saveLoadMenu.handlePointerUp(mousePos.x, mousePos.y);
        }
      }

      // Handle keyboard input for save/load menu
      const keys = this.inputManager.getJustPressedKeys();
      for (const key of keys) {
        if (this.saveLoadMenu.handleKeyPress(key)) {
          break; // Menu handled the key
        }
      }

      // Handle escape key to close save/load menu
      if (this.inputManager.isActionJustPressed('pause')) {
        logger.info('💾 Closing save/load menu...', null, 'Game');
        this.closeSaveLoadMenu();
      }
    }

    // Handle stats menu input
    if (this.gameState.isStats()) {
      // Handle keyboard input for stats menu
      const keys = this.inputManager.getJustPressedKeys();
      for (const key of keys) {
        this.statsMenu.handleInput(key);
      }

      // Handle escape key to close stats menu
      if (this.inputManager.isActionJustPressed('pause')) {
        logger.info('📊 Closing stats menu...', null, 'Game');
        this.closeStatsMenu();
      }
    }

    // Handle confirmation dialog input
    if (this.gameState.isConfirmingMenu()) {
      // Y key or Enter - confirm return to menu
      if (
        this.inputManager.isKeyJustPressed('KeyY') ||
        this.inputManager.isKeyJustPressed('Enter')
      ) {
        logger.info('✅ Confirmed - returning to menu', null, 'Game');
        this.gameState.reset();
        this.audioManager.playSound('ui_click');
      }
      // N key or Escape - cancel and return to game
      else if (
        this.inputManager.isKeyJustPressed('KeyN') ||
        this.inputManager.isKeyJustPressed('Escape')
      ) {
        logger.info('❌ Cancelled - returning to game', null, 'Game');
        this.gameState.setState(GameStateType.PLAYING);
        this.audioManager.playSound('ui_click');
      }
    }

    // Only process gameplay logic when actually playing
    if (this.gameState.isPlaying()) {
      // Update power-up manager
      this.powerUpManager.update(deltaTime);
      
      // Auto-save and check achievements during gameplay
      this.autoSave();
      this.checkAchievements();

      // Update achievement notification
      this.achievementNotification.update(deltaTime);

      // Handle escape key - show confirmation dialog
      if (this.inputManager.isActionJustPressed('pause')) {
        logger.debug('⏸️ Escape pressed - showing confirmation dialog', null, 'Game');
        this.gameState.setState(GameStateType.CONFIRM_MENU);
        this.audioManager.playSound('ui_click');
        return; // Don't process other gameplay input
      }

      // Update hole animation if active
      if (this.isAnimatingHoleFall) {
        this.updateHoleAnimation(deltaTime);
      }

      // Check for start key press to place ball on bar
      if (this.inputManager.isActionJustPressed('start')) {
        logger.debug('🎯 SPACE pressed - placing ball on bar', null, 'Game');
        this.placeBallOnBar();

        // Resume audio context on user interaction (required by browsers)
        this.audioManager.resumeContext();

        // Play UI click sound
        this.audioManager.playSound('ui_click');
      }

      // Handle power-up activation
      this.handlePowerUpInput();

      // Update tilting bar based on independent side controls (absolute movement)
      const leftSideInput = this.inputManager.getLeftSideInput();
      const rightSideInput = this.inputManager.getRightSideInput();

      this.tiltingBar.moveLeftSide(leftSideInput);
      this.tiltingBar.moveRightSide(rightSideInput);
      this.tiltingBar.update(deltaTime / 1000); // Convert to seconds

      // Update current level
      if (this.currentLevel) {
        this.currentLevel.update(deltaTime);
        
        // Update saucer behavior
        this.updateSaucerBehavior();
        
        // Only check collisions if not animating
        if (!this.isAnimatingHoleFall) {
          this.checkCollisions();
          this.checkWinLoseConditions();
        }
      }
    }

    // End frame - update previous input state for next frame
    this.inputManager.endFrame();
  }

  /**
   * Render the main gameplay area and UI overlays.
   */
  public renderGameplay(): void {
    // Render level elements FIRST (background)
    if (this.currentLevel) {
      const levelData = this.currentLevel.getLevelData();

      // Draw holes FIRST (under everything) - only draw active holes
      for (const hole of levelData.holes) {
        // Skip deactivated holes (like collected power-up holes)
        if (!hole.isActive) continue;
        
        // Check if this goal hole has been completed
        const isCompleted =
          hole.isGoal && this.currentLevel
            ? this.currentLevel.isGoalCompleted(hole.id)
            : false;
        this.renderer.drawHole(hole, isCompleted, this.gameState.isDebugMode());
      }
    }

    // Render tilting bar AFTER holes (so it appears on top)
    this.renderer.drawTiltingBar(this.tiltingBar);

    // Render UI elements
    if (this.currentLevel) {
      const levelData = this.currentLevel.getLevelData();

      // Draw essential UI (always visible)
      const ctx = this.renderer.getContext();
      if (ctx) {
        ctx.fillStyle = '#00f0ff'; // Electric Blue
        fontManager.setFont(ctx, 'primary', 12);
        ctx.textAlign = 'left';
        ctx.fillText(`Level: ${levelData.id} - ${levelData.name}`, 10, 20);
        ctx.fillText(`Score: ${this.gameState.getStateData().score}`, 10, 35);
        ctx.fillText(`Lives: ${this.gameState.getStateData().lives}`, 10, 50);

        // Debug info (only when debug mode is enabled)
        if (this.gameState.isDebugMode()) {
          ctx.fillText(
            `Progress: ${Math.round(this.currentLevel.getProgress() * 100)}%`,
            10,
            65,
          );

          // Show multi-goal progress
          const completedGoals = this.currentLevel.getCompletedGoals();
          const requiredGoals = this.currentLevel.getRequiredGoals();
          ctx.fillText(
            `Goals: ${completedGoals}/${requiredGoals} completed`,
            10,
            80,
          );

          if (completedGoals < requiredGoals) {
            ctx.fillText('Goal: Navigate to the glowing goal holes', 10, 95);
          } else {
            ctx.fillText('Goal: All goals completed! Level complete!', 10, 95);
          }
        }
      }
    }

    // Input instructions (only when debug mode is enabled)
    if (this.gameState.isDebugMode()) {
      const ctx = this.renderer.getContext();
      if (ctx) {
        ctx.fillStyle = '#00f0ff'; // Electric Blue
        fontManager.setFont(ctx, 'primary', 10);
        ctx.textAlign = 'center';
        ctx.fillText(
          'SPACE: Start | Left: A(up)/Z(down) | Right: ↑(up)/↓(down)',
          180,
          580,
        );
        ctx.fillText(
          'Navigate upward to the goal holes - avoid falling into other holes!',
          180,
          595,
        );
      }
    }

    // Render power-up effects
    this.renderPowerUpEffects();

    // Render settings menu if open
    if (this.gameState.isSettings()) {
      const ctx = this.renderer.getContext();
      if (ctx) {
        this.settingsMenu.draw(ctx);
      }
    }
  }

  /**
   * Get hole animation state for rendering
   */
  public getHoleAnimationState(): { scale: number; opacity: number } | null {
    return this.holeAnimationState
      ? {
        scale: this.holeAnimationState.scale,
        opacity: this.holeAnimationState.opacity,
      }
      : null;
  }



  /**
   * Render power-up effects and UI
   */
  private renderPowerUpEffects(): void {
    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Get active power-ups
    const activePowerUps = this.powerUpManager.getActivePowerUps();
    const powerUpEffects = this.powerUpManager.getPowerUpEffects();

    // Render power-up overlays
    if (powerUpEffects.timeScale) {
      // Slow-Mo Surge overlay - more prominent
      ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; // More opaque cyan overlay
      ctx.fillRect(0, 0, 360, 640);
      
      // Add pulsing effect
      const pulseIntensity = 0.2 + 0.1 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = `rgba(0, 255, 255, ${pulseIntensity})`;
      ctx.fillRect(0, 0, 360, 640);
    }

    // Render power-up HUD
    this.renderPowerUpHUD(ctx, activePowerUps);
  }

  /**
   * Render power-up HUD
   */
  private renderPowerUpHUD(ctx: CanvasRenderingContext2D, activePowerUps: Map<PowerUpType, any>): void {
    const powerUpSprites = {
      [PowerUpType.SLOW_MO_SURGE]: 'hourglass',
      [PowerUpType.MAGNETIC_GUIDE]: 'magnet',
      [PowerUpType.CIRCUIT_PATCH]: 'chip',
      [PowerUpType.OVERCLOCK_BOOST]: 'cross',
      [PowerUpType.SCAN_REVEAL]: 'eye',
    };

    // Power-up names for display (currently unused but kept for future use)
    // const powerUpNames = {
    //   [PowerUpType.SLOW_MO_SURGE]: 'Slow-Mo',
    //   [PowerUpType.MAGNETIC_GUIDE]: 'Magnetic',
    //   [PowerUpType.CIRCUIT_PATCH]: 'Shield',
    //   [PowerUpType.OVERCLOCK_BOOST]: 'Overclock',
    //   [PowerUpType.SCAN_REVEAL]: 'Scan',
    // };

    // Render power-up status with icons only: left, center, right
    const screenWidth = 360;
    const padding = 20; // Padding from edges
    
    // Define positions for each power-up type
    const powerUpPositions = {
      [PowerUpType.SLOW_MO_SURGE]: { x: padding + 30, align: 'center' },
      [PowerUpType.MAGNETIC_GUIDE]: { x: padding + 80, align: 'center' },
      [PowerUpType.CIRCUIT_PATCH]: { x: screenWidth / 2, align: 'center' },
      [PowerUpType.OVERCLOCK_BOOST]: { x: screenWidth - padding - 80, align: 'center' },
      [PowerUpType.SCAN_REVEAL]: { x: screenWidth - padding - 30, align: 'center' },
    };
    
    activePowerUps.forEach((state, type) => {
      const spriteName = powerUpSprites[type];
      const charges = state.charges;
      const isActive = state.isActive;
      const position = powerUpPositions[type];

      // Draw power-up sprite
      if (spriteName && this.renderer) {
        const spriteScale = 0.4; // Scale down for HUD
        const spriteY = 610 - 20; // Position above text
        
        // Set color tint based on active state
        if (isActive) {
          if (type === PowerUpType.SLOW_MO_SURGE) {
            // Add countdown timer for active Slow-Mo
            const elapsed = Date.now() - state.startTime;
            const remaining = Math.max(0, state.duration - elapsed);
            const secondsRemaining = Math.ceil(remaining / 1000);
            
            // Change color based on remaining time
            if (secondsRemaining <= 1) {
              this.renderer.setTint('#ff0000'); // Red when almost done
            } else if (secondsRemaining <= 2) {
              this.renderer.setTint('#ff6600'); // Orange when low
            } else {
              this.renderer.setTint('#00ff00'); // Green when plenty of time
            }
          } else {
            this.renderer.setTint('#00ff00'); // Green for active
          }
        } else {
          this.renderer.setTint('#ffffff'); // White for inactive
        }
        
        this.renderer.drawAtlasSprite(spriteName, position.x, spriteY, spriteScale);
        this.renderer.clearTint();
      }
      
      // Draw charge count
      ctx.fillStyle = isActive ? '#00ff00' : '#ffffff';
      ctx.font = '14px Interceptor';
      ctx.textAlign = 'center';
      
      let displayText = `${charges}`;
      
      // Add countdown timer for active Slow-Mo
      if (isActive && type === PowerUpType.SLOW_MO_SURGE) {
        const elapsed = Date.now() - state.startTime;
        const remaining = Math.max(0, state.duration - elapsed);
        const secondsRemaining = Math.ceil(remaining / 1000);
        displayText = `${charges}[${secondsRemaining}s]`;
        
        // Change color based on remaining time
        if (secondsRemaining <= 1) {
          ctx.fillStyle = '#ff0000'; // Red when almost done
        } else if (secondsRemaining <= 2) {
          ctx.fillStyle = '#ff6600'; // Orange when low
        } else {
          ctx.fillStyle = '#00ff00'; // Green when plenty of time
        }
      }
      
      ctx.fillText(displayText, position.x, 610);
    });

    // Render power-up controls hint
    if (this.gameState.isDebugMode()) {
      ctx.fillStyle = '#00f0ff';
      ctx.font = '10px Interceptor';
      ctx.textAlign = 'left';
      ctx.fillText('Power-ups: Q(Slow-Mo) W(Magnetic) E(Shield) R(Overclock) T(Scan)', 10, 620);
    }
  }

  /**
   * Handle power-up input activation
   */
  private handlePowerUpInput(): void {
    // Slow-Mo Surge - Q key
    if (this.inputManager.isKeyJustPressed('KeyQ')) {
      if (this.powerUpManager.activatePowerUp(PowerUpType.SLOW_MO_SURGE)) {
        this.audioManager.playSound('powerup_activate');
        logger.info('⏰ Slow-Mo Surge activated', null, 'Game');
      }
    }

    // Magnetic Guide - W key
    if (this.inputManager.isKeyJustPressed('KeyW')) {
      if (this.powerUpManager.activatePowerUp(PowerUpType.MAGNETIC_GUIDE)) {
        this.audioManager.playSound('powerup_activate');
        logger.info('🧲 Magnetic Guide activated', null, 'Game');
      }
    }

    // Circuit Patch (Shield) - E key
    if (this.inputManager.isKeyJustPressed('KeyE')) {
      if (this.powerUpManager.activatePowerUp(PowerUpType.CIRCUIT_PATCH)) {
        this.audioManager.playSound('shield_activate');
        logger.info('🛡️ Circuit Patch shield activated', null, 'Game');
      }
    }

    // Overclock Boost - R key
    if (this.inputManager.isKeyJustPressed('KeyR')) {
      if (this.powerUpManager.activatePowerUp(PowerUpType.OVERCLOCK_BOOST)) {
        this.audioManager.playSound('powerup_activate');
        logger.info('⚡ Overclock Boost activated', null, 'Game');
      }
    }

    // Scan Reveal - T key
    if (this.inputManager.isKeyJustPressed('KeyT')) {
      if (this.powerUpManager.activatePowerUp(PowerUpType.SCAN_REVEAL)) {
        this.audioManager.playSound('powerup_activate');
        logger.info('🔍 Scan Reveal activated', null, 'Game');
      }
    }
  }

  /**
   * Place ball on the tilting bar
   */
  private placeBallOnBar(): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (ball) {
      // Position ball on the bar
      ball.position.x = this.tiltingBar.position.x;
      ball.position.y = this.tiltingBar.leftSideHeight - 20; // Slightly above the bar
      ball.previousPosition.x = ball.position.x;
      ball.previousPosition.y = ball.position.y;
      ball.velocity.x = 0;
      ball.velocity.y = 0;
      logger.debug('🎯 Ball placed on tilting bar', null, 'Game');
    }
  }

  /**
   * Reset ball after completing a goal (no life loss)
   */
  private resetBallAfterGoal(): void {
    logger.info('🎯 Goal completed - resetting ball without life loss', null, 'Game');

    // Reset power-ups for new attempt
    this.powerUpManager.initializeRun();

    // Reset tilting bar to starting position
    this.tiltingBar.reset();

    // Reset ball to starting position on the bar
    this.placeBallOnBar();
  }

  /**
   * Get power-up manager
   */
  public getPowerUpManager(): PowerUpManager {
    return this.powerUpManager;
  }

  /**
   * Check if ball is currently animating into a hole
   */
  public getIsAnimatingHoleFall(): boolean {
    return this.isAnimatingHoleFall;
  }



  /**
   * Check collisions between ball and level elements
   */
  private checkCollisions(): void {
    if (!this.currentLevel) return;

    const ball = this.physicsEngine
      .getObjects()
      .find(obj => obj.id === 'game-ball');
    if (!ball) return;

    const ballPosition = { x: ball.position.x, y: ball.position.y };
    const ballRadius = ball.radius;

    // Check if ball reached the goal hole - now triggers hole animation
    if (this.currentLevel.checkGoalReached(ballPosition, ballRadius)) {
      this.handleGoalReached();
      // Start hole animation for goal hole
      const goalHole = this.currentLevel.getGoalHoleAtPosition(ballPosition);
      if (goalHole) {
        this.startHoleAnimation('game-ball', goalHole.position, true, false); // Mark as goal hole
      }
      return;
    }

    // Check if ball fell into any hole
    const hitHole = this.currentLevel.checkHoleCollision(
      ballPosition,
      ballRadius,
      'game-ball', // Pass ball ID to prevent re-entry
    );
    if (hitHole && !hitHole.isGoal) {
      this.handleHoleCollision(hitHole);
    }

    // Check if ball fell off screen
    if (this.currentLevel.checkBallFallOff(ballPosition, { x: 360, y: 640 })) {
      this.handleBallFallOff();
    }

    // Check for power-up hole collisions (handled in handleHoleCollision)
  }

  /**
   * Check win/lose conditions
   */
  private checkWinLoseConditions(): void {
    if (!this.currentLevel) return;

    // Check if level is complete (only handle once per level)
    if (
      this.currentLevel.checkLevelComplete() &&
      !this.levelCompletionHandled
    ) {
      this.levelCompletionHandled = true;
      this.handleLevelComplete();
    }
  }

  /**
   * Handle ball reaching the goal hole
   */
  private handleGoalReached(): void {
    if (!this.currentLevel) return;

    logger.info('🎯 Goal reached!', null, 'Game');

    // Record goal reached event
    this.statsManager.recordEvent({
      type: 'goal_reached',
      timestamp: Date.now(),
    });

    // Update game progress
    this.gameProgress.totalGoalsReached++;

    // Play target activation sound
    this.audioManager.playSound('target');

    // Add bonus score for reaching goal
    const currentScore = this.gameState.getStateData().score;
    this.gameState.updateStateData({ score: currentScore + 500 });

    logger.info('💰 Goal bonus: 500 points', null, 'Game');

    // Check if all goals are completed
    const completedGoals = this.currentLevel.getCompletedGoals();
    const requiredGoals = this.currentLevel.getRequiredGoals();

    logger.info(`🎯 Goals completed: ${completedGoals}/${requiredGoals}`, null, 'Game');

    if (completedGoals >= requiredGoals) {
      logger.info('🎉 All goals completed! Level complete!', null, 'Game');
      logger.info(
        `🎯 Level ${this.currentLevel.getLevelData().id} complete! All ${requiredGoals} goals reached!`,
        null,
        'Game',
      );
    }
  }

  /**
   * Handle ball falling into a hole
   */
  private handleHoleCollision(hole: Hole): void {
    logger.info(`🕳️ Ball fell into hole: ${hole.id}`, null, 'Game');

    // Check if this is a power-up hole
    const isPowerUpHole = hole.powerUpType !== undefined;
    if (isPowerUpHole) {
      // Start saucer behavior instead of immediate collection
      if (this.currentLevel) {
        this.currentLevel.startSaucerBehavior(hole.id, 'game-ball', Date.now());
        this.handlePowerUpHoleCollection(hole);
      }
    } else {
      // Regular hole - play falling sound and start animation
      this.audioManager.playSound('zap');
      this.startHoleAnimation('game-ball', hole.position, false, false);
    }
  }

  /**
   * Update saucer behavior and kick balls when ready
   */
  private updateSaucerBehavior(): void {
    if (!this.currentLevel) return;

    const kickData = this.currentLevel.updateSaucerBehavior(Date.now());
    if (kickData) {
      this.kickBallFromSaucer(kickData);
    }
  }

  /**
   * Kick ball out of saucer with physics
   */
  private kickBallFromSaucer(kickData: { ballId: string; direction: { x: number; y: number }; force: number; holeId: string }): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === kickData.ballId);
    if (!ball) return;

    // Apply kick force to ball
    const kickVelocity = {
      x: kickData.direction.x * kickData.force,
      y: kickData.direction.y * kickData.force
    };

    // Update ball physics
    ball.previousPosition.x = ball.position.x - kickVelocity.x * 0.016; // 60fps
    ball.previousPosition.y = ball.position.y - kickVelocity.y * 0.016;

    // Play kick sound
    this.audioManager.playSound('powerup_collect');

    logger.info(`🚀 Ball kicked from saucer with force: ${kickData.force} from hole: ${kickData.holeId}`, null, 'Game');
  }

  /**
   * Handle power-up hole collection
   */
  private handlePowerUpHoleCollection(hole: Hole): void {
    if (!hole.powerUpType) return;

    logger.info(`🎁 Power-up collected from hole: ${hole.powerUpType}`, null, 'Game');

    // Add charge to the power-up
    this.powerUpManager.addCharges(hole.powerUpType, 1);

    // Don't deactivate the hole immediately - let saucer handle it
    // The hole will be deactivated after the ball is kicked out

    // Play collection sound
    this.audioManager.playSound('powerup_collect');

    // Record collection event
    this.statsManager.recordEvent({
      type: 'powerup_collected',
      timestamp: Date.now(),
      data: { powerUpType: hole.powerUpType, source: 'hole' },
    });

    logger.info(`⚡ Added charge to ${hole.powerUpType} from power-up hole`, null, 'Game');
  }

  /**
   * Handle ball falling off screen
   */
  private handleBallFallOff(): void {
    logger.warn('💀 Ball fell off screen!', null, 'Game');

    // Check if shield should be used
    if (this.powerUpManager.useShield()) {
      logger.info('🛡️ Shield used to prevent ball loss!', null, 'Game');
      this.audioManager.playSound('shield_break');
      
      // Reset ball to starting position on the bar
      this.placeBallOnBar();
      return;
    }

    // Record ball lost event
    this.statsManager.recordEvent({
      type: 'ball_lost',
      timestamp: Date.now(),
    });

    // Update game progress
    this.gameProgress.totalBallsLost++;

    // Reduce lives
    const currentLives = this.gameState.getStateData().lives;
    if (currentLives > 1) {
      this.gameState.updateStateData({ lives: currentLives - 1 });
      logger.info(`💔 Lives remaining: ${currentLives - 1}`, null, 'Game');

          // Reset power-ups for new game
    this.powerUpManager.initializeRun();

    // Reset tilting bar to starting position
    this.tiltingBar.reset();

    // Reset ball to starting position on the bar
    this.placeBallOnBar();
    } else {
      this.handleGameOver();
    }
  }

  /**
   * Handle level completion
   */
  private handleLevelComplete(): void {
    if (!this.currentLevel) return;

    logger.info('🏆 Level completed!', null, 'Game');

    // Record level complete event
    const levelId = this.currentLevel.getLevelData().id;
    const levelScore = this.currentLevel.calculateScore();
    this.statsManager.recordEvent({
      type: 'level_complete',
      timestamp: Date.now(),
      data: { 
        levelId,
        score: levelScore,
        completionTime: Date.now() - this.sessionStartTime, // Rough completion time
      },
    });

    // Update game progress
    this.gameProgress.completedLevels.add(levelId);
    this.gameProgress.highestLevel = Math.max(this.gameProgress.highestLevel, levelId);

    // Play level completion sound
    this.audioManager.playSound('level_complete');

    // Add level completion bonus
    const currentScore = this.gameState.getStateData().score;
    this.gameState.updateStateData({ score: currentScore + levelScore });

    logger.info(`🎉 Level bonus: ${levelScore}`, null, 'Game');

    // Move to next level
    const nextLevelId = this.currentLevel.getLevelData().id + 1;
    this.levelManager.unlockLevel(nextLevelId);

    // Load next level or show completion
    if (this.levelManager.getLevelData(nextLevelId)) {
      this.loadNextLevel(nextLevelId);
    } else {
      this.handleGameComplete();
    }
  }

  /**
   * Handle time up
   */
  // private handleTimeUp(): void {
  //   logger.warn('⏰ Time up!', null, 'Game');
  //   this.handleBallFallOff();
  // }

  /**
   * Load next level
   */
  private loadNextLevel(levelId: number): void {
    logger.info(`🔄 Loading level ${levelId}...`, null, 'Game');

    // Record level start event
    this.statsManager.recordEvent({
      type: 'level_start',
      timestamp: Date.now(),
      data: { levelId },
    });

    this.currentLevel = this.levelManager.loadLevel(levelId);
    if (this.currentLevel) {
      this.currentLevel.start();
      this.gameState.updateStateData({ currentLevel: levelId });
      this.levelCompletionHandled = false; // Reset completion flag for new level

      // Reset tilting bar to starting position
      this.tiltingBar.reset();

      // Reset ball to starting position on the bar
      this.placeBallOnBar();

            logger.info(`🎯 Level ${levelId} loaded and started`, null, 'Game');
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(): void {
    logger.warn('💀 Game Over!', null, 'Game');
    
    // Record death event
    this.statsManager.recordEvent({
      type: 'death',
      timestamp: Date.now(),
    });
    
    this.gameState.setState(GameStateType.GAME_OVER);

    // Save final game progress
    this.saveGameProgress();

    // Play game over sound
    this.audioManager.playSound('game_over');

    // Return to menu music after a short delay
    setTimeout(() => {
      this.playMenuMusic();
    }, 1000);

    // Auto-return to menu after 5 seconds if user doesn't interact
    setTimeout(() => {
      if (this.gameState.isState(GameStateType.GAME_OVER)) {
        logger.info('🏠 Auto-returning to menu...', null, 'Game');
        this.gameState.reset();
      }
    }, 5000);
  }

  /**
   * Handle game completion
   */
  private handleGameComplete(): void {
    logger.info('🎊 Game completed! All levels finished!', null, 'Game');

    // Record game complete event
    this.statsManager.recordEvent({
      type: 'game_complete',
      timestamp: Date.now(),
    });

    // Return to menu music after a short delay
    setTimeout(() => {
      this.playMenuMusic();
    }, 1000);

    // Show completion message briefly, then return to main menu
    setTimeout(() => {
      logger.info('🏠 Returning to main menu...', null, 'Game');
      this.gameState.reset();
    }, 2000); // 2 second delay to show completion
  }

  /**
   * Pause the game.
   */
  public pause(): void {
    logger.info('⏸️ Pausing Circuit Breaker...', null, 'Game');
    
    // Save progress when pausing
    this.saveGameProgress();
    
    this.gameLoop.pause();
  }

  /**
   * Resume the game from pause.
   */
  public resume(): void {
    logger.info('▶️ Resuming Circuit Breaker...', null, 'Game');
    this.gameLoop.resume();
  }

  /**
   * Stop the game and clean up resources.
   */
  public stop(): void {
    logger.info('⏹️ Stopping Circuit Breaker...', null, 'Game');
    
    // Record session end event
    this.statsManager.recordEvent({
      type: 'session_end',
      timestamp: Date.now(),
    });
    
    this.gameLoop.stop();
    this.isRunning = false;
  }

  /**
   * Get the current game state object.
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Check if the game is currently running.
   */
  public isGameRunning(): boolean {
    return this.isRunning && this.gameLoop.isGameLoopRunning();
  }

  /**
   * Start a new game (used when clicking from menu)
   */
  private startNewGame(): void {
    logger.info('🎮 Starting new game...', null, 'Game');

    // Record game start event
    this.statsManager.recordEvent({
      type: 'game_start',
      timestamp: Date.now(),
    });

    // Update game progress
    this.gameProgress.gamesPlayed++;
    this.sessionStartTime = Date.now();

    // Reset game state
    this.gameState.setState(GameStateType.PLAYING);
    this.gameState.updateStateData({
      currentLevel: 1,
      score: 0,
      lives: 3,
    });

    // Load first level
    this.currentLevel = this.levelManager.loadLevel(1);
    if (this.currentLevel) {
      this.currentLevel.start();
      this.levelCompletionHandled = false;
      
      logger.info('🎯 Level 1 loaded and started', null, 'Game');
    }

    // Reset tilting bar to starting position
    this.tiltingBar.reset();

    // Reset ball to starting position on the bar
    this.placeBallOnBar();

    // Switch to gameplay music
    this.playGameplayMusic();

    logger.info('🚀 New game started successfully!', null, 'Game');
  }

  /**
   * Update hole animation if active
   */
  private updateHoleAnimation(_deltaTime: number): void {
    if (!this.holeAnimationState) return;

    const elapsed = Date.now() - this.holeAnimationState.startTime;
    const progress = Math.min(elapsed / this.holeAnimationState.duration, 1);

    // Easing function for more natural animation (starts fast, slows down)
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    // Update animation properties
    this.holeAnimationState.scale = 1 - easedProgress * 0.9; // Scale down to 10% of original (more dramatic)
    this.holeAnimationState.opacity = 1 - easedProgress * 0.7; // Fade to 30% opacity

    // Move ball towards hole center initially, then down behind playfield
    const ball = this.physicsEngine
      .getObjects()
      .find(obj => obj.id === this.holeAnimationState?.ballId);
    if (ball) {
      const startPos = this.holeAnimationState.startPosition;
      const holePos = this.holeAnimationState.holePosition;

      if (progress < 0.3) {
        // First 30% of animation: move towards hole center
        const moveProgress = progress / 0.3;
        ball.position.x = startPos.x + (holePos.x - startPos.x) * moveProgress;
        ball.position.y = startPos.y + (holePos.y - startPos.y) * moveProgress;
      } else {
        // Remaining 70%: fall straight down behind playfield
        const fallProgress = (progress - 0.3) / 0.7;
        ball.position.x = holePos.x; // Stay at hole center horizontally
        ball.position.y = holePos.y + fallProgress * 200; // Fall 200 pixels down behind playfield
      }

      // Update previous position to prevent physics interference
      ball.previousPosition.x = ball.position.x;
      ball.previousPosition.y = ball.position.y;

      // Stop ball physics
      ball.velocity.x = 0;
      ball.velocity.y = 0;
    }

    // Complete animation
    if (progress >= 1) {
      this.completeHoleAnimation();
    }
  }

  /**
   * Start hole animation when ball enters a hole
   */
  private startHoleAnimation(
    ballId: string,
    holePosition: { x: number; y: number },
    isGoalHole: boolean = false,
    isPowerUpHole: boolean = false,
  ): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === ballId);
    if (!ball) return;

    logger.debug(`🎬 Starting hole animation for ball: ${ballId} (goal: ${isGoalHole}, power-up: ${isPowerUpHole})`, null, 'Game');

    this.isAnimatingHoleFall = true;
    this.holeAnimationState = {
      ballId: ballId,
      holePosition: holePosition,
      startTime: Date.now(),
      duration: 500, // Faster animation: 500ms instead of 800ms
      startPosition: { x: ball.position.x, y: ball.position.y },
      scale: 1,
      opacity: 1,
      isGoalHole: isGoalHole,
      isPowerUpHole: isPowerUpHole,
    };
  }

  /**
   * Complete hole animation and reset ball
   */
  private completeHoleAnimation(): void {
    if (!this.holeAnimationState) return;

    const isGoalHole = this.holeAnimationState.isGoalHole;
    const isPowerUpHole = this.holeAnimationState.isPowerUpHole;
    logger.debug(`🎬 Hole animation complete (goal: ${isGoalHole}, power-up: ${isPowerUpHole})`, null, 'Game');

    this.isAnimatingHoleFall = false;
    this.holeAnimationState = null;

    // Handle differently based on hole type
    if (isGoalHole) {
      // Goal hole - just reset ball without losing life
      this.resetBallAfterGoal();
    } else if (isPowerUpHole) {
      // Power-up hole - just reset ball without losing life (power-up already collected)
      this.resetBallAfterGoal();
    } else {
      // Regular hole - lose life and reset
      this.handleBallFallOff();
    }
  }

  /**
   * Check if any input is currently active
   */
  private hasAnyInput(): boolean {
    const inputState = this.inputManager.getInputState();

    // Check if any key is pressed
    const hasKeyPress = Object.values(inputState.keys).some(pressed => pressed);

    // Check if mouse is clicked
    const hasMouseClick = inputState.mouse.isDown;

    return hasKeyPress || hasMouseClick;
  }

  /**
   * Start attract mode
   */
  private startAttractMode(): void {
    logger.debug('🎬 Entering attract mode', null, 'Game');
    this.gameState.setState(GameStateType.ATTRACT_MODE);
    this.attractModeTimer = 0;
    this.menuTimer = 0;

    // Start a level for attract mode demonstration
    this.startAttractModeLevel();

    // Continue playing menu music during attract mode
    // (No need to change music since it's already playing from menu)
  }

  /**
   * Exit attract mode and return to menu
   */
  private exitAttractMode(): void {
    logger.debug('🏠 Exiting attract mode', null, 'Game');
    this.gameState.setState(GameStateType.MENU);
    this.attractModeTimer = 0;
    this.menuTimer = 0;

    // Reset any ongoing game state
    this.gameState.reset();

    // Play UI click sound
    this.audioManager.playSound('ui_click');

    // Return to menu music
    this.playMenuMusic();
  }

  /**
   * Update attract mode auto-play
   */
  private updateAttractMode(deltaTime: number): void {
    this.attractModeTimer += deltaTime;

    // Auto-play logic - simple automated bar movement
    const time = this.attractModeTimer / 1000; // Convert to seconds
    const leftInput = Math.sin(time * 0.8) * 0.7; // Slow left side movement
    const rightInput = Math.cos(time * 0.6) * 0.8; // Slow right side movement

    // Apply automated input to tilting bar
    this.tiltingBar.moveLeftSide(leftInput);
    this.tiltingBar.moveRightSide(rightInput);
    this.tiltingBar.update(deltaTime / 1000);

    // Periodically place ball on bar for demonstration
    if (Math.floor(time) % 8 === 0 && time % 8 < 0.1) {
      this.placeBallOnBar();
    }

    // Update current level if exists
    if (this.currentLevel) {
      this.currentLevel.update(deltaTime);
      this.checkCollisions();
      this.checkWinLoseConditions();
    }

    // Reset attract mode after 30 seconds to prevent infinite loops
    if (this.attractModeTimer > 30000) {
      this.exitAttractMode();
    }
  }

  /**
   * Start a level for attract mode demonstration
   */
  private startAttractModeLevel(): void {
    try {
      // Load level 1 for demonstration (use same method as startNewGame)
      this.currentLevel = this.levelManager.loadLevel(1);

      if (this.currentLevel) {
        logger.debug('🎮 Starting attract mode level', null, 'Game');
        this.currentLevel.start();

        // Reset tilting bar to starting position
        this.tiltingBar.reset();

        // Place ball on bar
        this.placeBallOnBar();

        logger.debug('✅ Attract mode level started successfully', null, 'Game');
      } else {
        logger.error('❌ Failed to load attract mode level', null, 'Game');
        this.exitAttractMode();
      }
    } catch (error) {
      logger.error('❌ Error starting attract mode level:', error, 'Game');
      this.exitAttractMode();
    }
  }

  /**
   * Play menu music
   */
  private async playMenuMusic(): Promise<void> {
    try {
      await this.audioManager.fadeToMusic('02-Delorean_Time.mp3', 1.0);
      logger.debug('🎵 Menu music started (02-Delorean_Time.mp3)', null, 'Game');
    } catch (error) {
      logger.error('❌ Error playing menu music:', error, 'Game');
    }
  }

  /**
   * Play gameplay music
   */
  private async playGameplayMusic(): Promise<void> {
    try {
      await this.audioManager.fadeToMusic('Dead_Space.mp3', 1.0);
      logger.debug('🎵 Gameplay music started', null, 'Game');
    } catch (error) {
      logger.error('❌ Error playing gameplay music:', error, 'Game');
    }
  }

  /**
   * Stop all music
   */
  // private stopMusic(): void {
  //   this.audioManager.stopMusic();
  // }

  /**
   * Get current loading progress (0-100)
   */
  public getLoadingProgress(): number {
    return this.loadingProgress;
  }

  /**
   * Get current loading status message
   */
  public getLoadingStatus(): string {
    return this.loadingStatus;
  }

  /**
   * Check if loading is complete and waiting for user input
   */
  public isLoadingComplete(): boolean {
    return this.loadingComplete;
  }

  /**
   * Start the asset loading process
   */
  private async startAssetLoading(): Promise<void> {
    logger.info('📦 Starting asset loading...', null, 'Game');

    // Define all assets that need to be loaded
    this.assetsToLoad = [
      'Engage_II.mp3',
      'Dead_Space.mp3',
      'atlas_01.json',
      'atlas_01.png',
      'powerup_atlas_01.json',
      'powerup_atlas_01.png',
    ];

    this.loadedAssets = 0;
    this.loadingProgress = 0;
    this.loadingStatus = 'Loading audio files...';
    this.loadingComplete = false;

    try {
      // Load audio files
      await this.loadAudioAssets();

      // Load sprite atlas
      this.loadingStatus = 'Loading sprite atlas...';
      await this.loadSpriteAssets();

      // Initialize fonts
      this.loadingStatus = 'Loading fonts...';
      await this.loadFonts();

      // Complete loading
      this.loadingProgress = 100;
      this.loadingStatus = 'Press any key to continue...';
      this.loadingComplete = true;

      logger.info('✅ All assets loaded successfully', null, 'Game');
    } catch (error) {
      logger.error('❌ Error loading assets:', error, 'Game');
      this.loadingStatus = 'Loading failed - Press any key to continue...';
      this.loadingComplete = true;
    }
  }

  /**
   * Load audio assets
   */
  private async loadAudioAssets(): Promise<void> {
    const audioFiles = this.assetsToLoad.filter(asset =>
      asset.endsWith('.mp3'),
    );

    for (let i = 0; i < audioFiles.length; i++) {
      const filename = audioFiles[i];
      this.loadingStatus = `Loading ${filename}...`;

      try {
        await this.audioManager.loadMusic(filename);
        this.loadedAssets++;
        this.updateLoadingProgress();
        logger.debug(`✅ Loaded audio: ${filename}`, null, 'Game');
      } catch (error) {
        logger.warn(`⚠️ Failed to load audio: ${filename}`, error, 'Game');
        this.loadedAssets++;
        this.updateLoadingProgress();
      }

      // Small delay to show progress
      await this.delay(100);
    }
  }

  /**
   * Load sprite assets
   */
  private async loadSpriteAssets(): Promise<void> {
    // The sprite atlas is already loaded by the renderer during init
    // Just simulate loading for progress tracking
    const spriteFiles = this.assetsToLoad.filter(
      asset => asset.endsWith('.json') || asset.endsWith('.png'),
    );

    for (let i = 0; i < spriteFiles.length; i++) {
      const filename = spriteFiles[i];
      this.loadingStatus = `Loading ${filename}...`;

      this.loadedAssets++;
      this.updateLoadingProgress();

      // Small delay to show progress
      await this.delay(200);
    }
    
    logger.info('✅ Sprite assets loading simulation completed', null, 'Game');
  }

  /**
   * Load fonts (simulate font loading)
   */
  private async loadFonts(): Promise<void> {
    this.loadingStatus = 'Initializing fonts...';

    // Fonts are already loaded through CSS, just simulate the process
    await this.delay(300);

    logger.debug('✅ Fonts initialized', null, 'Game');
  }

  /**
   * Update loading progress based on loaded assets
   */
  private updateLoadingProgress(): void {
    this.loadingProgress = (this.loadedAssets / this.assetsToLoad.length) * 100;
  }

  /**
   * Load game progress from storage
   */
  private loadGameProgress(): void {
    try {
      // Try to load existing progress
      const savedProgress = this.storageManager.loadProgress(this.currentSaveSlot);
      
      if (savedProgress) {
        this.gameProgress = savedProgress;
        
        // Load achievements
        this.achievementManager.loadAchievements(Array.from(savedProgress.achievements));
        
        // Apply saved settings to audio manager
        this.audioManager.setMasterVolume(savedProgress.settings.masterVolume);
        this.audioManager.setMusicVolume(savedProgress.settings.musicVolume);
        this.audioManager.setSFXVolume(savedProgress.settings.sfxVolume);
        this.audioManager.setEnabled(savedProgress.settings.audioEnabled);
        
        logger.info(`📂 Loaded game progress from slot ${this.currentSaveSlot}`, null, 'Game');
      } else {
        // Create new progress
        this.gameProgress = this.storageManager.createNewProgress();
        logger.info('🆕 Created new game progress', null, 'Game');
      }
    } catch (error) {
      logger.error('❌ Failed to load game progress:', error, 'Game');
      this.gameProgress = this.storageManager.createNewProgress();
    }
  }

  /**
   * Save game progress to storage
   */
  private saveGameProgress(): boolean {
    try {
      // Update progress with current game state
      this.updateGameProgress();
      
      // Save to storage
      const success = this.storageManager.saveProgress(this.gameProgress, this.currentSaveSlot);
      
      if (success) {
        logger.debug('💾 Game progress saved', null, 'Game');
      }
      
      return success;
    } catch (error) {
      logger.error('❌ Failed to save game progress:', error, 'Game');
      return false;
    }
  }

  /**
   * Update game progress with current state
   */
  private updateGameProgress(): void {
    if (!this.gameProgress) return;

    const currentTime = Date.now();
    
    // Update play time
    if (this.sessionStartTime > 0) {
      this.gameProgress.playTime += currentTime - this.sessionStartTime;
      this.sessionStartTime = currentTime;
    }

    // Update settings
    const audioConfig = this.audioManager.getConfig();
    this.gameProgress.settings = {
      masterVolume: audioConfig.masterVolume,
      musicVolume: audioConfig.musicVolume,
      sfxVolume: audioConfig.sfxVolume,
      audioEnabled: audioConfig.enabled,
    };

    // Update achievements
    this.gameProgress.achievements = new Set(this.achievementManager.getUnlockedAchievementIds());
  }

  /**
   * Check and update achievements based on current game state
   */
  private checkAchievements(): void {
    if (!this.gameProgress) return;

    const stateData = this.gameState.getStateData();
    const currentTime = Date.now();
    
    // Calculate session play time
    const sessionPlayTime = this.sessionStartTime > 0 ? currentTime - this.sessionStartTime : 0;
    const totalPlayTime = this.gameProgress.playTime + sessionPlayTime;

    // Prepare game stats for achievement checking
    const gameStats = {
      currentLevel: stateData.currentLevel || 1,
      totalScore: stateData.score || 0,
      lives: stateData.lives || 3,
      goalsReached: this.gameProgress.totalGoalsReached,
      levelsCompleted: this.gameProgress.completedLevels.size,
      gamesPlayed: this.gameProgress.gamesPlayed,
      totalPlayTime: totalPlayTime,
      ballsLost: this.gameProgress.totalBallsLost,
      perfectLevels: 0, // TODO: Track perfect levels
      quickCompletions: 0, // TODO: Track quick completions
    };

    // Check achievements
    this.achievementManager.checkAchievements(gameStats);
  }

  /**
   * Auto-save game progress
   */
  private autoSave(): boolean {
    const now = Date.now();
    
    // Only auto-save every 30 seconds
    if (now - this.lastAutoSave < 30000) {
      return false;
    }

    const success = this.saveGameProgress();
    if (success) {
      this.lastAutoSave = now;
    }
    
    return success;
  }

  /**
   * Complete the loading process and transition to menu
   */
  private async completeLoading(): Promise<void> {
    logger.info('🎯 Loading complete - transitioning to menu', null, 'Game');
    this.gameState.setState(GameStateType.MENU);

    // Resume audio context on user interaction (required by browsers)
    await this.audioManager.resumeContext();

    // Start menu music
    this.playMenuMusic();
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Open settings menu
   */
  public openSettings(): void {
    this.gameState.setState(GameStateType.SETTINGS);
    
    // Update settings menu configuration based on current state
    const isFromPauseMenu = this.gameState.isPaused();
    this.settingsMenu = new SettingsMenu({
      audioManager: this.audioManager,
      onClose: () => this.closeSettings(),
      onBackToMenu: () => this.backToMenuFromSettings(),
      isFromPauseMenu,
    });
    
    this.settingsMenu.show();
    this.settingsMenu.updateVolumeDisplays();
    logger.info(`⚙️ Settings menu opened ${isFromPauseMenu ? 'from pause menu' : 'from main menu'}`, null, 'Game');
  }

  /**
   * Close settings menu
   */
  private closeSettings(): void {
    this.settingsMenu.hide();
    
    // Return to previous state
    if (this.gameState.isPaused()) {
      this.gameState.setState(GameStateType.PAUSED);
    } else {
      this.gameState.setState(GameStateType.MENU);
    }
    
    logger.info('⚙️ Settings menu closed', null, 'Game');
  }

  /**
   * Return to main menu from settings
   */
  private backToMenuFromSettings(): void {
    this.settingsMenu.hide();
    this.gameState.setState(GameStateType.MENU);
    logger.info('🏠 Returned to main menu from settings', null, 'Game');
  }

  /**
   * Open save/load menu
   */
  public openSaveLoadMenu(): void {
    logger.info('💾 Opening save/load menu', null, 'Game');
    this.gameState.setState(GameStateType.SAVE_LOAD);
    this.saveLoadMenu.show();
  }

  /**
   * Close save/load menu
   */
  private closeSaveLoadMenu(): void {
    logger.info('💾 Closing save/load menu', null, 'Game');
    this.saveLoadMenu.hide();
    
    // Return to previous state
    if (this.gameState.isState(GameStateType.SAVE_LOAD)) {
      this.gameState.setState(GameStateType.MENU);
    }
  }

  /**
   * Load game from save slot
   */
  private loadGameFromSlot(slotId: number): void {
    logger.info(`📂 Loading game from slot ${slotId}`, null, 'Game');
    
    // Load progress from slot
    const savedProgress = this.storageManager.loadProgress(slotId);
    if (savedProgress) {
      this.gameProgress = savedProgress;
      this.currentSaveSlot = slotId;
      
      // Load achievements
      this.achievementManager.loadAchievements(Array.from(savedProgress.achievements));
      
      // Apply saved settings
      this.audioManager.setMasterVolume(savedProgress.settings.masterVolume);
      this.audioManager.setMusicVolume(savedProgress.settings.musicVolume);
      this.audioManager.setSFXVolume(savedProgress.settings.sfxVolume);
      this.audioManager.setEnabled(savedProgress.settings.audioEnabled);
      
      // Start game with loaded progress
      this.startNewGame();
    } else {
      logger.warn(`⚠️ No save data found in slot ${slotId}`, null, 'Game');
    }
  }

  /**
   * Start new game in save slot
   */
  private startNewGameInSlot(slotId: number): void {
    logger.info(`🆕 Starting new game in slot ${slotId}`, null, 'Game');
    
    // Create new progress for this slot
    this.gameProgress = this.storageManager.createNewProgress();
    this.currentSaveSlot = slotId;
    
    // Start new game
    this.startNewGame();
  }

  /**
   * Delete save slot
   */
  private deleteSaveSlot(slotId: number): void {
    logger.info(`🗑️ Deleting save slot ${slotId}`, null, 'Game');
    this.storageManager.deleteSaveSlot(slotId);
  }

  /**
   * Open stats menu
   */
  public openStatsMenu(): void {
    logger.info('📊 Opening stats menu...', null, 'Game');
    this.gameState.setState(GameStateType.STATS);
  }

  /**
   * Close stats menu
   */
  private closeStatsMenu(): void {
    logger.info('📊 Closing stats menu...', null, 'Game');
    this.gameState.setState(GameStateType.MENU);
  }
}

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
import { ScalingManager } from '../utils/ScalingManager';
import { SettingsMenu } from '../ui/SettingsMenu';
import { SaveLoadMenu } from '../ui/SaveLoadMenu';
import { AchievementNotification } from '../ui/AchievementNotification';
import { StatsMenu } from '../ui/StatsMenu';
import { WinScreen } from '../ui/WinScreen';
import { StorageManager, GameProgress } from './StorageManager';
import { AchievementManager } from './AchievementManager';
import { StatsManager } from './StatsManager';
import { PowerUpManager, PowerUpType } from './PowerUpManager';
import { PowerUpEffects, EffectContext } from './PowerUpEffects';
import { PowerUpEventSystem } from './PowerUpEventSystem';
import { PowerUpDebugger } from '../utils/PowerUpDebugger';
import { getPowerUpConfig } from './PowerUpConfig';
import { PointFlyOffManager } from '../ui/PointFlyOffManager';
import { UnifiedScoringSystem } from './UnifiedScoringSystem';


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
  private winScreen: WinScreen | null = null;
  private storageManager: StorageManager;
  private achievementManager: AchievementManager;
  private statsManager: StatsManager;
  private powerUpManager: PowerUpManager;
  private powerUpEffects: PowerUpEffects;
  private powerUpEventSystem: PowerUpEventSystem;
  private powerUpDebugger: PowerUpDebugger;
  private pointFlyOffManager: PointFlyOffManager;
  private unifiedScoringSystem: UnifiedScoringSystem;
  private currentLevel: Level | null = null;
  private isRunning: boolean = false;
  private levelCompletionHandled: boolean = false;
  private lastSaucerConstraintY: number | undefined = undefined;

  // Saucer waiting scoring state
  private saucerWaitingScoringState: {
    isActive: boolean;
    lastScoringTime: number;
    scoringInterval: number; // 50ms = 1/20th second
  } = {
      isActive: false,
      lastScoringTime: 0,
      scoringInterval: 50, // 50ms = 1/20th second
    };

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
  private sessionTotalTime: number = 0; // Cumulative time across all completed levels in this session
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
    
    // Initialize power-up system with event-driven architecture
    this.powerUpEventSystem = new PowerUpEventSystem();
    this.powerUpManager = new PowerUpManager(this.powerUpEventSystem);
    this.powerUpEffects = new PowerUpEffects();
    this.powerUpDebugger = new PowerUpDebugger(
      this.powerUpManager,
      this.powerUpEffects,
      this.powerUpEventSystem,
      {
        showOverlay: false,
        showPerformanceStats: true,
        showEventHistory: true,
        showCacheStats: true,
        showValidation: true,
        logLevel: 'warn',
      },
    );
    
    // Setup power-up event callbacks
    this.setupPowerUpEventCallbacks();
    
    // Initialize point fly-off system
    this.pointFlyOffManager = new PointFlyOffManager();

    // Initialize unified scoring system
    this.unifiedScoringSystem = new UnifiedScoringSystem();

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
    logger.info('🎮 Circuit Breaker - Game initialized with enhanced power-up system', null, 'Game');
  }

  /**
   * Setup power-up event callbacks for integration with game systems
   */
  private setupPowerUpEventCallbacks(): void {
    this.powerUpEventSystem.registerGlobalCallbacks({
      onActivated: (data) => {
        // Apply physics effects when power-up is activated
        const context = this.createEffectContext();
        this.powerUpEffects.applyPhysicsEffects(data.type, context);
        
        // Play activation audio
        const config = getPowerUpConfig(data.type);
        if (config.audio.activation) {
          this.audioManager.playSound(config.audio.activation);
        }
        
        logger.info(`⚡ Power-up activated: ${data.type}`, null, 'Game');
      },
      
      onDeactivated: (data) => {
        // Remove physics effects when power-up is deactivated
        const context = this.createEffectContext();
        this.powerUpEffects.removePhysicsEffects(data.type, context);
        
        // Play deactivation audio
        const config = getPowerUpConfig(data.type);
        if (config.audio.deactivation) {
          this.audioManager.playSound(config.audio.deactivation);
        }
        
        logger.info(`⚡ Power-up deactivated: ${data.type}`, null, 'Game');
      },
      
      onExpired: (data) => {
        // Remove physics effects when power-up expires
        const context = this.createEffectContext();
        this.powerUpEffects.removePhysicsEffects(data.type, context);
        
        logger.info(`⚡ Power-up expired: ${data.type}`, null, 'Game');
      },
    });
  }

  /**
   * Create effect context for power-up effects
   */
  private createEffectContext(): EffectContext {
    let targetPosition: { x: number; y: number } | undefined;
    
    // Get goal hole position if available
    if (this.currentLevel) {
      const levelData = this.currentLevel.getLevelData();
      const goalHole = levelData.holes.find(hole => hole.isGoal);
      if (goalHole) {
        targetPosition = { x: goalHole.position.x, y: goalHole.position.y };
      }
    }

    return {
      physicsEngine: this.physicsEngine,
      tiltingBar: this.tiltingBar,
      currentTime: Date.now(),
      deltaTime: 16.67, // Approximate delta for 60fps
      targetPosition,
    };
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

      // Override physics engine's ball sinking check to detect sinking phase
      const originalIsBallSinking = this.physicsEngine.isBallSinking.bind(this.physicsEngine);
      this.physicsEngine.isBallSinking = (ballId: string) => {
        // Check if ball is in sinking phase
        if (this.currentLevel) {
          const levelData = this.currentLevel.getLevelData();
          for (const hole of levelData.holes) {
            if (hole.saucerState?.isActive && 
                hole.saucerState.ballId === ballId && 
                hole.saucerState.phase === 'sinking') {
              return true;
            }
          }
        }
        return originalIsBallSinking(ballId);
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
      this.inputManager.init(canvas, this.tiltingBar);

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
      this.currentLevel = this.levelManager.loadLevel(1, (soundName: string) => {
        this.audioManager.playSound(soundName);
      });
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
    // Start performance measurement for debugging
    this.powerUpDebugger.startFrameMeasurement();

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
        void this.startNewGame();
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

      // Handle how to play key (H key)
      if (this.inputManager.isKeyJustPressed('KeyH')) {
        logger.info('❓ Opening how to play screen...', null, 'Game');
        this.openHowToPlay();
        this.menuTimer = 0; // Reset timer
      }

      // Handle level reload key (F key) - for development
      if (this.inputManager.isKeyJustPressed('KeyF')) {
        logger.info('🔄 Force reloading levels from YAML files...', null, 'Game');
        void this.levelManager.forceReloadLevels();
        this.menuTimer = 0; // Reset timer
      }

      // Handle mouse clicks on How to Play button
      if (this.inputManager.isMouseJustPressed()) {
        const mousePos = this.inputManager.getMousePosition();
        if (mousePos) {
          // How to Play button bounds (matches the button drawn in renderMenu)
          const buttonX = 180 - 90; // buttonWidth / 2 = 180 / 2 = 90
          const buttonY = 460;
          const buttonWidth = 180;
          const buttonHeight = 40;
          
          if (mousePos.x >= buttonX && mousePos.x <= buttonX + buttonWidth &&
              mousePos.y >= buttonY && mousePos.y <= buttonY + buttonHeight) {
            logger.info('❓ Opening how to play screen via button click...', null, 'Game');
            this.openHowToPlay();
            this.menuTimer = 0; // Reset timer
            
            // Don't start the game if we clicked the How to Play button
            this.inputManager.endFrame();
            return;
          }
        }
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

    // Handle win screen input
    if (this.gameState.isWinScreen() && this.winScreen) {
      // Update win screen animation
      this.winScreen.update(deltaTime);
      
      // Handle keyboard input for win screen
      const keys = this.inputManager.getJustPressedKeys();
      for (const key of keys) {
        this.winScreen.handleInput(key);
      }

      // Handle mouse click to continue
      if (this.inputManager.isMouseJustPressed()) {
        this.winScreen.handleInput('Space'); // Treat mouse click as space
      }
    }

    // Handle how to play screen input
    if (this.gameState.isHowToPlay()) {
      // Handle escape key or backspace to return to menu
      if (this.inputManager.isActionJustPressed('pause') || this.inputManager.isKeyJustPressed('Backspace')) {
        logger.info('❓ Closing how to play screen...', null, 'Game');
        this.gameState.setState(GameStateType.MENU);
        this.audioManager.playSound('ui_click');
      }
      
      // Handle debug mode toggle
      if (this.inputManager.isKeyJustPressed('KeyD')) {
        this.gameState.toggleDebugMode();
        
        // Update physics engine debug mode to match
        this.physicsEngine.setDebug(this.gameState.isDebugMode());
        
        // Play UI click sound
        this.audioManager.playSound('ui_click');
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
      
      // Update physics effects for active power-ups
      const context = this.createEffectContext();
      context.deltaTime = deltaTime;
      this.powerUpEffects.updatePhysicsEffects(context);

      // Auto-save and check achievements during gameplay
      this.autoSave();
      this.checkAchievements();

      // Update achievement notification
      this.achievementNotification.update(deltaTime);
      
      // Update point fly-offs
      this.pointFlyOffManager.update(deltaTime);

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

      // Start the timer when player first moves the bar
      if (this.currentLevel && !this.currentLevel.hasTimerStarted() && (leftSideInput !== 0 || rightSideInput !== 0)) {
        this.currentLevel.startTimer();
        this.unifiedScoringSystem.startTimer(); // Also start unified scoring timer
      }

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

    // Handle debug input
    this.handleDebugInput();

    // End frame - update previous input state for next frame
    this.inputManager.endFrame();

    // End performance measurement for debugging
    this.powerUpDebugger.endFrameMeasurement();
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
        // BUT allow animated holes to be rendered even when not active for gameplay
        if (!hole.isActive && !hole.animationState?.isAnimated) continue;
        
        // Check if this goal hole has been completed
        const isCompleted =
          hole.isGoal && this.currentLevel
            ? this.currentLevel.isGoalCompleted(hole.id)
            : false;
        this.renderer.drawHole(hole, isCompleted, this.gameState.isDebugMode());
      }
      
      // Draw goal holes separately (they're stored in goalHoles array)
      for (const goalHole of levelData.goalHoles) {
        // Check if this goal hole has been completed
        const isCompleted = this.currentLevel
          ? this.currentLevel.isGoalCompleted(goalHole.id)
          : false;
        this.renderer.drawHole(goalHole, isCompleted, this.gameState.isDebugMode());
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
        // TOP LEFT: Level Points only (no labels)
        ctx.fillStyle = '#00f0ff'; // Electric Blue
        fontManager.setFont(ctx, 'primary', 12);
        ctx.textAlign = 'left';
        
        // Display current level points preview only
        const currentLevelStatus = this.unifiedScoringSystem.getCurrentLevelStatus();
        if (currentLevelStatus.isActive) {
          const levelPointsPreview = this.unifiedScoringSystem.getLevelPointsPreview(levelData.id);
          ctx.fillText(`${levelPointsPreview.toFixed(1)}`, 10, 20);
        } else {
          // Show maximum possible score when timer hasn't started
          const maxScore = this.unifiedScoringSystem.getMaxLevelScore(levelData.id);
          ctx.fillText(`${maxScore.toFixed(1)}`, 10, 20);
        }
        
        // CENTER TOP: Time (larger font, no label)
        ctx.textAlign = 'center';
        if (currentLevelStatus.isActive) {
          const rawTime = currentLevelStatus.rawTime;
          const minutes = Math.floor(rawTime / 60);
          const seconds = rawTime % 60;
          const timeDisplay = `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
          
          // Show time adjustments if any
          let adjustmentText = '';
          if (currentLevelStatus.timeReductions > 0 || currentLevelStatus.assistPenalties > 0) {
            adjustmentText = ` (${currentLevelStatus.timeReductions > 0 ? '-' + currentLevelStatus.timeReductions.toFixed(1) : ''}${currentLevelStatus.assistPenalties > 0 ? '+' + currentLevelStatus.assistPenalties.toFixed(1) : ''})`;
          }
          
          fontManager.setFont(ctx, 'primary', 24); // 50% larger font (16 * 1.5 = 24)
          ctx.fillText(`${timeDisplay}${adjustmentText}`, 180, 25);
        } else {
          fontManager.setFont(ctx, 'primary', 24); // 50% larger font (16 * 1.5 = 24)
          ctx.fillText('0:000.000', 180, 25);
        }
        
        // BOTTOM RIGHT: Lives
        ctx.textAlign = 'right';
        fontManager.setFont(ctx, 'primary', 12);
        ctx.fillText(`Lives: ${this.gameState.getStateData().lives}`, 350, 620);

        // Debug information (only visible in debug mode)
        if (this.gameState.isDebugMode()) {
          ctx.fillStyle = '#ffffff';
          fontManager.setFont(ctx, 'primary', 8);
          ctx.textAlign = 'left';
          
          // Show device detection info
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           window.innerWidth <= 768;
          ctx.fillText(`Device: ${isMobile ? 'Mobile' : 'Desktop'}`, 10, 95);
          ctx.fillText(`Window: ${window.innerWidth}x${window.innerHeight}`, 10, 110);
          
          try {
            const scalingManager = ScalingManager.getInstance();
            const currentScale = scalingManager.getCurrentScale();
            const config = scalingManager.getConfig();
            ctx.fillText(`Scale: ${currentScale.toFixed(2)}x (min: ${config.minScale})`, 10, 125);
            ctx.fillText(`ForceInt: ${config.forceIntegerScaling}`, 10, 140);
            
            // Show canvas size info
            const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
            if (canvas) {
              ctx.fillText(`Canvas: ${canvas.width}x${canvas.height}`, 10, 155);
              ctx.fillText(`Style: ${canvas.style.width} x ${canvas.style.height}`, 10, 170);
            }
          } catch (e) {
            ctx.fillText('Scale: Error', 10, 125);
          }

          // Touch indicator and control feedback
          const inputState = this.inputManager.getInputState();
          const leftInput = this.inputManager.getLeftSideInput();
          const rightInput = this.inputManager.getRightSideInput();
          
          // Show current side inputs
          ctx.fillText(`Left: ${leftInput.toFixed(2)} Right: ${rightInput.toFixed(2)}`, 260, 35);
          
          if (inputState.mouse.isDown) {
            // Main touch indicator
            ctx.fillStyle = '#00ff00'; // Green when touch/mouse is active
            ctx.fillRect(340, 10, 15, 15);
            ctx.fillStyle = '#ffffff';
            fontManager.setFont(ctx, 'primary', 8);
            ctx.textAlign = 'center';
            ctx.fillText('T', 347, 20);
            
            // Left side visual feedback
            if (leftInput !== 0) {
              ctx.fillStyle = leftInput > 0 ? '#00ff00' : '#ff6600'; // Green for up, orange for down
              ctx.fillRect(10, 180, 30, 15);
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText(leftInput > 0 ? 'L↑' : 'L↓', 25, 191);
            }
            
            // Right side visual feedback
            if (rightInput !== 0) {
              ctx.fillStyle = rightInput > 0 ? '#00ff00' : '#ff6600'; // Green for up, orange for down
              ctx.fillRect(320, 180, 30, 15);
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText(rightInput > 0 ? 'R↑' : 'R↓', 335, 191);
            }
            
            ctx.fillStyle = '#00f0ff'; // Reset color
            ctx.textAlign = 'left';
            ctx.fillText('Touch Above/Below Bar Sides', 260, 50);
            
            // Show scaling debug info
            try {
              const scalingManager = ScalingManager.getInstance();
              const currentScale = scalingManager.getCurrentScale();
              ctx.fillText(`Scale: ${currentScale.toFixed(2)}x`, 260, 65);
              ctx.fillText(`Screen: ${window.innerWidth}x${window.innerHeight}`, 10, 200);
            } catch (e) {
              ctx.fillText('Scale: Error', 260, 65);
            }
          } else {
            ctx.fillText('Touch Above/Below Bar to Control', 260, 50);
            
            // Show scaling debug info even when not touching
            try {
              const scalingManager = ScalingManager.getInstance();
              const currentScale = scalingManager.getCurrentScale();
              ctx.fillText(`Scale: ${currentScale.toFixed(2)}x`, 260, 65);
              ctx.fillText(`Screen: ${window.innerWidth}x${window.innerHeight}`, 10, 200);
            } catch (e) {
              ctx.fillText('Scale: Error', 260, 65);
            }
          }
        }

        // Debug info (only when debug mode is enabled)
        if (this.gameState.isDebugMode()) {
          ctx.fillText(
            `Progress: ${Math.round(this.currentLevel.getProgress() * 100)}%`,
            10,
            210,
          );

          // Show multi-goal progress
          const completedGoals = this.currentLevel.getCompletedGoals();
          const requiredGoals = this.currentLevel.getRequiredGoals();
          ctx.fillText(
            `Goals: ${completedGoals}/${requiredGoals} completed`,
            10,
            225,
          );

          if (completedGoals < requiredGoals) {
            ctx.fillText('Goal: Navigate to the glowing goal holes', 10, 240);
          } else {
            ctx.fillText('Goal: All goals completed! Level complete!', 10, 240);
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
          'SPACE: Start | Keys: A/Z (left) ↑/↓/L/, (right) | Touch: Above/Below Bar',
          180,
          580,
        );
        ctx.fillText(
          'Navigate upward to the goal holes - avoid falling into other holes!',
          180,
          595,
        );
        
        // Debug function keys
        ctx.fillStyle = '#ffaa00'; // Orange for debug info
        fontManager.setFont(ctx, 'primary', 8);
        ctx.fillText(
          'DEBUG: F1: Toggle Overlay | F2: Clear History | F3: Export | F4: Test Effects | W: Instant Win',
          180,
          610,
        );
      }
    }

    // Render power-up effects
    this.renderPowerUpEffects();

    // Render point fly-offs (score animations)
    const ctx = this.renderer.getContext();
    if (ctx) {
      this.pointFlyOffManager.render(ctx);
    }

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
   * Render power-up effects using the new system
   */
  private renderPowerUpEffects(): void {
    const ctx = this.renderer.getContext();
    if (!ctx) return;

    // Get active power-ups and visual effects
    const activePowerUps = this.powerUpManager.getActivePowerUps();
    const context = this.createEffectContext();
    const visualEffects = this.powerUpEffects.getVisualEffects(activePowerUps, context);

    // Render visual effects
    visualEffects.forEach(effect => {
      this.renderVisualEffect(ctx, effect);
    });

    // Render power-up HUD
    this.renderPowerUpHUD(ctx, activePowerUps);

    // Render debug overlay if enabled
    this.powerUpDebugger.render(ctx);
  }

  /**
   * Render individual visual effect
   */
  private renderVisualEffect(ctx: CanvasRenderingContext2D, effect: any): void {
    ctx.save();

    switch (effect.type) {
    case 'overlay':
      this.renderOverlayEffect(ctx, effect.data);
      break;
    case 'glow':
      this.renderGlowEffect(ctx, effect.data);
      break;
    case 'particle':
      this.renderParticleEffect(ctx, effect.data);
      break;
    case 'animation':
      this.renderAnimationEffect(ctx, effect.data);
      break;
    }

    ctx.restore();
  }

  /**
   * Render overlay visual effect
   */
  private renderOverlayEffect(ctx: CanvasRenderingContext2D, data: any): void {
    if (data.type === 'path_reveal' && data.path) {
      // Render path visualization for scan reveal
      ctx.strokeStyle = data.color || '#00ffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = data.opacity || 0.6;
      
      ctx.beginPath();
      data.path.forEach((point: any, index: number) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    } else {
      // Regular overlay
      ctx.fillStyle = data.color || 'rgba(0, 255, 255, 0.2)';
      ctx.globalAlpha = data.opacity || 0.3;
      
      if (data.pulse) {
        const intensity = data.currentIntensity || data.intensity || 1.0;
        ctx.globalAlpha *= intensity;
      }
      
      ctx.fillRect(0, 0, 360, 640);
    }
  }

  /**
   * Render glow visual effect
   */
  private renderGlowEffect(ctx: CanvasRenderingContext2D, data: any): void {
    let targetPosition = { x: 180, y: 320 }; // Default center
    
    // Get target object position
    if (data.target === 'ball') {
      const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
      if (ball) {
        targetPosition = ball.position;
      }
    } else if (data.target === 'hole' && this.currentLevel) {
      const levelData = this.currentLevel.getLevelData();
      const goalHole = levelData.holes.find(hole => hole.isGoal);
      if (goalHole) {
        targetPosition = { x: goalHole.position.x, y: goalHole.position.y };
      }
    } else if (data.target === 'bar') {
      targetPosition = this.tiltingBar.position;
    }

    // Render glow effect
    const intensity = data.currentIntensity || data.intensity || 1.0;
    const radius = (data.radius || 30) * intensity;
    
    const gradient = ctx.createRadialGradient(
      targetPosition.x, targetPosition.y, 0,
      targetPosition.x, targetPosition.y, radius,
    );
    
    gradient.addColorStop(0, data.color || '#ffffff');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = intensity * 0.5;
    ctx.fillRect(
      targetPosition.x - radius,
      targetPosition.y - radius,
      radius * 2,
      radius * 2,
    );
  }

  /**
   * Render particle visual effect
   */
  private renderParticleEffect(ctx: CanvasRenderingContext2D, data: any): void {
    // Simple particle rendering - can be enhanced
    if (data.type === 'electric_arc' && data.from === 'ball' && data.to === 'hole') {
      const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
      let holePosition = { x: 180, y: 50 };
      
      if (this.currentLevel) {
        const levelData = this.currentLevel.getLevelData();
        const goalHole = levelData.holes.find(hole => hole.isGoal);
        if (goalHole) {
          holePosition = { x: goalHole.position.x, y: goalHole.position.y };
        }
      }
      
      if (ball) {
        // Draw electric arc lines
        ctx.strokeStyle = data.color || '#ff00ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        for (let i = 0; i < (data.count || 3); i++) {
          const offset = (Math.random() - 0.5) * 20;
          ctx.beginPath();
          ctx.moveTo(ball.position.x + offset, ball.position.y + offset);
          ctx.lineTo(holePosition.x - offset, holePosition.y - offset);
          ctx.stroke();
        }
      }
    }
  }

  /**
   * Render animation visual effect
   */
  private renderAnimationEffect(ctx: CanvasRenderingContext2D, data: any): void {
    if (data.type === 'scan_bar') {
      // Render scanning animation
      const time = Date.now() * (data.speed || 2.0) * 0.001;
      const scanY = (Math.sin(time) * 0.5 + 0.5) * 640;
      
      ctx.strokeStyle = data.color || '#00ffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(360, scanY);
      ctx.stroke();
    }
  }

  /**
   * Render power-up HUD
   */
  private renderPowerUpHUD(ctx: CanvasRenderingContext2D, activePowerUps: Map<PowerUpType, any>): void {
    const powerUpSprites = {
      [PowerUpType.SLOW_MO_SURGE]: 'hourglass', // Time bonus sprite (use primary for HUD)
      [PowerUpType.MAGNETIC_GUIDE]: 'magnet',
      [PowerUpType.CIRCUIT_PATCH]: 'chip',
      [PowerUpType.OVERCLOCK_BOOST]: 'starburst',
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
   * Handle ball falling off screen
   */
  private handleBallFallOff(): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    
    if (ball && this.powerUpEffects.shouldUseShield(ball.position, { width: 360, height: 640 })) {
      // Try to use shield
      if (this.powerUpManager.useShield()) {
        logger.info('🛡️ Shield protected ball from falling!', null, 'Game');
        this.audioManager.playSound('shield_used');
        
        // Reset ball to safe position
        this.placeBallOnBar();
        return;
      }
    }

    logger.warn('💀 Ball fell off screen!', null, 'Game');
    
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

      // Reset for next attempt
      this.placeBallOnBar();
    } else {
      // Game over
      this.handleGameOver();
    }
  }

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

    this.currentLevel = this.levelManager.loadLevel(levelId, (soundName: string) => {
      this.audioManager.playSound(soundName);
    });
    if (this.currentLevel) {
      this.currentLevel.start();
      this.gameState.updateStateData({ currentLevel: levelId });
      this.levelCompletionHandled = false; // Reset completion flag for new level

      // Start unified scoring system timer for this level
      this.unifiedScoringSystem.startLevel(levelId);

      // Reset tilting bar to starting position
      this.tiltingBar.reset();

      // Reset ball to starting position on the bar
      this.placeBallOnBar();

      logger.info(`🎯 Level ${levelId} loaded and started`, null, 'Game');
    }
  }

  /**
   * Get power-up manager (for external access)
   */
  public getPowerUpManager(): PowerUpManager {
    return this.powerUpManager;
  }

  /**
   * Get power-up effects system (for external access)
   */
  public getPowerUpEffects(): PowerUpEffects {
    return this.powerUpEffects;
  }

  /**
   * Get power-up event system (for external access)
   */
  public getPowerUpEventSystem(): PowerUpEventSystem {
    return this.powerUpEventSystem;
  }

  /**
   * Get power-up debugger (for external access)
   */
  public getPowerUpDebugger(): PowerUpDebugger {
    return this.powerUpDebugger;
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

    // Show point fly-off animation above ball
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (ball) {
      this.pointFlyOffManager.showGoalHit(500, ball.position);
    }

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
    const isAnimatedHole = hole.animationState?.isAnimated;
    
    if (isPowerUpHole) {
      // Start saucer behavior instead of immediate collection
      if (this.currentLevel) {
        this.currentLevel.startSaucerBehavior(hole.id, 'game-ball', Date.now());
        this.handlePowerUpHoleCollection(hole);
      }
    } else if (isAnimatedHole) {
      // Animated hole - same as regular hole but with special effects
      this.audioManager.playSound('zap');
      
      // Apply time bonus for animated holes (they're trickier to navigate)
      this.applyRegularHoleTimeBonus(hole, true);
      
      // Reset tilting bar to starting position
      this.tiltingBar.reset();
      logger.info('🔄 Bar reset to starting position after ball fell into animated hole', null, 'Game');
      
      // Start hole animation with special flag for animated holes
      this.startHoleAnimation('game-ball', hole.position, false, true);
      
      // Force the animated hole to animate out early (will cycle back after hidden phase)
      if (hole.animationState) {
        hole.animationState.phase = 'animating_out';
        hole.animationState.startTime = Date.now();
        hole.isActive = false;
        logger.info(`🌟 Animated hole forced to animate out after ball collision: ${hole.id}`, null, 'Game');
      }
    } else {
      // Regular hole - play falling sound, reset bar, and start animation
      this.audioManager.playSound('zap');
      
      // Apply time bonus for regular holes
      this.applyRegularHoleTimeBonus(hole, false);
      
      // Reset tilting bar to starting position
      this.tiltingBar.reset();
      logger.info('🔄 Bar reset to starting position after ball fell into hole', null, 'Game');
      
      this.startHoleAnimation('game-ball', hole.position, false, false);
    }
  }

  /**
   * Update saucer behavior and kick balls when ready
   */
  private updateSaucerBehavior(): void {
    if (!this.currentLevel) return;

    // Check if any ball is in a saucer and update height constraints
    this.updateSaucerHeightConstraints();

    // Update saucer waiting scoring system
    this.updateSaucerWaitingScoring();

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

    // Clear height constraint when ball leaves saucer
    this.tiltingBar.clearSaucerHeightConstraint();

    // Apply kick force to ball
    const kickVelocity = {
      x: kickData.direction.x * kickData.force,
      y: kickData.direction.y * kickData.force,
    };

    // Update ball physics
    ball.previousPosition.x = ball.position.x - kickVelocity.x * 0.016; // 60fps
    ball.previousPosition.y = ball.position.y - kickVelocity.y * 0.016;

    // Play kick sound
    this.audioManager.playSound('powerup_collect');

    logger.info(`🚀 Ball kicked from saucer with force: ${kickData.force} from hole: ${kickData.holeId}`, null, 'Game');
  }

  /**
   * Update height constraints based on saucer ball positions
   */
  private updateSaucerHeightConstraints(): void {
    if (!this.currentLevel) return;

    // Check if any ball is in a saucer
    let ballInSaucer = false;
    let saucerBallY = 0;

    // Find the game ball
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (!ball) return;

    // Check all holes for active saucer states
    const holes = this.currentLevel.getHoles();
    for (const hole of holes) {
      if (hole.saucerState?.isActive && hole.saucerState.ballId === 'game-ball') {
        ballInSaucer = true;
        
        // Get ball position during saucer interaction
        const saucerPosition = this.currentLevel.getSaucerBallPosition(hole.id);
        if (saucerPosition) {
          saucerBallY = saucerPosition.y;
        } else {
          // Fallback to hole position if saucer position not available
          saucerBallY = hole.position.y;
        }
        break;
      }
    }

    // Set or clear height constraint based on saucer state
    if (ballInSaucer) {
      // Only update constraint if ball position has changed significantly
      if (!this.tiltingBar.hasSaucerHeightConstraint() || 
          Math.abs(saucerBallY - (this.lastSaucerConstraintY || 0)) > 2) {
        this.tiltingBar.setSaucerHeightConstraint(saucerBallY);
        this.lastSaucerConstraintY = saucerBallY;
      }
    } else {
      // Clear constraint if no ball in saucer
      if (this.tiltingBar.hasSaucerHeightConstraint()) {
        this.tiltingBar.clearSaucerHeightConstraint();
        this.lastSaucerConstraintY = undefined;
      }
    }
  }

  /**
   * Update saucer waiting scoring system
   */
  private updateSaucerWaitingScoring(): void {
    if (!this.currentLevel) return;

    const currentTime = Date.now();
    
    // Check if any ball is in a saucer waiting phase
    let ballInWaitingPhase = false;
    let ballPosition: { x: number; y: number } | null = null;

    // Find the game ball
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    if (!ball) return;

    // Check all holes for active saucer states in waiting phase
    const holes = this.currentLevel.getHoles();
    for (const hole of holes) {
      if (hole.saucerState?.isActive && 
          hole.saucerState.ballId === 'game-ball' && 
          hole.saucerState.phase === 'waiting') {
        ballInWaitingPhase = true;
        ballPosition = this.currentLevel.getSaucerBallPosition(hole.id);
        break;
      }
    }

    // Update scoring state
    if (ballInWaitingPhase) {
      if (!this.saucerWaitingScoringState.isActive) {
        // Start scoring
        this.saucerWaitingScoringState.isActive = true;
        this.saucerWaitingScoringState.lastScoringTime = currentTime;
        logger.info('🎯 Started saucer waiting scoring', null, 'Game');
      }

      // Check if it's time to award points
      if (currentTime - this.saucerWaitingScoringState.lastScoringTime >= this.saucerWaitingScoringState.scoringInterval) {
        // Award 1000 points (1 point * 1000 multiplier from unified scoring)
        const points = 1000;
        
        // Add to legacy score for compatibility
        const currentScore = this.gameState.getStateData().score;
        this.gameState.updateStateData({ score: currentScore + points });

        // Add to unified scoring system as bonus points
        this.unifiedScoringSystem.addBonusPoints(points);

        // Create cascade flyoff animation from top of ball (show +1 for user experience)
        if (ballPosition) {
          this.createSaucerWaitingFlyoff(1, ballPosition); // Show +1 in flyoff for better UX
        }

        // Play satisfying slot machine-style audio feedback
        this.audioManager.playSound('target', 0.6, 1.3); // More satisfying "ding" sound

        // Update scoring state
        this.saucerWaitingScoringState.lastScoringTime = currentTime;

        logger.debug(`🎯 Awarded ${points} points for saucer waiting`, null, 'Game');
      }
    } else {
      // Clear scoring state if no longer in waiting phase
      if (this.saucerWaitingScoringState.isActive) {
        this.saucerWaitingScoringState.isActive = false;
        logger.info('🎯 Stopped saucer waiting scoring', null, 'Game');
      }
    }
  }

  /**
   * Create cascade flyoff animation for saucer waiting scoring
   */
  private createSaucerWaitingFlyoff(points: number, ballPosition: { x: number; y: number }): void {
    // Create flyoff position at the top of the ball - always from the same spot
    const ballRadius = 12; // Approximate ball radius
    
    // Position flyoffs coming from the top of the ball with slight random spread
    const flyoffPosition = {
      x: ballPosition.x + (Math.random() - 0.5) * 16, // Small random horizontal spread
      y: ballPosition.y - ballRadius + (Math.random() - 0.5) * 8, // Slight random vertical variation around ball top
    };

    // Use the new saucer waiting flyoff method with custom color #00d26a
    this.pointFlyOffManager.showSaucerWaiting(points, flyoffPosition);

    logger.debug(`✨ Created saucer waiting flyoff: +${points} at (${flyoffPosition.x}, ${flyoffPosition.y})`, null, 'Game');
  }

  /**
   * Handle power-up hole collection
   */
  private handlePowerUpHoleCollection(hole: Hole): void {
    if (!hole.powerUpType) return;

    logger.info(`🎁 Power-up collected from hole: ${hole.powerUpType}`, null, 'Game');

    // Add charge to the power-up
    this.powerUpManager.addCharges(hole.powerUpType, 1);

    // Get ball position for fly-off animation
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball');
    const ballPosition = ball ? { x: ball.position.x, y: ball.position.y } : undefined;

    // Apply time bonus if power-up provides one
    this.applyPowerUpTimeBonus(hole, ballPosition);

    // Show appropriate fly-off animation based on sprite type
    const spriteName = this.getPowerUpSpriteName(hole.powerUpType, hole.id);
    if (this.isTimeBonusSprite(spriteName)) {
      // For time bonus sprites (hourglass/hourglass_alt), only show time bonus fly-off
      // Don't show regular power-up collection fly-off
    } else {
      // For other power-ups, show regular power-up collection fly-off
      const powerUpPoints = 100; // Base points for power-up collection
      const powerUpColor = this.getPowerUpColor(hole.powerUpType);
      this.pointFlyOffManager.showPowerUpCollect(
        powerUpPoints,
        hole.position,
        powerUpColor,
      );
    }

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
   * Get the sprite name for a power-up hole
   */
  private getPowerUpSpriteName(powerUpType: PowerUpType, holeId: string): string {
    const powerUpSprites = {
      'SLOW_MO_SURGE': ['hourglass', 'hourglass_alt'], // Time bonus sprites
      'MAGNETIC_GUIDE': ['magnet', 'magnet_alt', 'hourglass_alt'], // Occasionally time bonus
      'CIRCUIT_PATCH': ['chip', 'chip_alt'],
      'OVERCLOCK_BOOST': ['starburst', 'starburst_alt', 'hourglass'], // Occasionally time bonus
      'SCAN_REVEAL': ['eye', 'eye_alt'],
    };
    
    // Select sprite based on hole ID for consistent randomization
    const sprites = powerUpSprites[powerUpType as unknown as keyof typeof powerUpSprites] || ['vortex'];
    const spriteIndex = holeId.charCodeAt(holeId.length - 1) % sprites.length;
    return sprites[spriteIndex];
  }

  /**
   * Check if a sprite grants time bonus (hourglass or hourglass_alt)
   */
  private isTimeBonusSprite(spriteName: string): boolean {
    return spriteName === 'hourglass' || spriteName === 'hourglass_alt';
  }

  /**
   * Apply time bonus for specific power-up types
   */
  private applyPowerUpTimeBonus(hole: Hole, ballPosition?: { x: number; y: number }): void {
    if (!hole.powerUpType) return;

    // Get the sprite name for this specific hole
    const spriteName = this.getPowerUpSpriteName(hole.powerUpType, hole.id);
    
    // Check if this sprite grants time bonus
    if (this.isTimeBonusSprite(spriteName)) {
      // 3 seconds bonus for hourglass/hourglass_alt sprites - this is a time reduction
      const timeBonus = 3.0;
      this.unifiedScoringSystem.addTimeReduction(timeBonus);
      logger.info(`⏰ Time reduction applied: -${timeBonus}s from ${hole.powerUpType} (${spriteName} sprite)`, null, 'Game');
      
      // Show time bonus fly-off for time bonus sprites
      if (ballPosition) {
        this.pointFlyOffManager.showTimeBonus(timeBonus, ballPosition);
      }
    } else {
      // Check if this is an assist power-up that should add time penalty
      const assistPenalties: { [key in PowerUpType]?: number } = {
        [PowerUpType.SLOW_MO_SURGE]: 2.0,      // 2 seconds penalty for slow-mo assistance
        [PowerUpType.MAGNETIC_GUIDE]: 2.0,     // 2 seconds penalty for magnetic guidance
      };
      
      const timePenalty = assistPenalties[hole.powerUpType];
      if (timePenalty) {
        this.unifiedScoringSystem.addAssistPenalty(timePenalty);
        logger.info(`⚖️ Assist penalty applied: +${timePenalty}s from ${hole.powerUpType}`, null, 'Game');
      }
      
      // Regular time reductions for other power-ups
      const regularTimeReductions: { [key in PowerUpType]?: number } = {
        [PowerUpType.CIRCUIT_PATCH]: 1.0,      // 1 second reduction (shield is valuable)
        [PowerUpType.OVERCLOCK_BOOST]: 0.5,    // 0.5 seconds reduction
        [PowerUpType.SCAN_REVEAL]: 0.5,        // 0.5 seconds reduction
      };
      
      const timeReduction = regularTimeReductions[hole.powerUpType];
      if (timeReduction) {
        this.unifiedScoringSystem.addTimeReduction(timeReduction);
        logger.info(`⏰ Time reduction applied: -${timeReduction}s from ${hole.powerUpType}`, null, 'Game');
      }
    }
  }

  /**
   * Apply time bonus for regular holes and animated holes
   */
  private applyRegularHoleTimeBonus(hole: Hole, isAnimated: boolean): void {
    // Time reductions for regular holes (smaller bonuses since they're more common)
    const timeReduction = isAnimated ? 0.3 : 0.1; // Animated holes give more bonus
    
    this.unifiedScoringSystem.addTimeReduction(timeReduction);
    const holeType = isAnimated ? 'animated hole' : 'regular hole';
    logger.info(`⏰ Time reduction applied: -${timeReduction}s from ${holeType} (${hole.id})`, null, 'Game');
  }



  /**
   * Handle level completion
   */
  private handleLevelComplete(): void {
    if (!this.currentLevel) return;

    logger.info('🏆 Level completed!', null, 'Game');

    // Get level completion data
    const levelId = this.currentLevel.getLevelData().id;
    
    // Complete level in unified scoring system
    const levelScoreData = this.unifiedScoringSystem.completeLevel(levelId);
    
    // Add level time to session total (keep for compatibility)
    this.sessionTotalTime += levelScoreData.rawTime * 1000; // Convert to milliseconds

    // Record level complete event with new scoring data
    this.statsManager.recordEvent({
      type: 'level_complete',
      timestamp: Date.now(),
      data: { 
        levelId,
        score: levelScoreData.levelPoints,
        completionTime: levelScoreData.rawTime * 1000, // Convert to milliseconds
        baseLevelValue: levelScoreData.baseLevelValue,
        adjustedTime: levelScoreData.adjustedTime,
        timeReductions: levelScoreData.timeReductions,
        assistPenalties: levelScoreData.assistPenalties,
      },
    });

    // Update game progress
    this.gameProgress.completedLevels.add(levelId);
    this.gameProgress.highestLevel = Math.max(this.gameProgress.highestLevel, levelId);

    // Update game state with new scoring data
    this.gameState.addLevelScore(levelScoreData);
    
    // Update legacy score for compatibility
    const currentScore = this.gameState.getStateData().score;
    this.gameState.updateStateData({ 
      score: currentScore + Math.floor(levelScoreData.levelPoints),
      totalScore: this.unifiedScoringSystem.getCurrentTotalScore(),
    });

    // Play level completion sound
    this.audioManager.playSound('level_complete');

    // Show level completion fly-off animation in center of screen
    this.pointFlyOffManager.showLevelComplete(
      levelScoreData.levelPoints,
      { x: 180, y: 320 }, // Center of 360x640 screen
    );

    logger.info(`🎉 Level Points: ${levelScoreData.levelPoints.toFixed(2)} (${levelScoreData.baseLevelValue}/${levelScoreData.adjustedTime.toFixed(2)}s)`, null, 'Game');

    // Move to next level
    const nextLevelId = this.currentLevel.getLevelData().id + 1;
    this.levelManager.unlockLevel(nextLevelId);

    // Create and show win screen with new scoring data
    this.winScreen = new WinScreen({
      onContinue: () => this.handleWinScreenContinue(),
      levelTime: levelScoreData.rawTime * 1000, // Convert to milliseconds
      sessionTotal: this.sessionTotalTime,
      levelId: levelId,
      score: levelScoreData.levelPoints,
      levelScoreData: levelScoreData,
      totalScore: this.unifiedScoringSystem.getCurrentTotalScore(),
    });

    // Change to win screen state
    this.gameState.setState(GameStateType.WIN_SCREEN);

    logger.info(`🏆 Level ${levelId} completed! Total Score: ${this.unifiedScoringSystem.getCurrentTotalScore().toFixed(2)} - Showing win screen...`, null, 'Game');
  }

  /**
   * Handle continue from win screen
   */
  private handleWinScreenContinue(): void {
    this.winScreen = null;

    if (!this.currentLevel) return;

    // Get next level ID
    const nextLevelId = this.currentLevel.getLevelData().id + 1;

    // Load next level or show completion
    if (this.levelManager.getLevelData(nextLevelId)) {
      // Set game state back to playing before loading next level
      this.gameState.setState(GameStateType.PLAYING);
      this.loadNextLevel(nextLevelId);
      logger.info(`🎮 Continuing to Level ${nextLevelId}`, null, 'Game');
    } else {
      this.handleGameComplete();
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
  private async startNewGame(): Promise<void> {
    logger.info('🎮 Starting new game...', null, 'Game');

    // Record game start event
    this.statsManager.recordEvent({
      type: 'game_start',
      timestamp: Date.now(),
    });

    // Update game progress
    this.gameProgress.gamesPlayed++;
    this.sessionStartTime = Date.now();
    this.sessionTotalTime = 0; // Reset session total time for new game

    // Start new scoring session
    this.unifiedScoringSystem.startNewSession();

    // Reset game state
    this.gameState.setState(GameStateType.PLAYING);
    this.gameState.updateStateData({
      currentLevel: 1,
      score: 0,
      totalScore: 0,
      lives: 3,
    });

    // Regenerate all levels for fresh layouts each run
    await this.levelManager.regenerateLevels();

    // Load first level
    this.currentLevel = this.levelManager.loadLevel(1, (soundName: string) => {
      this.audioManager.playSound(soundName);
    });
    if (this.currentLevel) {
      this.currentLevel.start();
      this.levelCompletionHandled = false;
      
      // Start unified scoring system timer for this level
      this.unifiedScoringSystem.startLevel(1);
      
      logger.info('🎯 Level 1 loaded and started', null, 'Game');
    }

    // Reset tilting bar to starting position (this also clears saucer constraints)
    this.tiltingBar.reset();
    this.lastSaucerConstraintY = undefined;

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
      this.currentLevel = this.levelManager.loadLevel(1, (soundName: string) => {
        this.audioManager.playSound(soundName);
      });

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
      void this.startNewGame();
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
    
    // Start new game (this will regenerate levels)
    void this.startNewGame();
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

  /**
   * Open how to play screen
   */
  public openHowToPlay(): void {
    logger.info('❓ Opening how to play screen...', null, 'Game');
    this.gameState.setState(GameStateType.HOW_TO_PLAY);
    this.audioManager.playSound('ui_click');
  }

  /**
   * Handle debug input for power-up system
   */
  private handleDebugInput(): void {
    // Only allow debug functions when debug mode is enabled
    if (!this.gameState.isDebugMode()) return;

    // Toggle debug overlay with F1
    if (this.inputManager.isKeyJustPressed('F1')) {
      this.powerUpDebugger.toggle();
    }

    // Clear debug history with F2
    if (this.inputManager.isKeyJustPressed('F2')) {
      this.powerUpDebugger.clearHistory();
    }

    // Export debug data with F3
    if (this.inputManager.isKeyJustPressed('F3')) {
      const debugData = this.powerUpDebugger.exportDebugData();
      console.log('🔧 Debug Data Export:', debugData);
    }

    // Test point fly-offs with F4
    if (this.inputManager.isKeyJustPressed('F4')) {
      this.testPointFlyOffs();
    }

    // Instant win current level with W key (only during gameplay)
    if (this.inputManager.isKeyJustPressed('KeyW') && this.gameState.isPlaying()) {
      this.debugInstantWin();
    }
  }

  /**
   * Debug function: Instantly win the current level (W key)
   */
  private debugInstantWin(): void {
    if (!this.currentLevel) {
      logger.warn('🧪 DEBUG: No current level to complete', null, 'Game');
      return;
    }

    if (this.currentLevel.checkLevelComplete()) {
      logger.warn('🧪 DEBUG: Level is already completed', null, 'Game');
      return;
    }

    logger.info('🧪 DEBUG: Force completing current level...', null, 'Game');

    // Ensure scoring system is started for this level
    const levelId = this.currentLevel.getLevelData().id;
    this.unifiedScoringSystem.startLevel(levelId);
    this.unifiedScoringSystem.startTimer();

    // Ensure the level is started and timer is running (simulate first input)
    this.currentLevel.start();
    this.currentLevel.startTimer();

    // Force complete the level
    this.currentLevel.debugForceComplete();

    // Play completion sound
    this.audioManager.playSound('level_complete');

    // Trigger the level completion handling
    if (!this.levelCompletionHandled) {
      this.levelCompletionHandled = true;
      this.handleLevelComplete();
    }
  }

  /**
   * Check if a ball is currently in a saucer waiting state
   */
  public getBallSpriteForSaucerState(ballId: string): string {
    if (!this.currentLevel) return 'ball_normal';
    
    // Check if ball is in a saucer
    const holes = this.currentLevel.getHoles();
    for (const hole of holes) {
      if (hole.saucerState?.isActive && 
          hole.saucerState.ballId === ballId && 
          hole.saucerState.phase === 'waiting') {
        return 'ball_saucer';
      }
    }
    
    return 'ball_normal';
  }

  /**
   * Test point fly-offs with various animations (debug function)
   */
  private testPointFlyOffs(): void {
    logger.info('🧪 Testing point fly-offs...', null, 'Game');
    
    // Test different fly-off types at various positions
    const testPositions = [
      { x: 100, y: 200 },
      { x: 180, y: 300 },
      { x: 260, y: 400 },
      { x: 50, y: 500 },
      { x: 310, y: 150 },
    ];

    // Test goal hit
    this.pointFlyOffManager.showGoalHit(500, testPositions[0]);
    
    // Test power-up collection with different colors
    this.pointFlyOffManager.showPowerUpCollect(100, testPositions[1], '#ff6600');
    this.pointFlyOffManager.showPowerUpCollect(150, testPositions[2], '#00ff88');
    
    // Test level complete
    this.pointFlyOffManager.showLevelComplete(1000, testPositions[3]);
    
    // Test bonus and achievement
    this.pointFlyOffManager.showBonus(250, testPositions[4]);
    this.pointFlyOffManager.showAchievement(750, { x: 180, y: 100 });
    
    // Test combo
    this.pointFlyOffManager.showCombo(300, { x: 280, y: 350 }, 2);
    
    logger.info('🧪 Point fly-offs test completed', null, 'Game');
  }

  /**
   * Get the appropriate color for a power-up type for fly-off animations
   */
  private getPowerUpColor(powerUpType: PowerUpType): string {
    switch (powerUpType) {
    case PowerUpType.SLOW_MO_SURGE:
      return '#00ffff'; // Cyan
    case PowerUpType.MAGNETIC_GUIDE:
      return '#ff00ff'; // Magenta
    case PowerUpType.CIRCUIT_PATCH:
      return '#00ff00'; // Green
    case PowerUpType.OVERCLOCK_BOOST:
      return '#ffaa00'; // Orange
    case PowerUpType.SCAN_REVEAL:
      return '#ffff00'; // Yellow
    default:
      return '#ff6600'; // Default orange
    }
  }

  /**
   * Handle scale changes from the ScalingManager
   */
  public onScaleChanged(newScale: number): void {
    logger.debug(`🔄 Game scale changed to ${newScale}x`, null, 'Game');
    
    // Update canvas dimensions in renderer if needed
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas && this.renderer) {
      this.renderer.resize(canvas.width, canvas.height);
    }
    
    // Additional scale change handling can be added here
    // For example, updating UI elements or recalculating positions
  }

  /**
   * Get current audio levels for visualization
   */
  public getAudioLevel(): number {
    return this.audioManager.getAudioLevel();
  }
}

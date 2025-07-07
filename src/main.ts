// Circuit Breaker - Main Entry Point
// A neon cyberpunk arcade game where players guide data packets through circuit boards

import './style.css';
import { Game } from './core/Game';
import { logger } from './utils/Logger';
import { ScalingManager } from './utils/ScalingManager';

// Global game instance
let game: Game | null = null;
let scalingManager: ScalingManager | null = null;

/**
 * Initialize the game when DOM is ready
 */
async function initGame(): Promise<void> {
  try {
    logger.info('🚀 Circuit Breaker - Loading...', null, 'Main');

    // Create canvas element
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
      throw new Error('Game container not found');
    }

    // Initialize scaling manager with game's base dimensions
    // Detect if we're on a mobile device for better scaling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    
    scalingManager = ScalingManager.getInstance({
      baseWidth: 360,  // Game's base width (9:16 aspect ratio)
      baseHeight: 640, // Game's base height
      minScale: isMobile ? 0.5 : 1,     // Allow smaller scaling on mobile for better fit
      maxScale: 8,     // Maximum scale factor (for very large displays)
      forceIntegerScaling: !isMobile, // Allow fractional scaling on mobile for better screen utilization
    });
    
    logger.debug(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}, Scaling config: minScale=${isMobile ? 0.5 : 1}, forceInteger=${!isMobile}`, null, 'Main');

    // Clear loading message and create canvas
    gameContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    gameContainer.appendChild(canvas);

    // Apply dynamic scaling to the canvas
    scalingManager.applyScaling(canvas, gameContainer);

    // Create game instance
    game = new Game();

    // Initialize game systems (this will initialize the renderer and load sprites)
    await game.init();

    // Start the game
    game.start();

    // Setup resize handling
    setupScalingCallbacks();

    // Expose game instance to window for testing
    (window as any).game = game;
    (window as any).scalingManager = scalingManager;

    logger.info('✅ Circuit Breaker loaded successfully', null, 'Main');
  } catch (error) {
    logger.error('❌ Failed to load Circuit Breaker:', error, 'Main');
    showErrorMessage('Failed to load game. Please refresh the page.');
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message: string): void {
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.innerHTML = `
      <div style="text-align: center; color: #b600f9;">
        <h1>Circuit Breaker</h1>
        <p>Error: ${message}</p>
        <p>Please refresh the page to try again.</p>
      </div>
    `;
  }
}

/**
 * Setup scaling callbacks for dynamic resize handling
 */
function setupScalingCallbacks(): void {
  if (!scalingManager) return;

  scalingManager.onResize((scaling) => {
    logger.debug(`📱 Window resized - applying ${scaling.scale}x scaling`, null, 'Main');
    
    // Get canvas and container
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const gameContainer = document.getElementById('game-container');
    
    if (canvas && gameContainer) {
      // Reapply scaling to canvas
      scalingManager!.applyScaling(canvas, gameContainer);
      
      // Notify game of scale change if needed
      if (game) {
        game.onScaleChanged?.(scaling.scale);
      }
    }
  });
}

/**
 * Handle window resize
 */
function handleResize(): void {
  // The ScalingManager handles resize automatically through its event listeners
  // This function is kept for compatibility but the actual work is done in setupScalingCallbacks
  logger.debug('📱 Window resize event triggered', null, 'Main');
}

/**
 * Handle page visibility change
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    logger.debug('👁️ Page hidden - pausing game', null, 'Main');
    game?.pause();
  } else {
    logger.debug('👁️ Page visible - resuming game', null, 'Main');
    game?.resume();
  }
}

/**
 * Handle before unload
 */
function handleBeforeUnload(): void {
  logger.debug('👋 Page unloading - stopping game', null, 'Main');
  game?.stop();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

// Add event listeners
window.addEventListener('resize', handleResize);
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('beforeunload', handleBeforeUnload);

// Export for debugging
export { game };

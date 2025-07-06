// Circuit Breaker - Main Entry Point
// A neon cyberpunk arcade game where players guide data packets through circuit boards

import './style.css';
import { Game } from './core/Game';
import { Renderer } from './rendering/Renderer';
import { logger } from './utils/Logger';

// Global game instance
let game: Game | null = null;
let renderer: Renderer | null = null;

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

    // Clear loading message and create canvas
    gameContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = 360; // 9:16 aspect ratio (mobile portrait)
    canvas.height = 640;
    gameContainer.appendChild(canvas);

    // Initialize renderer
    renderer = new Renderer();
    renderer.init(canvas);

    // Create game instance
    game = new Game();

    // Initialize game systems
    await game.init();

    // Start the game
    game.start();

    // Expose game instance to window for testing
    (window as any).game = game;

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
 * Handle window resize
 */
function handleResize(): void {
  // TODO: Handle canvas resize and UI adjustments
  logger.debug('📱 Window resized', null, 'Main');
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

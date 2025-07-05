// Circuit Breaker - Main Entry Point
// A neon cyberpunk arcade game where players guide data packets through circuit boards

import './style.css'
import { Game } from './core/Game'

// Global game instance
let game: Game | null = null

/**
 * Initialize the game when DOM is ready
 */
async function initGame(): Promise<void> {
  try {
    console.log('🚀 Circuit Breaker - Loading...')

    // Create game instance
    game = new Game()

    // Initialize game systems
    await game.init()

    // Start the game
    game.start()

    console.log('✅ Circuit Breaker loaded successfully')
  } catch (error) {
    console.error('❌ Failed to load Circuit Breaker:', error)
    showErrorMessage('Failed to load game. Please refresh the page.')
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message: string): void {
  const gameContainer = document.getElementById('game-container')
  if (gameContainer) {
    gameContainer.innerHTML = `
      <div style="text-align: center; color: #ff0066;">
        <h1>Circuit Breaker</h1>
        <p>Error: ${message}</p>
        <p>Please refresh the page to try again.</p>
      </div>
    `
  }
}

/**
 * Handle window resize
 */
function handleResize(): void {
  // TODO: Handle canvas resize and UI adjustments
  console.log('📱 Window resized')
}

/**
 * Handle page visibility change
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    console.log('👁️ Page hidden - pausing game')
    game?.pause()
  } else {
    console.log('👁️ Page visible - resuming game')
    game?.resume()
  }
}

/**
 * Handle before unload
 */
function handleBeforeUnload(): void {
  console.log('👋 Page unloading - stopping game')
  game?.stop()
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame)
} else {
  initGame()
}

// Add event listeners
window.addEventListener('resize', handleResize)
document.addEventListener('visibilitychange', handleVisibilityChange)
window.addEventListener('beforeunload', handleBeforeUnload)

// Export for debugging
export { game } 
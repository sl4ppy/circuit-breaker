// Circuit Breaker - Main Game Class
// Handles game state management and core game loop

import { GameState, GameStateType } from './GameState'
import { GameLoop } from './GameLoop'
import { Renderer } from '../rendering/Renderer'
import { PhysicsEngine } from '../physics/PhysicsEngine'
import { TiltingBar } from './TiltingBar'
import { InputManager } from '../input/InputManager'
import { LevelManager, Level } from './Level'
import { AudioManager } from '../audio/AudioManager'
import { fontManager } from '../utils/FontManager'

export class Game {
  private gameState: GameState
  private gameLoop: GameLoop
  private renderer: Renderer
  private physicsEngine: PhysicsEngine
  private inputManager: InputManager
  private tiltingBar: TiltingBar
  private levelManager: LevelManager
  private audioManager: AudioManager
  private currentLevel: Level | null = null
  private isRunning: boolean = false
  private levelCompletionHandled: boolean = false
  
  // Hole animation state
  private isAnimatingHoleFall: boolean = false
  private holeAnimationState: {
    ballId: string
    holePosition: { x: number; y: number }
    startTime: number
    duration: number
    startPosition: { x: number; y: number }
    scale: number
    opacity: number
  } | null = null

  constructor() {
    this.gameState = new GameState()
    this.gameLoop = new GameLoop()
    this.renderer = new Renderer()
    this.physicsEngine = new PhysicsEngine()
    this.inputManager = new InputManager()
    this.levelManager = new LevelManager()
    this.audioManager = new AudioManager()
    this.tiltingBar = new TiltingBar({
      position: { x: 180, y: 590 }, // Center of 360px width screen, near bottom
      width: 360, // Full width of screen
      height: 8,
      maxRotation: Math.PI / 4, // 45 degrees
      rotationSpeed: 3,
      friction: 0.05 // Low friction for smooth rolling
    })
    console.log('🎮 Circuit Breaker - Game initialized')
  }

  /**
   * Initialize the game
   */
  public async init(): Promise<void> {
    try {
      console.log('🎮 Initializing Circuit Breaker...')
      
      // Initialize renderer with canvas
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
      if (!canvas) {
        throw new Error('Canvas element not found')
      }
      this.renderer.init(canvas)
      
      // Preload custom fonts
      await fontManager.preloadFonts()
      
      // Initialize physics engine with realistic pinball settings
      this.physicsEngine.setGravity(0, 520) // Stronger gravity for heavier pinball
      this.physicsEngine.setAirResistance(0.999) // Minimal air resistance
      this.physicsEngine.setBounds(360, 640) // Match canvas size
      this.physicsEngine.setTiltingBar(this.tiltingBar)
      
      // Set up physics audio callback for collision sounds
      this.physicsEngine.setAudioCallback((velocity: number, type: string) => {
        // Only play collision sounds when actually playing the game
        if (this.gameState.isPlaying() && type === 'bounce') {
          this.audioManager.playBounceSound(velocity)
        }
      })
      
      // Initialize input manager
      this.inputManager.init(canvas)
      
      // Initialize audio system
      await this.audioManager.init()
      
      // Create main game ball starting off the left side of playfield
      // Real pinball specifications: 1 1/16" diameter (27mm), ~80-100g weight
      const ballRadius = 14 // Slightly larger for more substantial feel
      const ballStartX = -50 // Off the left side (hidden)
      const ballStartY = 300 // Middle height (will be repositioned when started)
      
      // Create main game ball with realistic pinball physics
      const ball = this.physicsEngine.createObject({
        id: 'game-ball',
        x: ballStartX,
        y: ballStartY,
        radius: ballRadius,
        mass: 6, // Heavy steel ball (6x heavier than generic ball)
        restitution: 0.65, // Moderate bounce like real pinball
        friction: 0.18, // Steel on metal/plastic surface friction
        isStatic: false
      })
      
      this.physicsEngine.addObject(ball)
      
      // Sync physics engine debug mode with game state debug mode
      this.physicsEngine.setDebug(this.gameState.isDebugMode())
      
      // Load the first level
      this.currentLevel = this.levelManager.loadLevel(1)
      if (this.currentLevel) {
        this.currentLevel.start()
        this.levelCompletionHandled = false // Initialize completion flag
        console.log('🎯 Level 1 loaded and started')
      }
      
      this.isRunning = true
      console.log('✅ Circuit Breaker initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Circuit Breaker:', error)
      throw error
    }
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (!this.isRunning) {
      console.warn('⚠️ Game not initialized. Call init() first.')
      return
    }

    console.log('▶️ Starting Circuit Breaker...')
    this.gameState.setState(GameStateType.PLAYING)
    this.gameLoop.start(this.gameState, this.renderer, this.physicsEngine, this)
  }

  /**
   * Update game logic (called by GameLoop)
   */
  public update(deltaTime: number): void {
    // Update input
    this.inputManager.update()
    
    // Handle menu input - start new game when clicking or pressing space
    if (this.gameState.isState(GameStateType.MENU)) {
      if (this.inputManager.isActionJustPressed('start') || this.inputManager.isMouseJustPressed()) {
        console.log('🎮 Starting new game...')
        this.startNewGame()
        
        // Resume audio context on user interaction (required by browsers)
        this.audioManager.resumeContext()
        
        // Play UI click sound
        this.audioManager.playSound('ui_click')
      }
      
      // Handle debug mode toggle
      if (this.inputManager.isKeyJustPressed('KeyD')) {
        this.gameState.toggleDebugMode()
        
        // Update physics engine debug mode to match
        this.physicsEngine.setDebug(this.gameState.isDebugMode())
        
        // Play UI click sound
        this.audioManager.playSound('ui_click')
      }
    }
    
    // Handle game over input - return to menu when clicking or pressing space
    if (this.gameState.isState(GameStateType.GAME_OVER)) {
      if (this.inputManager.isActionJustPressed('start') || this.inputManager.isMouseJustPressed()) {
        console.log('🏠 Returning to menu...')
        this.gameState.reset()
        
        // Play UI click sound
        this.audioManager.playSound('ui_click')
      }
    }
    
    // Only process gameplay logic when actually playing
    if (this.gameState.isPlaying()) {
      // Update hole animation if active
      if (this.isAnimatingHoleFall) {
        this.updateHoleAnimation(deltaTime)
      }
      
      // Check for start key press to place ball on bar
      if (this.inputManager.isActionJustPressed('start')) {
        console.log('🎯 SPACE pressed - placing ball on bar')
        this.placeBallOnBar()
        
        // Resume audio context on user interaction (required by browsers)
        this.audioManager.resumeContext()
        
        // Play UI click sound
        this.audioManager.playSound('ui_click')
      }
      
      // Update tilting bar based on independent side controls (absolute movement)
      const leftSideInput = this.inputManager.getLeftSideInput()
      const rightSideInput = this.inputManager.getRightSideInput()
      
      this.tiltingBar.moveLeftSide(leftSideInput)
      this.tiltingBar.moveRightSide(rightSideInput)
      this.tiltingBar.update(deltaTime / 1000) // Convert to seconds
      
      // Update current level
      if (this.currentLevel) {
        this.currentLevel.update(deltaTime)
        // Only check collisions if not animating
        if (!this.isAnimatingHoleFall) {
          this.checkCollisions()
          this.checkWinLoseConditions()
        }
      }
    }
    
    // End frame - update previous input state for next frame
    this.inputManager.endFrame()
  }

  /**
   * Place the ball at right edge, 10 pixels above the bar's top edge with zero velocity
   */
  private placeBallOnBar(): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball')
    if (ball) {
      const ballRadius = ball.radius
      // Position ball at right edge with 5px gap from playfield edge
      const ballX = 360 - ballRadius - 5
      
      // Get the precise bar positioning using the bar's own thickness property
      const barRightSideY = this.tiltingBar.rightSideHeight // 590 (center line of bar)
      const barThickness = this.tiltingBar.thickness // Use actual thickness property
      const barTopSurface = barRightSideY - barThickness / 2 // Top collision surface
      
      // Position ball so its bottom edge is exactly 10 pixels above the bar's top surface
      // Ball center must be at: barTopSurface - 10 - ballRadius
      const ballY = barTopSurface - 10 - ballRadius
      
             console.log(`🏀 Precise ball placement:`)
       console.log(`   Ball radius: ${ballRadius}`)
       console.log(`   Bar right side Y: ${barRightSideY}`)
       console.log(`   Bar thickness: ${barThickness}`)
       console.log(`   Bar top surface: ${barTopSurface}`)
       console.log(`   Ball center Y: ${ballY}`)
       console.log(`   Ball bottom Y: ${ballY + ballRadius} (should be ${barTopSurface - 10})`)
       console.log(`   Gap between ball and bar: ${(ballY + ballRadius) - barTopSurface} pixels`)
      
      // Set ball position
      ball.position.x = ballX
      ball.position.y = ballY
      
      // Set previous position to current position for ZERO velocity
      ball.previousPosition.x = ball.position.x
      ball.previousPosition.y = ball.position.y
      
      // Ensure velocity is zero
      ball.velocity.x = 0
      ball.velocity.y = 0
      
      // Update backward compatibility properties
      ball.x = ball.position.x
      ball.y = ball.position.y
      ball.vx = 0
      ball.vy = 0
      
      console.log(`✅ Ball placed at (${ball.position.x}, ${ball.position.y})`)
    } else {
      console.error('❌ Ball not found in physics engine!')
    }
  }

  /**
   * Render additional game elements (called by GameLoop)
   */
  public renderGameplay(): void {
    // Render tilting bar
    this.renderer.drawTiltingBar(this.tiltingBar)
    
    // Render level elements
    if (this.currentLevel) {
      const levelData = this.currentLevel.getLevelData()
      
      // Draw holes
      levelData.holes.forEach(hole => {
        // Check if this goal hole has been completed
        const isCompleted = hole.isGoal && this.currentLevel ? this.currentLevel.isGoalCompleted(hole.id) : false
        this.renderer.drawHole(hole, isCompleted)
      })
      
      // Draw essential UI (always visible)
      const ctx = this.renderer.getContext()
      if (ctx) {
        ctx.fillStyle = '#00ffff'
        fontManager.setFont(ctx, 'primary', 12)
        ctx.textAlign = 'left'
        ctx.fillText(`Level: ${levelData.id} - ${levelData.name}`, 10, 20)
        ctx.fillText(`Score: ${this.gameState.getStateData().score}`, 10, 35)
        ctx.fillText(`Lives: ${this.gameState.getStateData().lives}`, 10, 50)
        
        // Debug info (only when debug mode is enabled)
        if (this.gameState.isDebugMode()) {
          ctx.fillText(`Progress: ${Math.round(this.currentLevel.getProgress() * 100)}%`, 10, 65)
          
          // Show multi-goal progress
          const completedGoals = this.currentLevel.getCompletedGoals()
          const requiredGoals = this.currentLevel.getRequiredGoals()
          ctx.fillText(`Goals: ${completedGoals}/${requiredGoals} completed`, 10, 80)
          
          if (completedGoals < requiredGoals) {
            ctx.fillText(`Goal: Navigate to the glowing goal holes`, 10, 95)
          } else {
            ctx.fillText(`Goal: All goals completed! Level complete!`, 10, 95)
          }
        }
      }
    }
    
    // Input instructions (only when debug mode is enabled)
    if (this.gameState.isDebugMode()) {
      const ctx = this.renderer.getContext()
      if (ctx) {
        ctx.fillStyle = '#00ffff'
        fontManager.setFont(ctx, 'primary', 10)
        ctx.textAlign = 'center'
        ctx.fillText('SPACE: Start | Left: A(up)/Z(down) | Right: ↑(up)/↓(down)', 180, 580)
        ctx.fillText('Navigate upward to the goal holes - avoid falling into other holes!', 180, 595)
      }
    }
  }

  /**
   * Get hole animation state for rendering
   */
  public getHoleAnimationState(): { scale: number; opacity: number } | null {
    return this.holeAnimationState ? {
      scale: this.holeAnimationState.scale,
      opacity: this.holeAnimationState.opacity
    } : null
  }

  /**
   * Check if ball is currently animating into a hole
   */
  public getIsAnimatingHoleFall(): boolean {
    return this.isAnimatingHoleFall
  }

  /**
   * Check collisions between ball and level elements
   */
  private checkCollisions(): void {
    if (!this.currentLevel) return

    const ball = this.physicsEngine.getObjects().find(obj => obj.id === 'game-ball')
    if (!ball) return

    const ballPosition = { x: ball.position.x, y: ball.position.y }
    const ballRadius = ball.radius

    // Check if ball reached the goal hole
    if (this.currentLevel.checkGoalReached(ballPosition, ballRadius)) {
      this.handleGoalReached()
      return
    }

    // Check if ball fell into any hole
    const hitHole = this.currentLevel.checkHoleCollision(ballPosition, ballRadius)
    if (hitHole && !hitHole.isGoal) {
      this.handleHoleCollision(hitHole)
    }

    // Check if ball fell off screen
    if (this.currentLevel.checkBallFallOff(ballPosition, { x: 360, y: 640 })) {
      this.handleBallFallOff()
    }
  }

  /**
   * Check win/lose conditions
   */
  private checkWinLoseConditions(): void {
    if (!this.currentLevel) return

    // Check if level is complete (only handle once per level)
    if (this.currentLevel.checkLevelComplete() && !this.levelCompletionHandled) {
      this.levelCompletionHandled = true
      this.handleLevelComplete()
    }
  }

  /**
   * Handle ball reaching the goal hole
   */
  private handleGoalReached(): void {
    if (!this.currentLevel) return

    console.log('🎯 Goal reached!')
    
    // Play target activation sound
    this.audioManager.playSound('target')
    
    // Add bonus score for reaching goal
    const currentScore = this.gameState.getStateData().score
    this.gameState.updateStateData({ score: currentScore + 500 })
    
    console.log('💰 Goal bonus: 500 points')
    
    // Check if all goals are completed
    const completedGoals = this.currentLevel.getCompletedGoals()
    const requiredGoals = this.currentLevel.getRequiredGoals()
    
    console.log(`🎯 Goals completed: ${completedGoals}/${requiredGoals}`)
    
    // Only mark level as complete if all goals are reached
    if (this.currentLevel.areAllGoalsCompleted()) {
      console.log('🎉 All goals completed! Level complete!')
      // Level completion will be handled by checkWinLoseConditions
    } else {
      console.log(`🔄 Continue playing! ${requiredGoals - completedGoals} goal(s) remaining`)
      
      // Reset tilting bar to starting position
      this.tiltingBar.reset()
      
      // Reset ball to starting position on the bar
      this.placeBallOnBar()
    }
  }

  /**
   * Handle ball falling into a hole
   */
  private handleHoleCollision(hole: any): void {
    console.log(`🕳️ Ball fell into hole: ${hole.id}`)
    
    // Play falling sound
    this.audioManager.playSound('zap') // Use zap sound for falling into holes
    
    // Start hole animation instead of immediately resetting
    this.startHoleAnimation('game-ball', hole.position)
  }

  /**
   * Handle ball falling off screen
   */
  private handleBallFallOff(): void {
    console.log('💀 Ball fell off screen!')
    
    // Reduce lives
    const currentLives = this.gameState.getStateData().lives
    if (currentLives > 1) {
      this.gameState.updateStateData({ lives: currentLives - 1 })
      console.log(`💔 Lives remaining: ${currentLives - 1}`)
      
      // Reset tilting bar to starting position
      this.tiltingBar.reset()
      
      // Reset ball to starting position on the bar
      this.placeBallOnBar()
    } else {
      this.handleGameOver()
    }
  }

  /**
   * Handle level completion
   */
  private handleLevelComplete(): void {
    if (!this.currentLevel) return

    console.log('🏆 Level completed!')
    
    // Play level completion sound
    this.audioManager.playSound('level_complete')
    
    // Add level completion bonus
    const levelScore = this.currentLevel.calculateScore()
    const currentScore = this.gameState.getStateData().score
    this.gameState.updateStateData({ score: currentScore + levelScore })
    
    console.log(`🎉 Level bonus: ${levelScore}`)
    
    // Move to next level
    const nextLevelId = this.currentLevel.getLevelData().id + 1
    this.levelManager.unlockLevel(nextLevelId)
    
    // Load next level or show completion
    if (this.levelManager.getLevelData(nextLevelId)) {
      this.loadNextLevel(nextLevelId)
    } else {
      this.handleGameComplete()
    }
  }

  /**
   * Handle time up
   */
  private handleTimeUp(): void {
    console.log('⏰ Time up!')
    this.handleBallFallOff()
  }

  /**
   * Load next level
   */
  private loadNextLevel(levelId: number): void {
    console.log(`🔄 Loading level ${levelId}...`)
    
    this.currentLevel = this.levelManager.loadLevel(levelId)
    if (this.currentLevel) {
      this.currentLevel.start()
      this.gameState.updateStateData({ currentLevel: levelId })
      this.levelCompletionHandled = false // Reset completion flag for new level
      
      // Reset tilting bar to starting position
      this.tiltingBar.reset()
      
      // Reset ball to starting position on the bar
      this.placeBallOnBar()
      
      console.log(`🎯 Level ${levelId} loaded and started`)
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(): void {
    console.log('💀 Game Over!')
    this.gameState.setState(GameStateType.GAME_OVER)
    
    // Play game over sound
    this.audioManager.playSound('game_over')
    
    // Auto-return to menu after 5 seconds if user doesn't interact
    setTimeout(() => {
      if (this.gameState.isState(GameStateType.GAME_OVER)) {
        console.log('🏠 Auto-returning to menu...')
        this.gameState.reset()
      }
    }, 5000)
  }

  /**
   * Handle game completion
   */
  private handleGameComplete(): void {
    console.log('🎊 Game completed! All levels finished!')
    
    // Show completion message briefly, then return to main menu
    setTimeout(() => {
      console.log('🏠 Returning to main menu...')
      this.gameState.reset()
    }, 2000) // 2 second delay to show completion
  }

  /**
   * Pause the game
   */
  public pause(): void {
    console.log('⏸️ Pausing Circuit Breaker...')
    this.gameLoop.pause()
  }

  /**
   * Resume the game
   */
  public resume(): void {
    console.log('▶️ Resuming Circuit Breaker...')
    this.gameLoop.resume()
  }

  /**
   * Stop the game
   */
  public stop(): void {
    console.log('⏹️ Stopping Circuit Breaker...')
    this.gameLoop.stop()
    this.isRunning = false
  }

  /**
   * Get current game state
   */
  public getGameState(): GameState {
    return this.gameState
  }

  /**
   * Check if game is running
   */
  public isGameRunning(): boolean {
    return this.isRunning && this.gameLoop.isGameLoopRunning()
  }

  /**
   * Start a new game (used when clicking from menu)
   */
  private startNewGame(): void {
    console.log('🎮 Starting new game...')
    
    // Reset game state
    this.gameState.setState(GameStateType.PLAYING)
    this.gameState.updateStateData({
      currentLevel: 1,
      score: 0,
      lives: 3
    })
    
    // Load first level
    this.currentLevel = this.levelManager.loadLevel(1)
    if (this.currentLevel) {
      this.currentLevel.start()
      this.levelCompletionHandled = false
      console.log('🎯 Level 1 loaded and started')
    }
    
    // Reset tilting bar to starting position
    this.tiltingBar.reset()
    
    // Reset ball to starting position on the bar
    this.placeBallOnBar()
    
    console.log('🚀 New game started successfully!')
  }

  /**
   * Update hole animation if active
   */
  private updateHoleAnimation(deltaTime: number): void {
    if (!this.holeAnimationState) return

    const elapsed = Date.now() - this.holeAnimationState.startTime
    const progress = Math.min(elapsed / this.holeAnimationState.duration, 1)

    // Easing function for more natural animation (starts fast, slows down)
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Update animation properties
    this.holeAnimationState.scale = 1 - easedProgress * 0.9 // Scale down to 10% of original (more dramatic)
    this.holeAnimationState.opacity = 1 - easedProgress * 0.7 // Fade to 30% opacity

    // Move ball towards hole center initially, then down behind playfield
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === this.holeAnimationState?.ballId)
    if (ball) {
      const startPos = this.holeAnimationState.startPosition
      const holePos = this.holeAnimationState.holePosition
      
      if (progress < 0.3) {
        // First 30% of animation: move towards hole center
        const moveProgress = progress / 0.3
        ball.position.x = startPos.x + (holePos.x - startPos.x) * moveProgress
        ball.position.y = startPos.y + (holePos.y - startPos.y) * moveProgress
      } else {
        // Remaining 70%: fall straight down behind playfield
        const fallProgress = (progress - 0.3) / 0.7
        ball.position.x = holePos.x // Stay at hole center horizontally
        ball.position.y = holePos.y + fallProgress * 200 // Fall 200 pixels down behind playfield
      }
      
      // Update previous position to prevent physics interference
      ball.previousPosition.x = ball.position.x
      ball.previousPosition.y = ball.position.y
      
      // Stop ball physics
      ball.velocity.x = 0
      ball.velocity.y = 0
    }

    // Complete animation
    if (progress >= 1) {
      this.completeHoleAnimation()
    }
  }

  /**
   * Start hole animation when ball enters a hole
   */
  private startHoleAnimation(ballId: string, holePosition: { x: number; y: number }): void {
    const ball = this.physicsEngine.getObjects().find(obj => obj.id === ballId)
    if (!ball) return

    console.log(`🎬 Starting hole animation for ball: ${ballId}`)
    
    this.isAnimatingHoleFall = true
    this.holeAnimationState = {
      ballId: ballId,
      holePosition: holePosition,
      startTime: Date.now(),
      duration: 500, // Faster animation: 500ms instead of 800ms
      startPosition: { x: ball.position.x, y: ball.position.y },
      scale: 1,
      opacity: 1
    }
  }

  /**
   * Complete hole animation and reset ball
   */
  private completeHoleAnimation(): void {
    console.log('🎬 Hole animation complete')
    
    this.isAnimatingHoleFall = false
    this.holeAnimationState = null
    
    // Now perform the actual ball reset
    this.handleBallFallOff()
  }
} 
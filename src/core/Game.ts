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
   * Initialize the game and all systems
   */
  public async init(): Promise<void> {
    try {
      console.log('🚀 Initializing Circuit Breaker...')
      
      // Initialize renderer with canvas
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
      if (!canvas) {
        throw new Error('Canvas element not found')
      }
      this.renderer.init(canvas)
      
      // Initialize physics engine with realistic pinball settings
      this.physicsEngine.setGravity(0, 520) // Stronger gravity for heavier pinball
      this.physicsEngine.setAirResistance(0.999) // Minimal air resistance
      this.physicsEngine.setBounds(360, 640) // Match canvas size
      this.physicsEngine.setTiltingBar(this.tiltingBar)
      
      // Set up physics audio callback for collision sounds
      this.physicsEngine.setAudioCallback((velocity: number, type: string) => {
        if (type === 'bounce') {
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

      // Disable physics debugging for performance
      this.physicsEngine.setDebug(false)
      
      // Load the first level
      this.currentLevel = this.levelManager.loadLevel(1)
      if (this.currentLevel) {
        this.currentLevel.start()
        console.log('🎯 Level 1 loaded and started')
      }
      
      // TODO: Initialize remaining systems
      // - Audio system
      
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
      this.checkCollisions()
      this.checkWinLoseConditions()
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
      
      // Draw obstacles
      levelData.obstacles.forEach(obstacle => {
        this.renderer.drawObstacle(obstacle)
      })
      
      // Draw target ports
      levelData.targetPorts.forEach(port => {
        this.renderer.drawTargetPort(port)
      })
      
      // Draw level info
      const ctx = this.renderer.getContext()
      if (ctx) {
        ctx.fillStyle = '#00ffff'
        ctx.font = '12px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`Level: ${levelData.id} - ${levelData.name}`, 10, 20)
        ctx.fillText(`Progress: ${Math.round(this.currentLevel.getProgress() * 100)}%`, 10, 35)
        ctx.fillText(`Score: ${this.gameState.getStateData().score}`, 10, 50)
      }
    }
    
    // Render input instructions
    const ctx = this.renderer.getContext()
    if (ctx) {
      ctx.fillStyle = '#00ffff'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SPACE: Start | Left: A(up)/Z(down) | Right: ↑(up)/↓(down)', 180, 580)
      ctx.fillText('Or click and drag mouse to control', 180, 595)
    }
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

    // Check obstacle collisions
    const hitObstacle = this.currentLevel.checkObstacleCollision(ballPosition, ballRadius)
    if (hitObstacle) {
      this.handleObstacleCollision(hitObstacle)
    }

    // Check target port collisions
    const hitPort = this.currentLevel.checkTargetPortCollision(ballPosition, ballRadius)
    if (hitPort) {
      this.handleTargetPortCollision(hitPort)
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

    // Check if level is complete
    if (this.currentLevel.checkLevelComplete()) {
      this.handleLevelComplete()
    }

    // Check if time is up (if there's a time limit)
    if (this.currentLevel.isTimeUp()) {
      this.handleTimeUp()
    }
  }

  /**
   * Handle obstacle collision
   */
  private handleObstacleCollision(obstacle: any): void {
    console.log(`💥 Ball hit obstacle: ${obstacle.id}`)
    
    // Apply damage or effects based on obstacle type
    if (obstacle.type === 'electrical_hazard') {
      console.log('⚡ Electrical damage!')
      // Play electrical zap sound
      this.audioManager.playSound('zap')
      // Reset ball position
      this.placeBallOnBar()
    } else if (obstacle.type === 'hole') {
      console.log('🕳️ Ball fell into hole!')
      this.handleBallFallOff()
    } else if (obstacle.type === 'barrier') {
      // Play bounce sound for barrier collision
      this.audioManager.playBounceSound(300) // Medium velocity bounce
    }
  }

  /**
   * Handle target port collision
   */
  private handleTargetPortCollision(port: any): void {
    console.log(`🎯 Ball reached target port: ${port.id}`)
    
    // Play target activation sound
    this.audioManager.playSound('target')
    
    // Add score
    const currentScore = this.gameState.getStateData().score
    this.gameState.updateStateData({ score: currentScore + port.points })
    
    console.log(`💰 Score increased by ${port.points}`)
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
  }

  /**
   * Handle game completion
   */
  private handleGameComplete(): void {
    console.log('🎊 Game completed! All levels finished!')
    this.gameState.setState(GameStateType.LEVEL_COMPLETE)
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
} 
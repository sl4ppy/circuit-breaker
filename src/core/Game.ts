// Circuit Breaker - Main Game Class
// Handles game state management and core game loop

import { GameState, GameStateType } from './GameState'
import { GameLoop } from './GameLoop'
import { Renderer } from '../rendering/Renderer'
import { PhysicsEngine } from '../physics/PhysicsEngine'
import { TiltingBar } from './TiltingBar'
import { InputManager } from '../input/InputManager'

export class Game {
  private gameState: GameState
  private gameLoop: GameLoop
  private renderer: Renderer
  private physicsEngine: PhysicsEngine
  private inputManager: InputManager
  private tiltingBar: TiltingBar
  private isRunning: boolean = false

  constructor() {
    this.gameState = new GameState()
    this.gameLoop = new GameLoop()
    this.renderer = new Renderer()
    this.physicsEngine = new PhysicsEngine()
    this.inputManager = new InputManager()
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
      
      // Initialize physics engine with robust settings
      this.physicsEngine.setGravity(0, 400) // Gravity in Y direction
      this.physicsEngine.setAirResistance(0.999) // Minimal air resistance
      this.physicsEngine.setBounds(360, 640) // Match canvas size
      this.physicsEngine.setTiltingBar(this.tiltingBar)
      
      // Initialize input manager
      this.inputManager.init(canvas)
      
      // Create main game ball starting off the left side of playfield
      const ballRadius = 12
      const ballStartX = -50 // Off the left side (hidden)
      const ballStartY = 300 // Middle height (will be repositioned when started)
      
      // Create main game ball using the new robust physics system
      const ball = this.physicsEngine.createObject({
        id: 'game-ball',
        x: ballStartX,
        y: ballStartY,
        radius: ballRadius,
        mass: 1,
        restitution: 0.8, // Good bounce
        friction: 0.2, // Low friction for rolling
        isStatic: false
      })
      
      this.physicsEngine.addObject(ball)

      // Disable physics debugging for performance
      this.physicsEngine.setDebug(false)
      
      // TODO: Initialize remaining systems
      // - Input manager
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
    }
    
    // Update tilting bar based on independent side controls (absolute movement)
    const leftSideInput = this.inputManager.getLeftSideInput()
    const rightSideInput = this.inputManager.getRightSideInput()
    
    this.tiltingBar.moveLeftSide(leftSideInput)
    this.tiltingBar.moveRightSide(rightSideInput)
    this.tiltingBar.update(deltaTime / 1000) // Convert to seconds
    
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
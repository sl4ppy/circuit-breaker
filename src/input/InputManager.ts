export interface InputState {
  keys: { [key: string]: boolean }
  mouse: {
    x: number
    y: number
    isDown: boolean
    button: number
  }
  tiltInput: number // -1 to 1 for bar tilt
}

export class InputManager {
  private inputState: InputState = {
    keys: {},
    mouse: {
      x: 0,
      y: 0,
      isDown: false,
      button: -1
    },
    tiltInput: 0
  }
  
  private previousKeys: { [key: string]: boolean } = {}
  private canvas: HTMLCanvasElement | null = null
  private keyBindings = {
    leftSideUp: ['KeyA'],
    leftSideDown: ['KeyZ'],
    rightSideUp: ['ArrowUp'],
    rightSideDown: ['ArrowDown'],
    start: ['Space'],
    reset: ['KeyR'],
    pause: ['KeyP', 'Escape']
  }

  constructor() {
    this.setupEventListeners()
  }

  /**
   * Initialize input manager with canvas reference
   */
  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.setupCanvasListeners()
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState }
  }

  /**
   * Get tilt input value (-1 to 1)
   */
  public getTiltInput(): number {
    return this.inputState.tiltInput
  }

  /**
   * Get left side input (-1 to 1, where 1 is up, -1 is down)
   */
  public getLeftSideInput(): number {
    let leftSideInput = 0
    if (this.isActionPressed('leftSideUp')) {
      leftSideInput = 1
    }
    if (this.isActionPressed('leftSideDown')) {
      leftSideInput = -1
    }
    return leftSideInput
  }

  /**
   * Get right side input (-1 to 1, where 1 is up, -1 is down)
   */
  public getRightSideInput(): number {
    let rightSideInput = 0
    if (this.isActionPressed('rightSideUp')) {
      rightSideInput = 1
    }
    if (this.isActionPressed('rightSideDown')) {
      rightSideInput = -1
    }
    return rightSideInput
  }

  /**
   * Check if a specific action is pressed
   */
  public isActionPressed(action: keyof typeof this.keyBindings): boolean {
    return this.keyBindings[action].some(key => this.inputState.keys[key])
  }

  /**
   * Check if a specific action was just pressed (not held)
   */
  public isActionJustPressed(action: keyof typeof this.keyBindings): boolean {
    const isPressed = this.keyBindings[action].some(key => 
      this.inputState.keys[key] && !this.previousKeys[key]
    )
    
    // Debug logging for start key
    if (action === 'start' && isPressed) {
      console.log('🔑 Start key (SPACE) just pressed!')
    }
    
    return isPressed
  }

  /**
   * Check if a specific key was just pressed (not held) by key code
   */
  public isKeyJustPressed(keyCode: string): boolean {
    return this.inputState.keys[keyCode] && !this.previousKeys[keyCode]
  }

  /**
   * Check if mouse was just clicked (not held)
   */
  public isMouseJustPressed(): boolean {
    return this.inputState.mouse.isDown && !this.previousMouseState
  }

  private previousMouseState: boolean = false

  /**
   * Update input state (called each frame)
   */
  public update(): void {
    // Calculate tilt input based on independent left/right side controls
    let leftSideInput = 0
    let rightSideInput = 0
    
    // Left side controls (A raises, Z lowers)
    if (this.isActionPressed('leftSideUp')) {
      leftSideInput = 1
    }
    if (this.isActionPressed('leftSideDown')) {
      leftSideInput = -1
    }
    
    // Right side controls (Up raises, Down lowers)
    if (this.isActionPressed('rightSideUp')) {
      rightSideInput = 1
    }
    if (this.isActionPressed('rightSideDown')) {
      rightSideInput = -1
    }
    
    // Calculate overall tilt based on difference between sides
    // Positive tilt = right side higher than left side
    const tiltInput = (rightSideInput - leftSideInput) * 0.5
    
    // Add mouse tilt control if mouse is being used
    if (this.canvas && this.inputState.mouse.isDown) {
      const rect = this.canvas.getBoundingClientRect()
      const centerX = rect.width / 2
      const mouseX = this.inputState.mouse.x - rect.left
      const mouseTilt = (mouseX - centerX) / centerX
      this.inputState.tiltInput = Math.max(-1, Math.min(1, mouseTilt))
    } else {
      this.inputState.tiltInput = Math.max(-1, Math.min(1, tiltInput))
    }
  }

  /**
   * Call this at the end of each frame to update previous key state
   */
  public endFrame(): void {
    // Store previous key state for just-pressed detection
    this.previousKeys = { ...this.inputState.keys }
    // Store previous mouse state for just-pressed detection
    this.previousMouseState = this.inputState.mouse.isDown
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
    
    // Prevent default behavior for game keys
    document.addEventListener('keydown', (e) => {
      const allKeys = Object.values(this.keyBindings).flat()
      if (allKeys.includes(e.code)) {
        e.preventDefault()
      }
    })
  }

  /**
   * Setup canvas-specific event listeners
   */
  private setupCanvasListeners(): void {
    if (!this.canvas) return

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this))

    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this))
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this))
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.inputState.keys[event.code] = true
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.inputState.keys[event.code] = false
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    this.inputState.mouse.isDown = true
    this.inputState.mouse.button = event.button
    this.updateMousePosition(event)
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_event: MouseEvent): void {
    this.inputState.mouse.isDown = false
    this.inputState.mouse.button = -1
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event)
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(): void {
    this.inputState.mouse.isDown = false
    this.inputState.mouse.button = -1
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault()
    if (event.touches.length > 0) {
      this.inputState.mouse.isDown = true
      this.updateTouchPosition(event.touches[0])
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()
    this.inputState.mouse.isDown = false
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault()
    if (event.touches.length > 0) {
      this.updateTouchPosition(event.touches[0])
    }
  }

  /**
   * Update mouse position from mouse event
   */
  private updateMousePosition(event: MouseEvent): void {
    this.inputState.mouse.x = event.clientX
    this.inputState.mouse.y = event.clientY
  }

  /**
   * Update mouse position from touch event
   */
  private updateTouchPosition(touch: Touch): void {
    this.inputState.mouse.x = touch.clientX
    this.inputState.mouse.y = touch.clientY
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('keyup', this.handleKeyUp.bind(this))
    
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this))
      this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this))
      this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this))
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this))
      this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this))
      this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this))
      this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    }
  }
} 
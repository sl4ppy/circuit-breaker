import { logger } from '../utils/Logger';
import { ScalingManager } from '../utils/ScalingManager';
import { TiltingBar } from '../core/TiltingBar';

export interface InputState {
  keys: { [key: string]: boolean };
  mouse: {
    x: number;
    y: number;
    isDown: boolean;
    button: number;
  };
  tiltInput: number; // -1 to 1 for bar tilt
  touches: Map<number, { x: number; y: number }>; // Track multiple touches by identifier
}

export class InputManager {
  private inputState: InputState = {
    keys: {},
    mouse: {
      x: 0,
      y: 0,
      isDown: false,
      button: 0,
    },
    tiltInput: 0,
    touches: new Map(), // Initialize touch tracking
  };

  private previousKeys: { [key: string]: boolean } = {};
  private canvas: HTMLCanvasElement | null = null;
  private tiltingBar: TiltingBar | null = null;
  private keyBindings = {
    leftSideUp: ['KeyA'],
    leftSideDown: ['KeyZ'],
    rightSideUp: ['ArrowUp', 'KeyL'],
    rightSideDown: ['ArrowDown', 'Comma'],
    start: ['Space'],
    reset: ['KeyR'],
    pause: ['KeyP', 'Escape'],
  };

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize input manager with canvas reference and tilting bar
   */
  public init(canvas: HTMLCanvasElement, tiltingBar: TiltingBar): void {
    this.canvas = canvas;
    this.tiltingBar = tiltingBar;
    this.setupCanvasListeners();
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }

  /**
   * Get tilt input value (-1 to 1)
   */
  public getTiltInput(): number {
    return this.inputState.tiltInput;
  }

  /**
   * Get left side input (-1 to 1, where 1 is up, -1 is down)
   */
  public getLeftSideInput(): number {
    let leftSideInput = 0;
    
    // Check discrete keyboard inputs first
    if (this.isActionPressed('leftSideUp')) {
      leftSideInput = 1;
    }
    if (this.isActionPressed('leftSideDown')) {
      leftSideInput = -1;
    }
    
    // If no keyboard input, use touch control logic (supports multi-touch)
    if (this.canvas && leftSideInput === 0 && this.tiltingBar) {
      const touchInput = this.calculateTouchSideInput('left');
      leftSideInput = touchInput;
    }
    
    return leftSideInput;
  }

  /**
   * Get right side input (-1 to 1, where 1 is up, -1 is down)
   */
  public getRightSideInput(): number {
    let rightSideInput = 0;
    
    // Check discrete keyboard inputs first
    if (this.isActionPressed('rightSideUp')) {
      rightSideInput = 1;
    }
    if (this.isActionPressed('rightSideDown')) {
      rightSideInput = -1;
    }
    
    // If no keyboard input, use touch control logic (supports multi-touch)
    if (this.canvas && rightSideInput === 0 && this.tiltingBar) {
      const touchInput = this.calculateTouchSideInput('right');
      rightSideInput = touchInput;
    }
    
    return rightSideInput;
  }

  /**
   * Check if a specific action is pressed
   */
  public isActionPressed(action: keyof typeof this.keyBindings): boolean {
    return this.keyBindings[action].some(key => this.inputState.keys[key]);
  }

  /**
   * Check if a specific action was just pressed (not held)
   */
  public isActionJustPressed(action: keyof typeof this.keyBindings): boolean {
    const isPressed = this.keyBindings[action].some(
      key => this.inputState.keys[key] && !this.previousKeys[key],
    );

    // Debug logging for start key
    if (action === 'start' && isPressed) {
      logger.debug('🔑 Start key (SPACE) just pressed!', null, 'InputManager');
    }

    return isPressed;
  }

  /**
   * Check if a specific key was just pressed (not held) by key code
   */
  public isKeyJustPressed(keyCode: string): boolean {
    return this.inputState.keys[keyCode] && !this.previousKeys[keyCode];
  }

  /**
   * Calculate touch input for left or right side based on touch position relative to bar
   * Now supports multi-touch - checks all active touches for the specified side
   */
  private calculateTouchSideInput(side: 'left' | 'right'): number {
    if (!this.canvas || !this.tiltingBar) return 0;

    let strongestInput = 0;

    // Check all active touches (multi-touch support)
    for (const [_touchId, touchPos] of this.inputState.touches) {
      try {
        // Get touch position in game coordinates
        const scalingManager = ScalingManager.getInstance();
        const gamePos = scalingManager.screenToGame(touchPos.x, touchPos.y);
        
        // Get screen/game dimensions
        const gameWidth = 360; // Game's base width
        const centerX = gameWidth / 2;
        
        // Determine if touch is on the correct side of screen
        const touchIsOnLeftSide = gamePos.x < centerX;
        const touchIsOnRightSide = gamePos.x >= centerX;
        
        // Only process touch if it's on the correct side
        if ((side === 'left' && !touchIsOnLeftSide) || (side === 'right' && !touchIsOnRightSide)) {
          continue;
        }
        
        // Get bar endpoints to find the Y position of the requested side
        const barEndpoints = this.tiltingBar.getEndpoints();
        const barYPosition = side === 'left' ? barEndpoints.start.y : barEndpoints.end.y;
        
        // Calculate difference between touch Y and bar Y
        const touchYDiff = gamePos.y - barYPosition;
        
        // Convert Y difference to input value
        // Negative Y diff (touch above bar) = positive input (move up)
        // Positive Y diff (touch below bar) = negative input (move down)
        const maxInputDistance = 100; // Maximum distance for full input
        let inputValue = -touchYDiff / maxInputDistance; // Negative to flip direction
        
        // Clamp to [-1, 1] range
        inputValue = Math.max(-1, Math.min(1, inputValue));
        
        // Apply dead zone to prevent jitter when touching very close to bar
        const deadZone = 0.1;
        if (Math.abs(inputValue) < deadZone) {
          inputValue = 0;
        }
        
        // Use the strongest input from all touches on this side
        if (Math.abs(inputValue) > Math.abs(strongestInput)) {
          strongestInput = inputValue;
        }
        
      } catch (error) {
        // Fallback method if ScalingManager fails
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = touchPos.x - rect.left;
        const canvasY = touchPos.y - rect.top;
        
        // Simple approximation using canvas coordinates
        const centerX = rect.width / 2;
        const touchIsOnLeftSide = canvasX < centerX;
        const touchIsOnRightSide = canvasX >= centerX;
        
        if ((side === 'left' && !touchIsOnLeftSide) || (side === 'right' && !touchIsOnRightSide)) {
          continue;
        }
        
        // Estimate bar position (roughly at 90% down from top)
        const estimatedBarY = rect.height * 0.9;
        const touchYDiff = canvasY - estimatedBarY;
        const maxInputDistance = rect.height * 0.2; // 20% of canvas height
        
        let inputValue = -touchYDiff / maxInputDistance;
        inputValue = Math.max(-1, Math.min(1, inputValue));
        
        const deadZone = 0.1;
        if (Math.abs(inputValue) < deadZone) {
          inputValue = 0;
        }
        
        // Use the strongest input from all touches on this side
        if (Math.abs(inputValue) > Math.abs(strongestInput)) {
          strongestInput = inputValue;
        }
      }
    }
    
    // If no multi-touch input found, fallback to mouse/single touch
    if (strongestInput === 0 && this.inputState.mouse.isDown) {
      return this.calculateSingleTouchSideInput(side);
    }

    return strongestInput;
  }

  /**
   * Calculate touch input for single touch (fallback method)
   */
  private calculateSingleTouchSideInput(side: 'left' | 'right'): number {
    if (!this.canvas || !this.tiltingBar) return 0;

    try {
      // Get touch position in game coordinates
      const scalingManager = ScalingManager.getInstance();
      const gamePos = scalingManager.screenToGame(this.inputState.mouse.x, this.inputState.mouse.y);
      
      // Get screen/game dimensions
      const gameWidth = 360; // Game's base width
      const centerX = gameWidth / 2;
      
      // Determine if touch is on the correct side of screen
      const touchIsOnLeftSide = gamePos.x < centerX;
      const touchIsOnRightSide = gamePos.x >= centerX;
      
      // Only process touch if it's on the correct side
      if ((side === 'left' && !touchIsOnLeftSide) || (side === 'right' && !touchIsOnRightSide)) {
        return 0;
      }
      
      // Get bar endpoints to find the Y position of the requested side
      const barEndpoints = this.tiltingBar.getEndpoints();
      const barYPosition = side === 'left' ? barEndpoints.start.y : barEndpoints.end.y;
      
      // Calculate difference between touch Y and bar Y
      const touchYDiff = gamePos.y - barYPosition;
      
      // Convert Y difference to input value
      const maxInputDistance = 100; // Maximum distance for full input
      let inputValue = -touchYDiff / maxInputDistance; // Negative to flip direction
      
      // Clamp to [-1, 1] range
      inputValue = Math.max(-1, Math.min(1, inputValue));
      
      // Apply dead zone
      const deadZone = 0.1;
      if (Math.abs(inputValue) < deadZone) {
        inputValue = 0;
      }
      
      return inputValue;
      
    } catch (error) {
      // Fallback method if ScalingManager fails
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = this.inputState.mouse.x - rect.left;
      const canvasY = this.inputState.mouse.y - rect.top;
      
      // Simple approximation using canvas coordinates
      const centerX = rect.width / 2;
      const touchIsOnLeftSide = canvasX < centerX;
      const touchIsOnRightSide = canvasX >= centerX;
      
      if ((side === 'left' && !touchIsOnLeftSide) || (side === 'right' && !touchIsOnRightSide)) {
        return 0;
      }
      
      // Estimate bar position (roughly at 90% down from top)
      const estimatedBarY = rect.height * 0.9;
      const touchYDiff = canvasY - estimatedBarY;
      const maxInputDistance = rect.height * 0.2; // 20% of canvas height
      
      let inputValue = -touchYDiff / maxInputDistance;
      inputValue = Math.max(-1, Math.min(1, inputValue));
      
      const deadZone = 0.1;
      if (Math.abs(inputValue) < deadZone) {
        inputValue = 0;
      }
      
      return inputValue;
    }
  }

  /**
   * Get all keys that were just pressed this frame
   */
  public getJustPressedKeys(): string[] {
    const justPressed: string[] = [];
    for (const key in this.inputState.keys) {
      if (this.inputState.keys[key] && !this.previousKeys[key]) {
        justPressed.push(key);
      }
    }
    return justPressed;
  }

  /**
   * Check if mouse was just clicked (not held)
   */
  public isMouseJustPressed(): boolean {
    return this.inputState.mouse.isDown && !this.previousMouseState;
  }

  /**
   * Check if mouse was just released
   */
  public isMouseJustReleased(): boolean {
    return !this.inputState.mouse.isDown && this.previousMouseState;
  }

  /**
   * Get current mouse position in game coordinates
   */
  public getMousePosition(): { x: number; y: number } | null {
    if (!this.canvas) return null;
    
    try {
      const scalingManager = ScalingManager.getInstance();
      return scalingManager.screenToGame(this.inputState.mouse.x, this.inputState.mouse.y);
    } catch (error) {
      // Fallback to old method if ScalingManager not initialized
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: this.inputState.mouse.x - rect.left,
        y: this.inputState.mouse.y - rect.top,
      };
    }
  }

  private previousMouseState: boolean = false;

  /**
   * Update input state (called each frame)
   */
  public update(): void {
    // Calculate tilt input based on independent left/right side controls
    let leftSideInput = 0;
    let rightSideInput = 0;

    // Left side controls (A raises, Z lowers)
    if (this.isActionPressed('leftSideUp')) {
      leftSideInput = 1;
    }
    if (this.isActionPressed('leftSideDown')) {
      leftSideInput = -1;
    }

    // Right side controls (Up raises, Down lowers)
    if (this.isActionPressed('rightSideUp')) {
      rightSideInput = 1;
    }
    if (this.isActionPressed('rightSideDown')) {
      rightSideInput = -1;
    }

    // Calculate overall tilt based on difference between sides
    // Positive tilt = right side higher than left side
    const tiltInput = (rightSideInput - leftSideInput) * 0.5;

    // Keep the old tilt calculation for backwards compatibility (if needed)
    // New touch system uses position-based controls instead
    this.inputState.tiltInput = Math.max(-1, Math.min(1, tiltInput));
  }

  /**
   * Call this at the end of each frame to update previous key state
   */
  public endFrame(): void {
    // Store previous key state for just-pressed detection
    this.previousKeys = { ...this.inputState.keys };
    // Store previous mouse state for just-pressed detection
    this.previousMouseState = this.inputState.mouse.isDown;
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Prevent default behavior for game keys
    document.addEventListener('keydown', e => {
      const allKeys = Object.values(this.keyBindings).flat();
      if (allKeys.includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Setup canvas-specific event listeners
   */
  private setupCanvasListeners(): void {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener(
      'mouseleave',
      this.handleMouseLeave.bind(this),
    );

    // Touch events for mobile support with passive options for better performance
    this.canvas.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this),
      { passive: false }, // Need to prevent default for touch control
    );
    this.canvas.addEventListener(
      'touchend', 
      this.handleTouchEnd.bind(this),
      { passive: false },
    );
    this.canvas.addEventListener(
      'touchmove', 
      this.handleTouchMove.bind(this),
      { passive: false },
    );
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.inputState.keys[event.code] = true;
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.inputState.keys[event.code] = false;
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    this.inputState.mouse.isDown = true;
    this.inputState.mouse.button = event.button;
    this.updateMousePosition(event);
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_event: MouseEvent): void {
    this.inputState.mouse.isDown = false;
    this.inputState.mouse.button = -1;
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(): void {
    this.inputState.mouse.isDown = false;
    this.inputState.mouse.button = -1;
  }

  /**
   * Handle touch start events (supports multi-touch)
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    // Track all new touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.inputState.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }
    
    // Maintain backwards compatibility with mouse state
    if (event.touches.length > 0) {
      this.inputState.mouse.isDown = true;
      this.updateTouchPosition(event.touches[0]);
      
      // Only log touch start in debug builds
      if (process.env.NODE_ENV === 'development') {
        logger.debug('🤏 Touch start detected', { 
          touchCount: event.touches.length,
          activeTouches: this.inputState.touches.size,
          leftInput: this.getLeftSideInput(),
          rightInput: this.getRightSideInput(),
        }, 'InputManager');
      }
    }
  }

  /**
   * Handle touch end events (supports multi-touch)
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    // Remove ended touches by finding which touches are no longer in the touches array
    const activeTouchIds = new Set(Array.from(event.touches).map(t => t.identifier));
    
    // Remove touches that are no longer active
    for (const [touchId] of this.inputState.touches) {
      if (!activeTouchIds.has(touchId)) {
        this.inputState.touches.delete(touchId);
      }
    }
    
    // Update mouse state based on remaining touches
    if (event.touches.length === 0) {
      this.inputState.mouse.isDown = false;
    } else {
      // Update mouse position to first remaining touch
      this.updateTouchPosition(event.touches[0]);
    }
    
    // Only log touch end in debug builds
    if (process.env.NODE_ENV === 'development') {
      logger.debug('🤏 Touch end detected', {
        remainingTouches: this.inputState.touches.size,
      }, 'InputManager');
    }
  }

  /**
   * Handle touch move events (supports multi-touch)
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    // Update all active touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.inputState.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }
    
    // Maintain backwards compatibility with mouse position
    if (event.touches.length > 0) {
      this.updateTouchPosition(event.touches[0]);
      
      // Only log when there's actual input and in debug builds
      if (process.env.NODE_ENV === 'development') {
        const leftInput = this.getLeftSideInput();
        const rightInput = this.getRightSideInput();
        if ((leftInput !== 0 || rightInput !== 0) && Math.random() < 0.01) { // 1% chance when active
          logger.debug('🤏 Touch move active', { 
            touchCount: event.touches.length,
            activeTouches: this.inputState.touches.size,
            leftInput: leftInput.toFixed(2),
            rightInput: rightInput.toFixed(2),
          }, 'InputManager');
        }
      }
    }
  }

  /**
   * Update mouse position from mouse event
   */
  private updateMousePosition(event: MouseEvent): void {
    this.inputState.mouse.x = event.clientX;
    this.inputState.mouse.y = event.clientY;
  }

  /**
   * Update mouse position from touch event
   */
  private updateTouchPosition(touch: Touch): void {
    this.inputState.mouse.x = touch.clientX;
    this.inputState.mouse.y = touch.clientY;
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));

    if (this.canvas) {
      this.canvas.removeEventListener(
        'mousedown',
        this.handleMouseDown.bind(this),
      );
      this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
      this.canvas.removeEventListener(
        'mousemove',
        this.handleMouseMove.bind(this),
      );
      this.canvas.removeEventListener(
        'mouseleave',
        this.handleMouseLeave.bind(this),
      );
      this.canvas.removeEventListener(
        'touchstart',
        this.handleTouchStart.bind(this),
        { passive: false } as any,
      );
      this.canvas.removeEventListener(
        'touchend',
        this.handleTouchEnd.bind(this),
        { passive: false } as any,
      );
      this.canvas.removeEventListener(
        'touchmove',
        this.handleTouchMove.bind(this),
        { passive: false } as any,
      );
    }
  }
}

// Circuit Breaker - Scaling Manager
// Handles dynamic canvas scaling while maintaining integer font scaling

import { logger } from './Logger';

export interface ScalingConfig {
  baseWidth: number;
  baseHeight: number;
  minScale: number;
  maxScale: number;
  forceIntegerScaling: boolean;
}

export interface ScalingResult {
  scale: number;
  displayWidth: number;
  displayHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number;
  offsetY: number;
}

export class ScalingManager {
  private static instance: ScalingManager;
  private config: ScalingConfig;
  private currentScale: number = 1;
  private resizeCallbacks: Array<(result: ScalingResult) => void> = [];

  private constructor(config: ScalingConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  public static getInstance(config?: ScalingConfig): ScalingManager {
    if (!ScalingManager.instance) {
      if (!config) {
        throw new Error('ScalingManager must be initialized with config first');
      }
      ScalingManager.instance = new ScalingManager(config);
    }
    return ScalingManager.instance;
  }

  /**
   * Calculate optimal scaling based on window size
   */
  public calculateScaling(): ScalingResult {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate scale factors for both dimensions
    const scaleX = windowWidth / this.config.baseWidth;
    const scaleY = windowHeight / this.config.baseHeight;
    
    // Use the smaller scale to ensure the game fits in the window
    let scale = Math.min(scaleX, scaleY);
    
    // Apply min/max constraints
    scale = Math.max(this.config.minScale, Math.min(this.config.maxScale, scale));
    
    // Force integer scaling if enabled (important for pixel-perfect fonts)
    if (this.config.forceIntegerScaling) {
      scale = Math.floor(scale);
      // Ensure we have at least 1x scale
      scale = Math.max(1, scale);
    }
    
    // Calculate final dimensions
    const displayWidth = this.config.baseWidth * scale;
    const displayHeight = this.config.baseHeight * scale;
    
    // Calculate centering offsets
    const offsetX = (windowWidth - displayWidth) / 2;
    const offsetY = (windowHeight - displayHeight) / 2;
    
    // Canvas dimensions account for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = displayWidth * dpr;
    const canvasHeight = displayHeight * dpr;

    const result: ScalingResult = {
      scale,
      displayWidth,
      displayHeight,
      canvasWidth,
      canvasHeight,
      offsetX,
      offsetY
    };

    this.currentScale = scale;
    
    logger.debug(`📐 Scaling calculated: ${scale}x (${displayWidth}x${displayHeight})`, null, 'ScalingManager');
    
    return result;
  }

  /**
   * Apply scaling to a canvas element
   */
  public applyScaling(canvas: HTMLCanvasElement, container?: HTMLElement): ScalingResult {
    const scaling = this.calculateScaling();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal dimensions (high-DPI aware)
    canvas.width = scaling.canvasWidth;
    canvas.height = scaling.canvasHeight;

    // Set canvas display dimensions
    canvas.style.width = `${scaling.displayWidth}px`;
    canvas.style.height = `${scaling.displayHeight}px`;

    // Center the canvas in its container
    if (container) {
      container.style.position = 'relative';
      canvas.style.position = 'absolute';
      canvas.style.left = `${scaling.offsetX}px`;
      canvas.style.top = `${scaling.offsetY}px`;
    }

    // Configure canvas context for high-DPI and scaling
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Apply device pixel ratio scaling
      ctx.scale(dpr, dpr);
      
      // Apply game scaling
      ctx.scale(scaling.scale, scaling.scale);

      // Enable crisp pixel rendering
      ctx.imageSmoothingEnabled = false;
      
      logger.debug(`🎨 Canvas scaled: ${scaling.canvasWidth}x${scaling.canvasHeight} -> ${scaling.displayWidth}x${scaling.displayHeight}`, null, 'ScalingManager');
    }

    return scaling;
  }

  /**
   * Register a callback for resize events
   */
  public onResize(callback: (result: ScalingResult) => void): void {
    this.resizeCallbacks.push(callback);
  }

  /**
   * Remove a resize callback
   */
  public offResize(callback: (result: ScalingResult) => void): void {
    const index = this.resizeCallbacks.indexOf(callback);
    if (index > -1) {
      this.resizeCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current scale factor
   */
  public getCurrentScale(): number {
    return this.currentScale;
  }

  /**
   * Convert screen coordinates to game coordinates
   */
  public screenToGame(screenX: number, screenY: number): { x: number; y: number } {
    const scaling = this.calculateScaling();
    
    // Adjust for container offset
    const adjustedX = screenX - scaling.offsetX;
    const adjustedY = screenY - scaling.offsetY;
    
    // Convert to game coordinates
    const gameX = adjustedX / scaling.scale;
    const gameY = adjustedY / scaling.scale;
    
    return { x: gameX, y: gameY };
  }

  /**
   * Convert game coordinates to screen coordinates
   */
  public gameToScreen(gameX: number, gameY: number): { x: number; y: number } {
    const scaling = this.calculateScaling();
    
    // Convert to screen coordinates
    const screenX = gameX * scaling.scale + scaling.offsetX;
    const screenY = gameY * scaling.scale + scaling.offsetY;
    
    return { x: screenX, y: screenY };
  }

  /**
   * Setup event listeners for window resize
   */
  private setupEventListeners(): void {
    let resizeTimeout: NodeJS.Timeout;
    
    window.addEventListener('resize', () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const scaling = this.calculateScaling();
        
        // Notify all callbacks
        this.resizeCallbacks.forEach(callback => {
          try {
            callback(scaling);
          } catch (error) {
            logger.error('❌ Error in resize callback:', error, 'ScalingManager');
          }
        });
      }, 100);
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug('🔧 ScalingManager config updated', null, 'ScalingManager');
  }

  /**
   * Get current configuration
   */
  public getConfig(): ScalingConfig {
    return { ...this.config };
  }
} 
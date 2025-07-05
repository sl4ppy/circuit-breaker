// Circuit Breaker - Renderer
// Handles canvas drawing and visual effects

import { Debug } from '../utils/Debug'

export class Renderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width: number = 800
  private height: number = 600

  constructor() {
    Debug.log('🎨 Renderer initialized')
  }

  /**
   * Initialize the renderer with a canvas
   */
  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    
    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas')
    }

    this.width = canvas.width
    this.height = canvas.height
    
    Debug.log(`Renderer initialized with canvas: ${this.width}x${this.height}`)
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    if (!this.ctx) return
    
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Render the game
   */
  public render(): void {
    if (!this.ctx) return

    // TODO: Implement rendering
    // - Clear canvas
    // - Draw background
    // - Draw game objects
    // - Draw UI elements
    // - Apply visual effects
  }

  /**
   * Get canvas context
   */
  public getContext(): CanvasRenderingContext2D | null {
    return this.ctx
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  /**
   * Resize the renderer
   */
  public resize(width: number, height: number): void {
    if (!this.canvas) return

    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    
    Debug.log(`Renderer resized to: ${width}x${height}`)
  }
} 
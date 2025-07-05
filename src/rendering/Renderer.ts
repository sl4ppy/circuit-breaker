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
   * Draw a tilting bar with neon cyberpunk styling
   */
  public drawTiltingBar(bar: any): void {
    if (!this.ctx) return

    const endpoints = bar.getEndpoints()
    
    // Save context
    this.ctx.save()
    
    // Draw glow effect
    this.ctx.shadowColor = bar.glowColor
    this.ctx.shadowBlur = 20
    this.ctx.lineWidth = bar.thickness + 4
    this.ctx.strokeStyle = bar.glowColor
    this.ctx.globalAlpha = 0.3
    
    this.ctx.beginPath()
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y)
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y)
    this.ctx.stroke()
    
    // Draw main bar
    this.ctx.shadowBlur = 0
    this.ctx.globalAlpha = 1
    this.ctx.lineWidth = bar.thickness
    this.ctx.strokeStyle = bar.color
    
    this.ctx.beginPath()
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y)
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y)
    this.ctx.stroke()
    
    // Draw center pivot point
    this.ctx.fillStyle = bar.color
    this.ctx.beginPath()
    this.ctx.arc(bar.position.x, bar.position.y, 6, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Draw side height indicators
    this.ctx.fillStyle = `rgba(0, 255, 255, 0.7)`
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'center'
    
    // Left side indicator (show as height from bottom)
    const leftHeight = 640 - bar.leftSideHeight
    this.ctx.fillText(`L: ${leftHeight.toFixed(0)}`, bar.position.x - bar.width/4, Math.min(bar.leftSideHeight, bar.rightSideHeight) - 25)
    
    // Right side indicator (show as height from bottom)
    const rightHeight = 640 - bar.rightSideHeight
    this.ctx.fillText(`R: ${rightHeight.toFixed(0)}`, bar.position.x + bar.width/4, Math.min(bar.leftSideHeight, bar.rightSideHeight) - 25)
    
    // Overall tilt indicator
    const tiltPercentage = bar.getTiltPercentage()
    this.ctx.fillText(`Tilt: ${(tiltPercentage * 100).toFixed(0)}%`, bar.position.x, Math.min(bar.leftSideHeight, bar.rightSideHeight) - 40)
    
    // Restore context
    this.ctx.restore()
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
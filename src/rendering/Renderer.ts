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
   * Draw an obstacle with neon cyberpunk styling
   */
  public drawObstacle(obstacle: any): void {
    if (!this.ctx) return

    this.ctx.save()
    
    const centerX = obstacle.position.x + obstacle.size.x / 2
    const centerY = obstacle.position.y + obstacle.size.y / 2
    
    switch (obstacle.type) {
      case 'electrical_hazard':
        // Draw electrical hazard with sparking effect
        this.ctx.shadowColor = '#ff0080'
        this.ctx.shadowBlur = obstacle.isActive ? 15 : 5
        this.ctx.fillStyle = obstacle.isActive ? '#ff0080' : '#880040'
        this.ctx.strokeStyle = '#ff44aa'
        this.ctx.lineWidth = 2
        
        // Draw main hazard rectangle
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        
        // Draw sparks if active
        if (obstacle.isActive) {
          this.drawElectricalSparks(centerX, centerY, obstacle.size.x)
        }
        
        // Draw warning symbol
        this.ctx.fillStyle = '#ffff00'
        this.ctx.font = '12px monospace'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('⚡', centerX, centerY + 4)
        break
        
      case 'barrier':
        // Draw solid barrier
        this.ctx.shadowColor = '#00ffff'
        this.ctx.shadowBlur = 10
        this.ctx.fillStyle = '#006677'
        this.ctx.strokeStyle = '#00ffff'
        this.ctx.lineWidth = 2
        
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        break
        
      case 'hole':
        // Draw hole/pit
        this.ctx.shadowColor = '#ff4400'
        this.ctx.shadowBlur = 8
        this.ctx.fillStyle = '#220000'
        this.ctx.strokeStyle = '#ff4400'
        this.ctx.lineWidth = 2
        
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        break
    }
    
    this.ctx.restore()
  }

  /**
   * Draw electrical sparks effect
   */
  private drawElectricalSparks(centerX: number, centerY: number, size: number): void {
    if (!this.ctx) return

    this.ctx.save()
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 1
    this.ctx.globalAlpha = 0.8
    
    // Draw random spark lines
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const length = Math.random() * size * 0.5
      const startX = centerX + Math.cos(angle) * 5
      const startY = centerY + Math.sin(angle) * 5
      const endX = startX + Math.cos(angle) * length
      const endY = startY + Math.sin(angle) * length
      
      this.ctx.beginPath()
      this.ctx.moveTo(startX, startY)
      this.ctx.lineTo(endX, endY)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }

  /**
   * Draw a target port with glow effect
   */
  public drawTargetPort(port: any): void {
    if (!this.ctx) return

    this.ctx.save()
    
    // Draw outer glow
    this.ctx.shadowColor = port.color
    this.ctx.shadowBlur = 20 * port.glowIntensity
    this.ctx.fillStyle = port.color
    this.ctx.globalAlpha = 0.3 * port.glowIntensity
    
    this.ctx.beginPath()
    this.ctx.arc(port.position.x, port.position.y, port.radius + 10, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Draw main port circle
    this.ctx.globalAlpha = port.isCompleted ? 0.5 : 0.8
    this.ctx.shadowBlur = 10
    this.ctx.fillStyle = port.isCompleted ? '#333333' : port.color
    
    this.ctx.beginPath()
    this.ctx.arc(port.position.x, port.position.y, port.radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Draw port ring
    this.ctx.globalAlpha = 1
    this.ctx.strokeStyle = port.isCompleted ? '#666666' : port.color
    this.ctx.lineWidth = 3
    this.ctx.shadowBlur = 5
    
    this.ctx.beginPath()
    this.ctx.arc(port.position.x, port.position.y, port.radius, 0, Math.PI * 2)
    this.ctx.stroke()
    
    // Draw center indicator
    if (!port.isCompleted) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.shadowBlur = 0
      this.ctx.beginPath()
      this.ctx.arc(port.position.x, port.position.y, 4, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // Draw completion checkmark
    if (port.isCompleted) {
      this.ctx.strokeStyle = '#00ff00'
      this.ctx.lineWidth = 3
      this.ctx.shadowBlur = 0
      this.ctx.beginPath()
      this.ctx.moveTo(port.position.x - 8, port.position.y)
      this.ctx.lineTo(port.position.x - 2, port.position.y + 6)
      this.ctx.lineTo(port.position.x + 8, port.position.y - 6)
      this.ctx.stroke()
    }
    
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
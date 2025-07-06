// Circuit Breaker - Renderer
// Handles canvas drawing and visual effects

import { Debug } from '../utils/Debug'
import { fontManager } from '../utils/FontManager'

export class Renderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width: number = 800
  private height: number = 600
  
  // Sprite images
  private ballSprite: HTMLImageElement | null = null
  private spritesLoaded: boolean = false

  constructor() {
    Debug.log('🎨 Renderer initialized')
    this.loadSprites()
  }

  /**
   * Load sprite images
   */
  private async loadSprites(): Promise<void> {
    try {
      this.ballSprite = new Image()
      this.ballSprite.src = '/assets/sprites/ball_01.png'
      
      await new Promise((resolve, reject) => {
        this.ballSprite!.onload = resolve
        this.ballSprite!.onerror = reject
      })
      
      this.spritesLoaded = true
      Debug.log('🎨 Ball sprite loaded successfully')
    } catch (error) {
      Debug.log('❌ Failed to load ball sprite:', error)
      this.spritesLoaded = false
    }
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
   * Draw a hole with appropriate styling based on whether it's a goal or regular hole
   */
  public drawHole(hole: any, isCompleted: boolean = false): void {
    if (!this.ctx) return

    this.ctx.save()
    
    if (hole.isGoal) {
      if (isCompleted) {
        // Completed goal hole - dimmed with checkmark
        this.ctx.shadowColor = '#00aa00'
        this.ctx.shadowBlur = 10
        this.ctx.fillStyle = '#003300'
        this.ctx.globalAlpha = 0.6
        
        // Draw outer completed glow
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius + 10, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Draw main completed goal hole
        this.ctx.globalAlpha = 0.8
        this.ctx.shadowBlur = 8
        this.ctx.fillStyle = '#002200'
        
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Draw completed goal ring
        this.ctx.globalAlpha = 1
        this.ctx.strokeStyle = '#00aa00'
        this.ctx.lineWidth = 2
        this.ctx.shadowBlur = 5
        
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // Draw checkmark for completed goal
        this.ctx.fillStyle = '#00ff00'
        this.ctx.shadowBlur = 0
        fontManager.setFont(this.ctx, 'primary', 16)
        this.ctx.textAlign = 'center'
        this.ctx.fillText('✓', hole.position.x, hole.position.y + 5)
        
      } else {
        // Active goal hole - bright pulsing glow
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.005)
        
        // Draw outer glow
        this.ctx.shadowColor = '#00ff00'
        this.ctx.shadowBlur = 25 * pulseIntensity
        this.ctx.fillStyle = '#00ff00'
        this.ctx.globalAlpha = 0.3 * pulseIntensity
        
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius + 15, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Draw main goal hole
        this.ctx.globalAlpha = 0.8
        this.ctx.shadowBlur = 15
        this.ctx.fillStyle = '#004400'
        
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Draw goal ring
        this.ctx.globalAlpha = 1
        this.ctx.strokeStyle = '#00ff00'
        this.ctx.lineWidth = 3
        this.ctx.shadowBlur = 10
        
        this.ctx.beginPath()
        this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // Draw center goal indicator
        this.ctx.fillStyle = '#ffffff'
        this.ctx.shadowBlur = 0
        fontManager.setFont(this.ctx, 'primary', 12)
        this.ctx.textAlign = 'center'
        this.ctx.fillText('🎯', hole.position.x, hole.position.y + 4)
      }
      
    } else {
      // Regular hole - dark pit with red glow
      this.ctx.shadowColor = '#ff4400'
      this.ctx.shadowBlur = 8
      this.ctx.fillStyle = '#220000'
      
      this.ctx.beginPath()
      this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw hole ring
      this.ctx.strokeStyle = '#ff4400'
      this.ctx.lineWidth = 2
      this.ctx.shadowBlur = 5
      
      this.ctx.beginPath()
      this.ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // Draw inner darkness
      this.ctx.globalAlpha = 0.8
      this.ctx.fillStyle = '#000000'
      this.ctx.shadowBlur = 0
      
      this.ctx.beginPath()
      this.ctx.arc(hole.position.x, hole.position.y, hole.radius - 3, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
  }

  /**
   * Draw a ball using sprite image or fallback to chrome rendering
   */
  public drawChromeBall(ball: any, animationState?: { scale: number; opacity: number }): void {
    if (!this.ctx) return

    this.ctx.save()

    const x = ball.position.x
    const y = ball.position.y
    const radius = ball.radius
    const scale = animationState?.scale || 1
    const opacity = animationState?.opacity || 1

    // Set global opacity for animation
    this.ctx.globalAlpha = opacity

    // Use sprite if loaded, otherwise fallback to procedural rendering
    if (this.spritesLoaded && this.ballSprite) {
      // Draw sprite-based ball
      const spriteSize = radius * 2 * scale
      
      // Draw shadow behind sprite
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      this.ctx.beginPath()
      this.ctx.arc(x + radius * scale * 0.1, y + radius * scale * 0.1, radius * scale, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw the ball sprite
      this.ctx.drawImage(
        this.ballSprite,
        x - spriteSize / 2,  // Center horizontally
        y - spriteSize / 2,  // Center vertically
        spriteSize,          // Width
        spriteSize           // Height
      )
    } else {
      // Fallback to procedural chrome rendering
      const scaledRadius = radius * scale

      // Create main ball gradient (chrome base)
      const mainGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.3, y - scaledRadius * 0.3, 0,
        x, y, scaledRadius
      )
      mainGradient.addColorStop(0, '#ffffff')      // Bright highlight
      mainGradient.addColorStop(0.1, '#e6e6e6')    // Light chrome
      mainGradient.addColorStop(0.3, '#cccccc')    // Medium chrome
      mainGradient.addColorStop(0.6, '#999999')    // Dark chrome
      mainGradient.addColorStop(0.8, '#666666')    // Darker chrome
      mainGradient.addColorStop(1, '#333333')      // Shadow edge

      // Draw main ball shadow (behind ball)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      this.ctx.beginPath()
      this.ctx.arc(x + scaledRadius * 0.1, y + scaledRadius * 0.1, scaledRadius, 0, Math.PI * 2)
      this.ctx.fill()

      // Draw main chrome ball
      this.ctx.fillStyle = mainGradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, scaledRadius, 0, Math.PI * 2)
      this.ctx.fill()

      // Create secondary reflection gradient
      const reflectionGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.4, y - scaledRadius * 0.4, 0,
        x - scaledRadius * 0.2, y - scaledRadius * 0.2, scaledRadius * 0.6
      )
      reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      reflectionGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
      reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      // Draw secondary reflection
      this.ctx.fillStyle = reflectionGradient
      this.ctx.beginPath()
      this.ctx.arc(x - scaledRadius * 0.2, y - scaledRadius * 0.2, scaledRadius * 0.6, 0, Math.PI * 2)
      this.ctx.fill()

      // Create primary highlight
      const highlightGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.3, y - scaledRadius * 0.3, 0,
        x - scaledRadius * 0.3, y - scaledRadius * 0.3, scaledRadius * 0.4
      )
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)')
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      // Draw primary highlight
      this.ctx.fillStyle = highlightGradient
      this.ctx.beginPath()
      this.ctx.arc(x - scaledRadius * 0.3, y - scaledRadius * 0.3, scaledRadius * 0.4, 0, Math.PI * 2)
      this.ctx.fill()

      // Add small specular highlights
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      this.ctx.beginPath()
      this.ctx.arc(x - scaledRadius * 0.4, y - scaledRadius * 0.4, scaledRadius * 0.15, 0, Math.PI * 2)
      this.ctx.fill()

      // Add tiny bright spot
      this.ctx.fillStyle = 'rgba(255, 255, 255, 1)'
      this.ctx.beginPath()
      this.ctx.arc(x - scaledRadius * 0.35, y - scaledRadius * 0.35, scaledRadius * 0.08, 0, Math.PI * 2)
      this.ctx.fill()

      // Add environment reflection (cyberpunk colors)
      const envGradient = this.ctx.createRadialGradient(
        x + scaledRadius * 0.3, y + scaledRadius * 0.2, 0,
        x + scaledRadius * 0.3, y + scaledRadius * 0.2, scaledRadius * 0.5
      )
      envGradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)')  // Cyan reflection
      envGradient.addColorStop(0.3, 'rgba(255, 0, 102, 0.1)') // Pink reflection
      envGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      this.ctx.fillStyle = envGradient
      this.ctx.beginPath()
      this.ctx.arc(x + scaledRadius * 0.3, y + scaledRadius * 0.2, scaledRadius * 0.5, 0, Math.PI * 2)
      this.ctx.fill()
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
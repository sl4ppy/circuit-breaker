// Circuit Breaker - Renderer
// Handles canvas drawing and visual effects

import { Debug } from '../utils/Debug'
import { fontManager } from '../utils/FontManager'
import { spriteAtlas } from './SpriteAtlas'

export class Renderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width: number = 800
  private height: number = 600
  
  // Sprite images
  private backgroundSprite: HTMLImageElement | null = null
  private spritesLoaded: boolean = false

  constructor() {
    Debug.log('🎨 Renderer initialized')
    this.loadSprites()
  }

  /**
   * Load sprite images and atlas
   */
  private async loadSprites(): Promise<void> {
    try {
      // Load background sprite (using relative paths for GitHub Pages compatibility)
      this.backgroundSprite = new Image()
      this.backgroundSprite.src = './assets/sprites/playfield_background_02.png'
      
      // Load sprite atlas
      const atlasPromise = spriteAtlas.load()
      
      // Wait for background and atlas to load with individual error handling
      const spritePromises = [
        new Promise<string>((resolve, reject) => {
          this.backgroundSprite!.onload = () => resolve('background')
          this.backgroundSprite!.onerror = (e) => reject({ sprite: 'background', error: e })
        }),
        atlasPromise.then(() => 'atlas').catch((e) => Promise.reject({ sprite: 'atlas', error: e }))
      ]
      
      const results = await Promise.allSettled(spritePromises)
      
      let loadedCount = 0
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          loadedCount++
          Debug.log(`✅ ${result.value} loaded successfully`)
        } else {
          const { sprite, error } = result.reason
          Debug.log(`❌ Failed to load ${sprite}:`, error)
        }
      })
      
      // Consider sprites loaded if at least one loads (background is optional, atlas provides balls)
      this.spritesLoaded = loadedCount > 0
      
      if (loadedCount === 2) {
        Debug.log('🎨 All sprites and atlas loaded successfully')
      } else if (loadedCount === 1) {
        Debug.log('⚠️ Some sprites loaded, game will use fallbacks where needed')
      } else {
        Debug.log('❌ No sprites loaded, game will use fallbacks')
      }
      
    } catch (error) {
      Debug.log('❌ Sprite loading system failed:', error)
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
   * Draw the playfield background
   */
  public drawBackground(): void {
    if (!this.ctx) return

    if (this.backgroundSprite && this.spritesLoaded) {
      // Draw the background image scaled to fit the playfield (360x640)
      this.ctx.drawImage(this.backgroundSprite, 0, 0, 360, 640)
    } else {
      // Fallback to solid color background if image not loaded
      this.ctx.fillStyle = '#1a1a1a'
      this.ctx.fillRect(0, 0, 360, 640)
    }
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
   * Draw a tilting bar with neon cyberpunk styling using tiled sprites
   */
  public drawTiltingBar(bar: any): void {
    if (!this.ctx) return

    const endpoints = bar.getEndpoints()
    
    // Save context
    this.ctx.save()
    
    // Draw glow effect FIRST (behind the sprites)
    this.ctx.shadowColor = bar.glowColor
    this.ctx.shadowBlur = 20
    this.ctx.lineWidth = bar.thickness + 4
    this.ctx.strokeStyle = bar.glowColor
    this.ctx.globalAlpha = 0.3
    
    this.ctx.beginPath()
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y)
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y)
    this.ctx.stroke()
    
    // Reset shadow effects for sprite rendering
    this.ctx.shadowBlur = 0
    this.ctx.shadowColor = 'transparent'
    this.ctx.globalAlpha = 1
    
    // Use sprite atlas if available, otherwise fallback to line rendering
    if (this.spritesLoaded && spriteAtlas.isAtlasLoaded()) {
      const barFrame = spriteAtlas.getFrame('bar_normal')
      
      if (barFrame) {
        // Calculate bar properties
        const barLength = Math.sqrt(
          Math.pow(endpoints.end.x - endpoints.start.x, 2) + 
          Math.pow(endpoints.end.y - endpoints.start.y, 2)
        )
        const barAngle = Math.atan2(
          endpoints.end.y - endpoints.start.y, 
          endpoints.end.x - endpoints.start.x
        )
        
        // Calculate scaling and tiling
        const spriteScale = bar.thickness / barFrame.h  // Scale to match bar thickness
        const scaledSpriteWidth = barFrame.w * spriteScale
        const tilesNeeded = Math.ceil(barLength / scaledSpriteWidth)
        
        // Calculate the center point of the actual bar (between endpoints)
        const barCenterX = (endpoints.start.x + endpoints.end.x) / 2
        const barCenterY = (endpoints.start.y + endpoints.end.y) / 2
        
        // Set up transformation matrix for rotation and positioning
        this.ctx.translate(barCenterX, barCenterY)
        this.ctx.rotate(barAngle)
        
        // Tile the bar sprite along the length
        for (let i = 0; i < tilesNeeded; i++) {
          const tileX = (i * scaledSpriteWidth) - (barLength / 2)
          const tileY = -bar.thickness / 2
          
          // Clip the last tile if it extends beyond the bar length
          const remainingLength = barLength - (i * scaledSpriteWidth)
          const tileWidth = Math.min(scaledSpriteWidth, remainingLength)
          
          if (tileWidth > 0) {
            // Save context for potential clipping
            this.ctx.save()
            
            // Clip if this is a partial tile
            if (tileWidth < scaledSpriteWidth) {
              this.ctx.beginPath()
              this.ctx.rect(tileX, tileY, tileWidth, bar.thickness)
              this.ctx.clip()
            }
            
            // Draw the sprite tile
            spriteAtlas.drawSprite(
              this.ctx,
              'bar_normal',
              tileX,
              tileY,
              spriteScale
            )
            
            this.ctx.restore()
          }
        }
        
        // Reset transformation for pivot point
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      } else {
        // Fallback to line rendering if sprite not found
        this.renderBarFallback(endpoints, bar)
      }
    } else {
      // Fallback to line rendering if atlas not loaded
      this.renderBarFallback(endpoints, bar)
    }
    
    // Draw center pivot point (always rendered)
    this.ctx.fillStyle = bar.color
    this.ctx.beginPath()
    this.ctx.arc(bar.position.x, bar.position.y, 6, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Restore context
    this.ctx.restore()
  }
  
  /**
   * Fallback bar rendering using lines
   */
  private renderBarFallback(endpoints: any, bar: any): void {
    if (!this.ctx) return
    
    this.ctx.lineWidth = bar.thickness
    this.ctx.strokeStyle = bar.color
    
    this.ctx.beginPath()
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y)
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y)
    this.ctx.stroke()
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
        this.ctx.shadowColor = '#b600f9' // Neon Purple
        this.ctx.shadowBlur = obstacle.isActive ? 15 : 5
        this.ctx.fillStyle = obstacle.isActive ? '#b600f9' : '#660066' // Neon Purple
        this.ctx.strokeStyle = '#d466ff' // Lighter purple
        this.ctx.lineWidth = 2
        
        // Draw main hazard rectangle
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        
        // Draw sparks if active
        if (obstacle.isActive) {
          this.drawElectricalSparks(centerX, centerY, obstacle.size.x)
        }
        
        // Draw warning symbol
        this.ctx.fillStyle = '#00ff99' // Acid Green
        this.ctx.font = '12px monospace'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('⚡', centerX, centerY + 4)
        break
        
      case 'barrier':
        // Draw solid barrier
        this.ctx.shadowColor = '#00f0ff' // Electric Blue
        this.ctx.shadowBlur = 10
        this.ctx.fillStyle = '#006677' // Darker blue
        this.ctx.strokeStyle = '#00f0ff' // Electric Blue
        this.ctx.lineWidth = 2
        
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        break
        
      case 'hole':
        // Draw hole/pit
        this.ctx.shadowColor = '#b600f9' // Neon Purple
        this.ctx.shadowBlur = 8
        this.ctx.fillStyle = '#220000' // Dark red
        this.ctx.strokeStyle = '#b600f9' // Neon Purple
        this.ctx.lineWidth = 2
        
        this.ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        this.ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.size.x, obstacle.size.y)
        break
        
      default:
        // Draw generic obstacle
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 2
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
   * Draw target port with neon cyberpunk styling
   */
  public drawTargetPort(port: any): void {
    if (!this.ctx) return

    this.ctx.save()
    
    const centerX = port.position.x
    const centerY = port.position.y
    
    // Draw outer glow
    this.ctx.shadowColor = port.color
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = port.color
    this.ctx.globalAlpha = 0.3
    
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, port.radius + 10, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
    
    // Draw port circle
    this.ctx.fillStyle = port.isCompleted ? '#333333' : port.color
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, port.radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Draw port outline
    this.ctx.strokeStyle = port.isCompleted ? '#666666' : port.color
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, port.radius, 0, Math.PI * 2)
    this.ctx.stroke()
    
    // Draw port symbol
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '16px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(port.isCompleted ? '✓' : '○', centerX, centerY + 6)
    
    this.ctx.restore()
  }

  /**
   * Draw a hole using sprite atlas or fallback to neon cyberpunk styling
   */
  public drawHole(hole: any, isCompleted: boolean = false, debugMode: boolean = false): void {
    if (!this.ctx) return

    this.ctx.save()
    
    const centerX = hole.position.x
    const centerY = hole.position.y
    const isGoalHole = hole.isGoal
    
    // Make holes 20% bigger for better visibility
    const enlargedRadius = hole.radius * 1.2
    
    // Choose colors based on hole type
    const activeColor = isGoalHole ? '#ff6600' : '#00ff99' // Neon Orange for goals, Acid Green for regular holes
    const darkColor = isGoalHole ? '#441100' : '#004400' // Dark orange vs dark green
    const darkerColor = isGoalHole ? '#220000' : '#002200' // Darker orange vs darker green
    
    // Use sprite atlas if available, otherwise fallback to procedural rendering
    if (this.spritesLoaded && spriteAtlas.isAtlasLoaded()) {
      // Choose sprite based on hole type
      const spriteName = isGoalHole ? 'ball_whole_powerup' : 'ball_whole_normal'
      const holeFrame = spriteAtlas.getFrame(spriteName)
      
      if (holeFrame) {
        // Calculate scaling to fit the enlarged hole radius
        const targetSize = enlargedRadius * 2
        const spriteScale = targetSize / Math.max(holeFrame.w, holeFrame.h)
        
        // Draw outer glow first (behind sprite) - only in debug mode
        if (debugMode) {
          this.ctx.strokeStyle = activeColor
          this.ctx.lineWidth = 3
          this.ctx.globalAlpha = 0.5
          
          this.ctx.beginPath()
          this.ctx.arc(centerX, centerY, enlargedRadius + 5, 0, Math.PI * 2)
          this.ctx.stroke()
          
          this.ctx.globalAlpha = 1
        }
        
        // Draw hole sprite
        if (isCompleted) {
          // Dimmed for completed holes
          this.ctx.globalAlpha = 0.6
        }
        
        spriteAtlas.drawSprite(
          this.ctx,
          spriteName,
          centerX - (holeFrame.w * spriteScale) / 2,  // Center horizontally
          centerY - (holeFrame.h * spriteScale) / 2,  // Center vertically
          spriteScale
        )
        
        this.ctx.globalAlpha = 1
        
        // Add completion indicator if needed
        if (isCompleted) {
          // Draw completion overlay
          this.ctx.fillStyle = activeColor
          this.ctx.globalAlpha = 0.3
          this.ctx.beginPath()
          this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2)
          this.ctx.fill()
          
          this.ctx.globalAlpha = 1
          
          // Draw checkmark
          this.ctx.fillStyle = activeColor
          this.ctx.font = '12px monospace'
          this.ctx.textAlign = 'center'
          this.ctx.fillText('✓', centerX, centerY + 4)
        }
      } else {
        // Fallback to procedural rendering if sprite not found
        this.renderHoleFallback(hole, isCompleted, centerX, centerY, isGoalHole, activeColor, darkColor, darkerColor, debugMode, enlargedRadius)
      }
    } else {
      // Fallback to procedural rendering if atlas not loaded
      this.renderHoleFallback(hole, isCompleted, centerX, centerY, isGoalHole, activeColor, darkColor, darkerColor, debugMode, enlargedRadius)
    }
    
    this.ctx.restore()
  }
  
  /**
   * Fallback hole rendering using procedural graphics
   */
  private renderHoleFallback(hole: any, isCompleted: boolean, centerX: number, centerY: number, isGoalHole: boolean, activeColor: string, darkColor: string, darkerColor: string, debugMode: boolean, enlargedRadius: number): void {
    if (!this.ctx) return
    
    // Draw outer glow - only in debug mode
    if (debugMode) {
      this.ctx.strokeStyle = activeColor
      this.ctx.lineWidth = 3
      this.ctx.globalAlpha = 0.5
      
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius + 5, 0, Math.PI * 2)
      this.ctx.stroke()
      
      this.ctx.globalAlpha = 1
    }
    
    // Draw hole interior
    if (isCompleted) {
      // Completed hole - show success state
      this.ctx.shadowColor = activeColor
      this.ctx.shadowBlur = 15
      this.ctx.fillStyle = darkerColor
      
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw completion indicator
      this.ctx.fillStyle = darkerColor
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius / 2, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw colored outline
      this.ctx.strokeStyle = activeColor
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // Draw checkmark
      this.ctx.fillStyle = activeColor
      this.ctx.font = '12px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('✓', centerX, centerY + 4)
    } else {
      // Active hole - show glowing state
      this.ctx.shadowColor = activeColor
      this.ctx.shadowBlur = isGoalHole ? 15 : 10 // Stronger glow for goal holes
      this.ctx.fillStyle = activeColor
      this.ctx.globalAlpha = isGoalHole ? 0.8 : 0.6 // Brighter for goal holes
      
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2)
      this.ctx.fill()
      
      this.ctx.globalAlpha = 1
      
      // Draw inner dark area
      this.ctx.fillStyle = darkColor
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius / 2, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Draw colored outline
      this.ctx.strokeStyle = activeColor
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // Draw symbol - different for goal vs regular holes
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '10px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(isGoalHole ? '🎯' : '●', centerX, centerY + 3)
    }
  }

  /**
   * Draw danger zone with neon cyberpunk styling
   */
  public drawDangerZone(zone: any): void {
    if (!this.ctx) return

    this.ctx.save()
    
    const centerX = zone.position.x + zone.width / 2
    const centerY = zone.position.y + zone.height / 2
    
    // Draw pulsing danger zone
    this.ctx.shadowColor = '#b600f9' // Neon Purple
    this.ctx.shadowBlur = 20
    this.ctx.fillStyle = '#220000' // Dark red
    this.ctx.globalAlpha = 0.7
    
    this.ctx.fillRect(zone.position.x, zone.position.y, zone.width, zone.height)
    
    this.ctx.globalAlpha = 1
    
    // Draw border
    this.ctx.strokeStyle = '#b600f9' // Neon Purple
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(zone.position.x, zone.position.y, zone.width, zone.height)
    
    // Draw warning symbol
    this.ctx.fillStyle = '#000000'
    this.ctx.font = '20px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('⚠', centerX, centerY + 8)
    
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

    // Use sprite atlas if loaded, otherwise fallback to procedural rendering
    if (this.spritesLoaded && spriteAtlas.isAtlasLoaded()) {
      // Draw sprite-based ball from atlas
      const targetSize = radius * 2 * scale
      const spriteFrame = spriteAtlas.getFrame('ball_normal')
      
      if (spriteFrame) {
        // Calculate scale to fit the ball size (64x64 sprite to ball diameter)
        const spriteScale = targetSize / spriteFrame.w
        
        // Draw shadow behind sprite
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        this.ctx.beginPath()
        this.ctx.arc(x + radius * scale * 0.1, y + radius * scale * 0.1, radius * scale, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Draw the ball sprite from atlas, centered on ball position
        spriteAtlas.drawSprite(
          this.ctx,
          'ball_normal',
          x - targetSize / 2,  // Center horizontally
          y - targetSize / 2,  // Center vertically
          spriteScale          // Scale factor to match ball size
        )
              } else {
        // Fallback if sprite not found - render procedurally inline
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

        // Add bright highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 1)'
        this.ctx.beginPath()
        this.ctx.arc(x - scaledRadius * 0.35, y - scaledRadius * 0.35, scaledRadius * 0.08, 0, Math.PI * 2)
        this.ctx.fill()
      }
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
   * Draw a sprite from the atlas with optional scaling and positioning
   */
  public drawAtlasSprite(
    spriteName: string, 
    x: number, 
    y: number, 
    scale: number = 1,
    centered: boolean = true
  ): boolean {
    if (!this.ctx || !spriteAtlas.isAtlasLoaded()) return false
    
    const frame = spriteAtlas.getFrame(spriteName)
    if (!frame) return false
    
    const drawX = centered ? x - (frame.w * scale) / 2 : x
    const drawY = centered ? y - (frame.h * scale) / 2 : y
    
    return spriteAtlas.drawSprite(this.ctx, spriteName, drawX, drawY, scale)
  }

  /**
   * Draw a flipper using atlas sprites
   */
  public drawFlipper(flipper: any, isLeft: boolean): void {
    if (!this.ctx) return
    
    const spriteName = isLeft ? 'flipper_left_down' : 'flipper_right_down'
    this.drawAtlasSprite(spriteName, flipper.position.x, flipper.position.y, 2)
  }

  /**
   * Draw a bumper using atlas sprites with animation
   */
  public drawBumper(bumper: any, isActive: boolean = false): void {
    if (!this.ctx) return
    
    const spriteName = isActive ? 'round_bumper_active' : 'round_bumper_idle'
    this.drawAtlasSprite(spriteName, bumper.position.x, bumper.position.y, 1.5)
  }

  /**
   * Draw a spinner with rotation animation
   */
  public drawSpinner(spinner: any, animationFrame: number = 1): void {
    if (!this.ctx) return
    
    // Cycle through spinner animation frames (1-4)
    const frame = Math.max(1, Math.min(4, animationFrame))
    const spriteName = `spinner_${frame}`
    this.drawAtlasSprite(spriteName, spinner.position.x, spinner.position.y, 2)
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
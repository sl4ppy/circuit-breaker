// Circuit Breaker - Renderer
// Handles canvas drawing and visual effects

import { Debug } from '../utils/Debug';
import { spriteAtlas } from './SpriteAtlas';
import { TiltingBar } from '../core/TiltingBar';
import { Hole } from '../core/Level';

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;

  // Sprite images
  private backgroundSprite: HTMLImageElement | null = null;
  private spritesLoaded: boolean = false;
  
  // Tinting support
  private currentTint: string | null = null;

  constructor() {
    Debug.log('🎨 Renderer initialized');
  }

  /**
   * Load sprite images and atlas
   */
  public async loadSprites(): Promise<void> {
    try {
      // Load background sprite (using relative paths for GitHub Pages compatibility)
      this.backgroundSprite = new Image();
      this.backgroundSprite.src =
        './assets/sprites/playfield_background_02.png';

      // Load sprite atlas
      const atlasPromise = spriteAtlas.load();

      // Wait for background and atlas to load with individual error handling
      const spritePromises = [
        new Promise<string>((resolve, reject) => {
          if (this.backgroundSprite) {
            this.backgroundSprite.onload = () => resolve('background');
            this.backgroundSprite.onerror = e =>
              reject({ sprite: 'background', error: e });
          } else {
            reject({ sprite: 'background', error: new Error('Background sprite not initialized') });
          }
        }),
        atlasPromise
          .then(() => 'atlas')
          .catch(e => Promise.reject({ sprite: 'atlas', error: e })),
      ];

      const results = await Promise.allSettled(spritePromises);

      let loadedCount = 0;
      results.forEach((result, _index) => {
        if (result.status === 'fulfilled') {
          loadedCount++;
          Debug.log(`✅ ${result.value} loaded successfully`);
        } else {
          const { sprite, error } = result.reason;
          Debug.log(`❌ Failed to load ${sprite}:`, error);
        }
      });

      // Consider sprites loaded if at least one loads (background is optional, atlas provides balls)
      this.spritesLoaded = loadedCount > 0;

      if (loadedCount === 2) {
        Debug.log('🎨 All sprites and atlas loaded successfully');
      } else if (loadedCount === 1) {
        Debug.log(
          '⚠️ Some sprites loaded, game will use fallbacks where needed',
        );
      } else {
        Debug.log('❌ No sprites loaded, game will use fallbacks');
      }
    } catch (error) {
      Debug.log('❌ Sprite loading system failed:', error);
      this.spritesLoaded = false;
    }
  }

  /**
   * Initialize the renderer with a canvas. Scaling is handled by ScalingManager.
   * @param canvas The HTMLCanvasElement to use for rendering.
   */
  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Store canvas dimensions (these will be updated by ScalingManager)
    this.width = canvas.width;
    this.height = canvas.height;

    // The ScalingManager handles all scaling setup including:
    // - Device pixel ratio scaling
    // - Integer scaling for sharp fonts
    // - Canvas size and display size
    // - Context transformation matrix
    
    Debug.log(`Renderer initialized with canvas: ${this.width}x${this.height} (scaling handled by ScalingManager)`);
  }

  /**
   * Clear the canvas.
   */
  public clear(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Draw the playfield background (neon cityscape or fallback color).
   */
  public drawBackground(): void {
    if (!this.ctx) return;

    if (this.backgroundSprite && this.spritesLoaded) {
      // Draw the background image scaled to fit the playfield (360x640)
      this.ctx.drawImage(this.backgroundSprite, 0, 0, 360, 640);
    } else {
      // Fallback to solid color background if image not loaded
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(0, 0, 360, 640);
    }
  }

  /**
   * Render the game (main entry point for all drawing).
   */
  public render(): void {
    if (!this.ctx) return;

    // TODO: Implement rendering
    // - Clear canvas
    // - Draw background
    // - Draw game objects
    // - Draw UI elements
    // - Apply visual effects
  }

  /**
   * Draw a tilting bar with neon cyberpunk styling using tiled sprites.
   * @param bar The TiltingBar instance to draw.
   */
  public drawTiltingBar(bar: TiltingBar): void {
    if (!this.ctx) return;
    
    const endpoints = bar.getEndpoints();

    // Save context
    this.ctx.save();

    // Draw glow effect FIRST (behind the sprites)
    this.ctx.shadowColor = bar.glowColor;
    this.ctx.shadowBlur = 20;
    this.ctx.lineWidth = bar.thickness + 4;
    this.ctx.strokeStyle = bar.glowColor;
    this.ctx.globalAlpha = 0.3;

    this.ctx.beginPath();
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y);
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y);
    this.ctx.stroke();

    // Reset shadow effects for sprite rendering
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
    this.ctx.globalAlpha = 1;

    // Use sprite atlas if available, otherwise fallback to line rendering
    const atlasLoaded = spriteAtlas.isAtlasLoaded();
    if (this.spritesLoaded && atlasLoaded) {
      const barFrame = spriteAtlas.getFrame('bar_normal');

      if (barFrame) {
        // Calculate bar properties
        const barLength = Math.sqrt(
          Math.pow(endpoints.end.x - endpoints.start.x, 2) +
            Math.pow(endpoints.end.y - endpoints.start.y, 2),
        );
        const barAngle = Math.atan2(
          endpoints.end.y - endpoints.start.y,
          endpoints.end.x - endpoints.start.x,
        );

        // Calculate scaling and tiling
        const spriteScale = bar.thickness / barFrame.frame.h; // Scale to match bar thickness
        const scaledSpriteWidth = barFrame.frame.w * spriteScale;
        const tilesNeeded = Math.ceil(barLength / scaledSpriteWidth);

        // Calculate the center point of the actual bar (between endpoints)
        const barCenterX = (endpoints.start.x + endpoints.end.x) / 2;
        const barCenterY = (endpoints.start.y + endpoints.end.y) / 2;

        // Set up transformation matrix for rotation and positioning
        this.ctx.translate(barCenterX, barCenterY);
        this.ctx.rotate(barAngle);

        // Tile the bar sprite along the length
        for (let i = 0; i < tilesNeeded; i++) {
          const tileX = i * scaledSpriteWidth - barLength / 2;
          const tileY = -bar.thickness / 2;

          // Clip the last tile if it extends beyond the bar length
          const remainingLength = barLength - i * scaledSpriteWidth;
          const tileWidth = Math.min(scaledSpriteWidth, remainingLength);

          if (tileWidth > 0) {
            // Save context for potential clipping
            this.ctx.save();

            // Clip if this is a partial tile
            if (tileWidth < scaledSpriteWidth) {
              this.ctx.beginPath();
              this.ctx.rect(tileX, tileY, tileWidth, bar.thickness);
              this.ctx.clip();
            }

            // Draw the sprite tile
            spriteAtlas.drawSprite(
              this.ctx,
              'bar_normal',
              tileX,
              tileY,
              spriteScale,
            );

            this.ctx.restore();
          }
        }

        // Reset transformation for pivot point
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        // Fallback to line rendering if sprite not found
        this.renderBarFallback(endpoints, bar);
      }
    } else {
      // Fallback to line rendering if atlas not loaded
      this.renderBarFallback(endpoints, bar);
    }

    // Draw center pivot point (always rendered)
    this.ctx.fillStyle = bar.color;
    this.ctx.beginPath();
    this.ctx.arc(bar.position.x, bar.position.y, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Restore context
    this.ctx.restore();
  }

  /**
   * Fallback bar rendering using lines
   */
  private renderBarFallback(endpoints: { start: { x: number; y: number }; end: { x: number; y: number } }, bar: TiltingBar): void {
    if (!this.ctx) return;

    this.ctx.lineWidth = bar.thickness;
    this.ctx.strokeStyle = bar.color;

    this.ctx.beginPath();
    this.ctx.moveTo(endpoints.start.x, endpoints.start.y);
    this.ctx.lineTo(endpoints.end.x, endpoints.end.y);
    this.ctx.stroke();
  }

  /**
   * Draw an obstacle with neon cyberpunk styling
   */
  public drawObstacle(obstacle: { position: { x: number; y: number }; size: { x: number; y: number }; type?: string; isActive?: boolean }): void {
    if (!this.ctx) return;

    this.ctx.save();

    const centerX = obstacle.position.x + obstacle.size.x / 2;
    const centerY = obstacle.position.y + obstacle.size.y / 2;

    switch (obstacle.type) {
    case 'electrical_hazard':
      // Draw electrical hazard with sparking effect
      this.ctx.shadowColor = '#b600f9'; // Neon Purple
      this.ctx.shadowBlur = obstacle.isActive ? 15 : 5;
      this.ctx.fillStyle = obstacle.isActive ? '#b600f9' : '#660066'; // Neon Purple
      this.ctx.strokeStyle = '#d466ff'; // Lighter purple
      this.ctx.lineWidth = 2;

      // Draw main hazard rectangle
      this.ctx.fillRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      this.ctx.strokeRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );

      // Draw sparks if active
      if (obstacle.isActive) {
        this.drawElectricalSparks(centerX, centerY, obstacle.size.x);
      }

      // Draw warning symbol
      this.ctx.fillStyle = '#00ff99'; // Acid Green
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡', centerX, centerY + 4);
      break;

    case 'barrier':
      // Draw solid barrier
      this.ctx.shadowColor = '#00f0ff'; // Electric Blue
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = '#006677'; // Darker blue
      this.ctx.strokeStyle = '#00f0ff'; // Electric Blue
      this.ctx.lineWidth = 2;

      this.ctx.fillRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      this.ctx.strokeRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      break;

    case 'hole':
      // Draw hole/pit
      this.ctx.shadowColor = '#b600f9'; // Neon Purple
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = '#220000'; // Dark red
      this.ctx.strokeStyle = '#b600f9'; // Neon Purple
      this.ctx.lineWidth = 2;

      this.ctx.fillRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      this.ctx.strokeRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      break;

    default:
      // Draw generic obstacle
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.size.x,
        obstacle.size.y,
      );
      break;
    }

    this.ctx.restore();
  }

  /**
   * Draw electrical sparks effect
   */
  private drawElectricalSparks(
    centerX: number,
    centerY: number,
    size: number,
  ): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;

    // Draw random spark lines
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = Math.random() * size * 0.5;
      const startX = centerX + Math.cos(angle) * 5;
      const startY = centerY + Math.sin(angle) * 5;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Draw target port with neon cyberpunk styling
   */
  public drawTargetPort(port: { position: { x: number; y: number }; radius: number; color: string; isCompleted?: boolean }): void {
    if (!this.ctx) return;

    this.ctx.save();

    const centerX = port.position.x;
    const centerY = port.position.y;

    // Draw outer glow
    this.ctx.shadowColor = port.color;
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = port.color;
    this.ctx.globalAlpha = 0.3;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, port.radius + 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;

    // Draw port circle
    this.ctx.fillStyle = port.isCompleted ? '#333333' : port.color;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, port.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw port outline
    this.ctx.strokeStyle = port.isCompleted ? '#666666' : port.color;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, port.radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw port symbol
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(port.isCompleted ? '✓' : '○', centerX, centerY + 6);

    this.ctx.restore();
  }

  /**
   * Draw a hole using sprite atlas or fallback to neon cyberpunk styling
   */
  public drawHole(
    hole: Hole,
    isCompleted: boolean = false,
    debugMode: boolean = false,
  ): void {
    if (!this.ctx) return;

    this.ctx.save();

    const centerX = hole.position.x;
    const centerY = hole.position.y;
    const isGoalHole = hole.isGoal;
    const isPowerUpHole = hole.powerUpType !== undefined;
    const isSaucerActive = hole.saucerState?.isActive || false;

    // Make holes 20% bigger for better visibility
    const enlargedRadius = hole.radius * 1.2;

    // Choose colors based on hole type
    let activeColor: string;
    let darkColor: string;
    let darkerColor: string;

    if (isGoalHole) {
      activeColor = '#ff6600'; // Neon Orange for goals
      darkColor = '#441100';
      darkerColor = '#220000';
    } else if (isPowerUpHole) {
      // Power-up hole colors based on type
      const powerUpColors = {
        'SLOW_MO_SURGE': { active: '#00ffff', dark: '#004444', darker: '#002222' }, // Cyan
        'MAGNETIC_GUIDE': { active: '#ff00ff', dark: '#440044', darker: '#220022' }, // Magenta
        'CIRCUIT_PATCH': { active: '#00ff00', dark: '#004400', darker: '#002200' }, // Green
        'OVERCLOCK_BOOST': { active: '#ff6600', dark: '#441100', darker: '#220000' }, // Orange
        'SCAN_REVEAL': { active: '#ffff00', dark: '#444400', darker: '#222200' }, // Yellow
      };
      const colors = powerUpColors[hole.powerUpType as unknown as keyof typeof powerUpColors] || powerUpColors['SLOW_MO_SURGE'];
      activeColor = colors.active;
      darkColor = colors.dark;
      darkerColor = colors.darker;
    } else {
      activeColor = '#00ff99'; // Acid Green for regular holes
      darkColor = '#004400';
      darkerColor = '#002200';
    }

    // Use sprite atlas if available, otherwise fallback to procedural rendering
    const atlasLoaded = spriteAtlas.isAtlasLoaded();
    // Logging disabled to reduce spam
    if (this.spritesLoaded && atlasLoaded) {
      // Choose sprite based on hole type
      let spriteName: string;
      if (hole.animationState?.isAnimated) {
        // Animated hole - use normal hole sprite with scale animation
        spriteName = 'ball_whole_normal';
        
        // Don't render if in hidden phase or scale is essentially 0
        if (hole.animationState.phase === 'hidden' || hole.animationState.currentScale < 0.001) {
          this.ctx.restore();
          return;
        }
      } else if (isGoalHole) {
        spriteName = 'ball_hole_goal_1'; // Use dedicated goal hole sprite
      } else if (isPowerUpHole) {
        // Use specific power-up sprites from the power-up atlas
        const powerUpSprites = {
          'SLOW_MO_SURGE': ['hourglass', 'hourglass_alt'], // Time bonus sprites
          'MAGNETIC_GUIDE': ['magnet', 'magnet_alt', 'hourglass_alt'], // Occasionally time bonus
          'CIRCUIT_PATCH': ['chip', 'chip_alt'],
          'OVERCLOCK_BOOST': ['starburst', 'starburst_alt', 'hourglass'], // Occasionally time bonus
          'SCAN_REVEAL': ['eye', 'eye_alt'],
        };
        
        // Select sprite based on hole ID for consistent randomization
        const sprites = powerUpSprites[hole.powerUpType as unknown as keyof typeof powerUpSprites] || ['vortex'];
        const spriteIndex = hole.id.charCodeAt(hole.id.length - 1) % sprites.length;
        spriteName = sprites[spriteIndex];
      } else {
        spriteName = 'ball_whole_normal';
      }
      const frameData = spriteAtlas.getFrame(spriteName);

      if (frameData) {
        // Calculate scaling to fit the enlarged hole radius
        const targetSize = enlargedRadius * 2;
        let spriteScale = targetSize / Math.max(frameData.frame.w, frameData.frame.h);
        
        // Apply animation scale for animated holes
        if (hole.animationState?.isAnimated) {
          spriteScale *= hole.animationState.currentScale;
        }

        // Draw outer glow first (behind sprite) - only in debug mode
        if (debugMode) {
          this.ctx.strokeStyle = activeColor;
          this.ctx.lineWidth = 3;
          this.ctx.globalAlpha = 0.5;

          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, enlargedRadius + 5, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.globalAlpha = 1;
        }

        // Draw hole sprite
        if (isCompleted) {
          // Dimmed for completed holes
          this.ctx.globalAlpha = 0.6;
        }

        spriteAtlas.drawSprite(
          this.ctx,
          spriteName,
          centerX - (frameData.frame.w * spriteScale) / 2, // Center horizontally
          centerY - (frameData.frame.h * spriteScale) / 2, // Center vertically
          spriteScale,
        );

        this.ctx.globalAlpha = 1;

        // Add completion indicator if needed
        if (isCompleted) {
          // Draw completion overlay
          this.ctx.fillStyle = activeColor;
          this.ctx.globalAlpha = 0.3;
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.globalAlpha = 1;

          // Draw checkmark
          this.ctx.fillStyle = activeColor;
          this.ctx.font = '12px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('✓', centerX, centerY + 4);
        }

        // Draw animated arrow above goal holes
        if (isGoalHole && !isCompleted) {
          this.drawGoalArrow(centerX, centerY, enlargedRadius);
        }

        // Power-up holes now use sprites instead of text icons
      } else {
        // Fallback to procedural rendering if sprite not found
        this.renderHoleFallback(
          hole,
          isCompleted,
          centerX,
          centerY,
          isGoalHole,
          activeColor,
          darkColor,
          darkerColor,
          debugMode,
          enlargedRadius,
        );
      }

      // Draw saucer effects if active
      if (isSaucerActive && isPowerUpHole) {
        this.drawSaucerEffects(centerX, centerY, enlargedRadius, activeColor, hole);
      }
    } else {
      // Fallback to procedural rendering if atlas not loaded
      
      // Don't render animated holes if in hidden phase or scale is essentially 0
      if (hole.animationState?.isAnimated && (hole.animationState.phase === 'hidden' || hole.animationState.currentScale < 0.001)) {
        this.ctx.restore();
        return;
      }
      
      this.renderHoleFallback(
        hole,
        isCompleted,
        centerX,
        centerY,
        isGoalHole,
        activeColor,
        darkColor,
        darkerColor,
        debugMode,
        enlargedRadius,
      );

      // Draw saucer effects if active
      if (isSaucerActive && isPowerUpHole) {
        this.drawSaucerEffects(centerX, centerY, enlargedRadius, activeColor, hole);
      }
    }

    this.ctx.restore();
  }

  /**
   * Fallback hole rendering using procedural graphics
   */
  private renderHoleFallback(
    hole: Hole,
    isCompleted: boolean,
    centerX: number,
    centerY: number,
    isGoalHole: boolean,
    activeColor: string,
    darkColor: string,
    darkerColor: string,
    debugMode: boolean,
    enlargedRadius: number,
  ): void {
    if (!this.ctx) return;

    // Draw outer glow - only in debug mode
    if (debugMode) {
      this.ctx.strokeStyle = activeColor;
      this.ctx.lineWidth = 3;
      this.ctx.globalAlpha = 0.5;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enlargedRadius + 5, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.globalAlpha = 1;
    }

    // Draw hole interior
    if (isCompleted) {
      // Completed hole - show success state
      this.ctx.shadowColor = activeColor;
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = darkerColor;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw completion indicator
      this.ctx.fillStyle = darkerColor;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enlargedRadius / 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw colored outline
      this.ctx.strokeStyle = activeColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enlargedRadius - 2, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw checkmark
      this.ctx.fillStyle = activeColor;
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('✓', centerX, centerY + 4);
    } else {
      // Active hole - show glowing state
      let glowIntensity = 1;
      let scaleMultiplier = 1;
      
      // Special handling for animated holes
      if (hole.animationState?.isAnimated) {
        const animState = hole.animationState;
        
        // Use current scale for both size and glow intensity
        scaleMultiplier = animState.currentScale;
        glowIntensity = animState.currentScale;
        
        // Don't render if scale is essentially 0 or in hidden phase
        if (animState.currentScale < 0.001 || animState.phase === 'hidden') {
          return;
        }
        
        // Use orange color for animated holes
        activeColor = '#ff6600';
        darkColor = '#441100';
        darkerColor = '#220000';
      }
      
      this.ctx.shadowColor = activeColor;
      this.ctx.shadowBlur = (isGoalHole ? 15 : 10) * glowIntensity;
      this.ctx.fillStyle = activeColor;
      this.ctx.globalAlpha = (isGoalHole ? 0.8 : 0.6) * glowIntensity;

      const scaledRadius = (enlargedRadius - 2) * scaleMultiplier;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.globalAlpha = 1;

      // Draw inner dark area
      this.ctx.fillStyle = darkColor;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, (enlargedRadius / 2) * scaleMultiplier, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw colored outline
      this.ctx.strokeStyle = activeColor;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = glowIntensity;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.globalAlpha = 1;

      // Draw symbol - different for goal vs regular holes vs animated holes
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.globalAlpha = glowIntensity;
      
      if (hole.animationState?.isAnimated) {
        // Animated hole gets special symbol
        this.ctx.fillText('◉', centerX, centerY + 3);
      } else {
        this.ctx.fillText(isGoalHole ? '🎯' : '●', centerX, centerY + 3);
      }

      // Add power-up icon if this is a power-up hole
      if (hole.powerUpType) {
        const powerUpIcons = {
          'SLOW_MO_SURGE': '⏰',
          'MAGNETIC_GUIDE': '🧲',
          'CIRCUIT_PATCH': '🛡️',
          'OVERCLOCK_BOOST': '⚡',
          'SCAN_REVEAL': '🔍',
        };
        
        const icon = powerUpIcons[hole.powerUpType as unknown as keyof typeof powerUpIcons] || '?';
        
        // Draw icon with glow effect
        this.ctx.shadowColor = activeColor;
        this.ctx.shadowBlur = 8 * glowIntensity;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Interceptor';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(icon, centerX, centerY + 5);
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw animated arrow above goal holes
   */
  private drawGoalArrow(centerX: number, centerY: number, holeRadius: number): void {
    if (!this.ctx) return;

    // Calculate arrow position and animation
    const arrowOffset = holeRadius + 5; // Distance above the hole (reduced by 25px from original 15)
    const bounceRange = 8; // How much the arrow bounces
    const bounceSpeed = 0.006; // Speed of bounce animation
    
    // Create bouncing animation using sine wave
    const time = Date.now() * bounceSpeed;
    const bounceOffset = Math.sin(time) * bounceRange;
    const arrowY = centerY - arrowOffset + bounceOffset;
    
    // Get arrow sprite frame
    const frameData = spriteAtlas.getFrame('ball_hole_goal_arrow_1');
    if (!frameData) return;
    
    // Calculate arrow scale to match hole size
    const targetSize = holeRadius * 1.5; // Arrow slightly larger than hole
    const spriteScale = targetSize / Math.max(frameData.frame.w, frameData.frame.h);
    
    // Draw arrow sprite
    spriteAtlas.drawSprite(
      this.ctx,
      'ball_hole_goal_arrow_1',
      centerX - (frameData.frame.w * spriteScale) / 2, // Center horizontally
      arrowY - (frameData.frame.h * spriteScale) / 2, // Center vertically
      spriteScale,
    );
  }

  /**
   * Draw saucer effects for power-up holes
   */
  private drawSaucerEffects(centerX: number, centerY: number, radius: number, color: string, hole: Hole): void {
    if (!this.ctx || !hole.saucerState) return;

    this.ctx.save();

    const saucerState = hole.saucerState;
    const time = Date.now() * 0.01;

    // Different effects based on phase
    if (saucerState.phase === 'sinking') {
      // Sinking phase - pulsing glow with downward motion
      const pulseIntensity = 0.7 + 0.3 * Math.sin(time * 4);
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 25 * pulseIntensity;
      this.ctx.globalAlpha = 0.8 * pulseIntensity;

      // Draw sinking animation rings
      const sinkProgress = saucerState.sinkDepth;
      for (let i = 0; i < 3; i++) {
        const ringRadius = radius + 4 + i * 4;
        const ringAlpha = 0.6 * (1 - i * 0.3) * (1 - sinkProgress * 0.5);
        this.ctx.globalAlpha = ringAlpha;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY + sinkProgress * 4, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      }



    } else if (saucerState.phase === 'waiting') {
      // Waiting phase - steady glow with pulsing
      const pulseIntensity = 0.6 + 0.2 * Math.sin(time * 2);
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 20 * pulseIntensity;
      this.ctx.globalAlpha = 0.7 * pulseIntensity;

      // Draw steady rings
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw spinning effect
      const spinAngle = time * 1.5;
      const spinRadius = radius + 6;
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.8;
      
      for (let i = 0; i < 4; i++) {
        const angle = spinAngle + (i * Math.PI / 2);
        const x1 = centerX + Math.cos(angle) * spinRadius;
        const y1 = centerY + Math.sin(angle) * spinRadius;
        const x2 = centerX + Math.cos(angle) * (spinRadius + 6);
        const y2 = centerY + Math.sin(angle) * (spinRadius + 6);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }



    } else if (saucerState.phase === 'ejecting') {
      // Ejecting phase - intense glow with upward motion
      const ejectProgress = Math.min((Date.now() - saucerState.startTime) / 200, 1);
      const pulseIntensity = 0.8 + 0.4 * Math.sin(time * 6);
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 30 * pulseIntensity;
      this.ctx.globalAlpha = 0.9 * pulseIntensity;

      // Draw ejection rings moving upward
      for (let i = 0; i < 3; i++) {
        const ringRadius = radius + 2 + i * 3;
        const ringY = centerY - ejectProgress * 10 * (i + 1);
        const ringAlpha = 0.7 * (1 - i * 0.3) * (1 - ejectProgress * 0.3);
        this.ctx.globalAlpha = ringAlpha;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, ringY, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      }


    }

    this.ctx.restore();
  }

  /**
   * Draw danger zone with neon cyberpunk styling
   */
  public drawDangerZone(zone: { position: { x: number; y: number }; radius: number; width?: number; height?: number; isActive?: boolean }): void {
    if (!this.ctx) return;

    this.ctx.save();

    const centerX = zone.position.x + (zone.width || zone.radius * 2) / 2;
    const centerY = zone.position.y + (zone.height || zone.radius * 2) / 2;

    // Draw pulsing danger zone
    this.ctx.shadowColor = '#b600f9'; // Neon Purple
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#220000'; // Dark red
    this.ctx.globalAlpha = 0.7;

    this.ctx.fillRect(
      zone.position.x,
      zone.position.y,
      zone.width || zone.radius * 2,
      zone.height || zone.radius * 2,
    );

    this.ctx.globalAlpha = 1;

    // Draw border
    this.ctx.strokeStyle = '#b600f9'; // Neon Purple
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      zone.position.x,
      zone.position.y,
      zone.width || zone.radius * 2,
      zone.height || zone.radius * 2,
    );

    // Draw warning symbol
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚠', centerX, centerY + 8);

    this.ctx.restore();
  }

  /**
   * Draw a ball using sprite image or fallback to chrome rendering
   */
  public drawChromeBall(
    ball: { position: { x: number; y: number }; radius: number },
    animationState?: { scale: number; opacity: number },
    spriteName: string = 'ball_normal',
  ): void {
    if (!this.ctx) return;
    
    this.ctx.save();

    const x = ball.position.x;
    const y = ball.position.y;
    const radius = ball.radius;
    const scale = animationState?.scale || 1;
    const opacity = animationState?.opacity || 1;

    // Set global opacity for animation
    this.ctx.globalAlpha = opacity;

    // Use sprite atlas if loaded, otherwise fallback to procedural rendering
    const atlasLoaded = spriteAtlas.isAtlasLoaded();
    if (this.spritesLoaded && atlasLoaded) {
      // Draw sprite-based ball from atlas
      // Apply 10% size reduction for saucer sprite
      const saucerSizeMultiplier = spriteName === 'ball_saucer' ? 0.9 : 1.0;
      const targetSize = radius * 2 * scale * saucerSizeMultiplier;
      const spriteFrame = spriteAtlas.getFrame(spriteName);

      if (spriteFrame) {
        // Calculate scale to fit the ball size (64x64 sprite to ball diameter)
        const spriteScale = targetSize / spriteFrame.frame.w;

        // Draw shadow behind sprite
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(
          x + radius * scale * 0.1,
          y + radius * scale * 0.1,
          radius * scale,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();

        // Draw the ball sprite from atlas, centered on ball position
        spriteAtlas.drawSprite(
          this.ctx,
          spriteName,
          x - targetSize / 2, // Center horizontally
          y - targetSize / 2, // Center vertically
          spriteScale, // Scale factor to match ball size
        );
      } else {
        // Fallback if sprite not found - render procedurally inline
        // Apply 10% size reduction for saucer sprite
        const saucerSizeMultiplier = spriteName === 'ball_saucer' ? 0.9 : 1.0;
        const scaledRadius = radius * scale * saucerSizeMultiplier;

        // Create main ball gradient (chrome base)
        const mainGradient = this.ctx.createRadialGradient(
          x - scaledRadius * 0.3,
          y - scaledRadius * 0.3,
          0,
          x,
          y,
          scaledRadius,
        );
        mainGradient.addColorStop(0, '#ffffff'); // Bright highlight
        mainGradient.addColorStop(0.1, '#e6e6e6'); // Light chrome
        mainGradient.addColorStop(0.3, '#cccccc'); // Medium chrome
        mainGradient.addColorStop(0.6, '#999999'); // Dark chrome
        mainGradient.addColorStop(0.8, '#666666'); // Darker chrome
        mainGradient.addColorStop(1, '#333333'); // Shadow edge

        // Draw main ball shadow (behind ball)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(
          x + scaledRadius * 0.1,
          y + scaledRadius * 0.1,
          scaledRadius,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();

        // Draw main chrome ball
        this.ctx.fillStyle = mainGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add bright highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        this.ctx.beginPath();
        this.ctx.arc(
          x - scaledRadius * 0.35,
          y - scaledRadius * 0.35,
          scaledRadius * 0.08,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }
    } else {
      // Fallback to procedural chrome rendering
      // Apply 10% size reduction for saucer sprite
      const saucerSizeMultiplier = spriteName === 'ball_saucer' ? 0.9 : 1.0;
      const scaledRadius = radius * scale * saucerSizeMultiplier;

      // Create main ball gradient (chrome base)
      const mainGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.3,
        y - scaledRadius * 0.3,
        0,
        x,
        y,
        scaledRadius,
      );
      mainGradient.addColorStop(0, '#ffffff'); // Bright highlight
      mainGradient.addColorStop(0.1, '#e6e6e6'); // Light chrome
      mainGradient.addColorStop(0.3, '#cccccc'); // Medium chrome
      mainGradient.addColorStop(0.6, '#999999'); // Dark chrome
      mainGradient.addColorStop(0.8, '#666666'); // Darker chrome
      mainGradient.addColorStop(1, '#333333'); // Shadow edge

      // Draw main ball shadow (behind ball)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(
        x + scaledRadius * 0.1,
        y + scaledRadius * 0.1,
        scaledRadius,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Draw main chrome ball
      this.ctx.fillStyle = mainGradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Create secondary reflection gradient
      const reflectionGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.4,
        y - scaledRadius * 0.4,
        0,
        x - scaledRadius * 0.2,
        y - scaledRadius * 0.2,
        scaledRadius * 0.6,
      );
      reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      reflectionGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
      reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      // Draw secondary reflection
      this.ctx.fillStyle = reflectionGradient;
      this.ctx.beginPath();
      this.ctx.arc(
        x - scaledRadius * 0.2,
        y - scaledRadius * 0.2,
        scaledRadius * 0.6,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Create primary highlight
      const highlightGradient = this.ctx.createRadialGradient(
        x - scaledRadius * 0.3,
        y - scaledRadius * 0.3,
        0,
        x - scaledRadius * 0.3,
        y - scaledRadius * 0.3,
        scaledRadius * 0.4,
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      // Draw primary highlight
      this.ctx.fillStyle = highlightGradient;
      this.ctx.beginPath();
      this.ctx.arc(
        x - scaledRadius * 0.3,
        y - scaledRadius * 0.3,
        scaledRadius * 0.4,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Add small specular highlights
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(
        x - scaledRadius * 0.4,
        y - scaledRadius * 0.4,
        scaledRadius * 0.15,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Add tiny bright spot
      this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      this.ctx.beginPath();
      this.ctx.arc(
        x - scaledRadius * 0.35,
        y - scaledRadius * 0.35,
        scaledRadius * 0.08,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Add environment reflection (cyberpunk colors)
      const envGradient = this.ctx.createRadialGradient(
        x + scaledRadius * 0.3,
        y + scaledRadius * 0.2,
        0,
        x + scaledRadius * 0.3,
        y + scaledRadius * 0.2,
        scaledRadius * 0.5,
      );
      envGradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)'); // Cyan reflection
      envGradient.addColorStop(0.3, 'rgba(255, 0, 102, 0.1)'); // Pink reflection
      envGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = envGradient;
      this.ctx.beginPath();
      this.ctx.arc(
        x + scaledRadius * 0.3,
        y + scaledRadius * 0.2,
        scaledRadius * 0.5,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Draw a sprite from the atlas with optional scaling and positioning
   */
  public drawAtlasSprite(
    spriteName: string,
    x: number,
    y: number,
    scale: number = 1,
    centered: boolean = true,
  ): boolean {
    if (!this.ctx || !spriteAtlas.isAtlasLoaded()) return false;

    const frameData = spriteAtlas.getFrame(spriteName);
    if (!frameData) return false;

    const drawX = centered ? x - (frameData.frame.w * scale) / 2 : x;
    const drawY = centered ? y - (frameData.frame.h * scale) / 2 : y;

    // Apply tint if set
    if (this.currentTint) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'multiply';
      this.ctx.fillStyle = this.currentTint;
      this.ctx.globalAlpha = 0.3;
    }

    const result = spriteAtlas.drawSprite(this.ctx, spriteName, drawX, drawY, scale);

    // Restore context if tint was applied
    if (this.currentTint) {
      this.ctx.restore();
    }

    return result;
  }

  /**
   * Set tint color for sprites
   */
  public setTint(color: string): void {
    this.currentTint = color;
  }

  /**
   * Clear tint color
   */
  public clearTint(): void {
    this.currentTint = null;
  }

  /**
   * Draw a flipper using atlas sprites
   */
  public drawFlipper(flipper: { position: { x: number; y: number } }, isLeft: boolean): void {
    if (!this.ctx) return;

    const spriteName = isLeft ? 'flipper_left_down' : 'flipper_right_down';
    this.drawAtlasSprite(spriteName, flipper.position.x, flipper.position.y, 2);
  }

  /**
   * Draw a bumper using atlas sprites with animation
   */
  public drawBumper(bumper: { position: { x: number; y: number } }, isActive: boolean = false): void {
    if (!this.ctx) return;

    const spriteName = isActive ? 'round_bumper_active' : 'round_bumper_idle';
    this.drawAtlasSprite(spriteName, bumper.position.x, bumper.position.y, 1.5);
  }

  /**
   * Draw a spinner with rotation animation
   */
  public drawSpinner(spinner: { position: { x: number; y: number } }, animationFrame: number = 1): void {
    if (!this.ctx) return;

    // Cycle through spinner animation frames (1-4)
    const frame = Math.max(1, Math.min(4, animationFrame));
    const spriteName = `spinner_${frame}`;
    this.drawAtlasSprite(spriteName, spinner.position.x, spinner.position.y, 2);
  }

  /**
   * Get canvas context
   */
  public getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Resize the renderer
   */
  public resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    Debug.log(`Renderer resized to: ${width}x${height}`);
  }
}

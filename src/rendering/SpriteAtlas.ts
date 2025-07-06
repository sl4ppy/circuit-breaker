// Circuit Breaker - Sprite Atlas Manager
// Efficient sprite loading and management using texture atlases

import { Debug } from '../utils/Debug'

export interface SpriteFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface AtlasData {
  frames: { [key: string]: SpriteFrame }
  meta: {
    image: string
    size: { w: number; h: number }
    scale: number
  }
}

export class SpriteAtlas {
  private static instance: SpriteAtlas
  private atlasImage: HTMLImageElement | null = null
  private atlasData: AtlasData | null = null
  private isLoaded: boolean = false
  private offscreenCanvases: Map<string, HTMLCanvasElement> = new Map()

  private constructor() {}

  public static getInstance(): SpriteAtlas {
    if (!SpriteAtlas.instance) {
      SpriteAtlas.instance = new SpriteAtlas()
    }
    return SpriteAtlas.instance
  }

  /**
   * Load the sprite atlas image and JSON data
   */
  public async load(): Promise<void> {
    try {
      // Load atlas JSON data
      const jsonResponse = await fetch('./assets/sprites/atlas_01.json')
      if (!jsonResponse.ok) {
        throw new Error(`Failed to load atlas JSON: ${jsonResponse.status}`)
      }
      this.atlasData = await jsonResponse.json()

      // Load atlas image
      this.atlasImage = new Image()
      this.atlasImage.src = './assets/sprites/atlas_01.png'

      await new Promise<void>((resolve, reject) => {
        this.atlasImage!.onload = () => resolve()
        this.atlasImage!.onerror = reject
      })

      this.isLoaded = true
      Debug.log('🎨 Sprite atlas loaded successfully with', Object.keys(this.atlasData?.frames || {}).length, 'sprites')
    } catch (error) {
      Debug.log('❌ Failed to load sprite atlas:', error)
      this.isLoaded = false
    }
  }

  /**
   * Get a sprite frame definition by name
   */
  public getFrame(spriteName: string): SpriteFrame | null {
    if (!this.atlasData) return null
    return this.atlasData.frames[spriteName] || null
  }

  /**
   * Draw a sprite from the atlas to a canvas context
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    if (!this.isLoaded || !this.atlasImage || !this.atlasData) {
      Debug.log(`⚠️ Cannot draw sprite ${spriteName}: not loaded`)
      return false
    }

    const frame = this.getFrame(spriteName)
    if (!frame) {
      Debug.log(`⚠️ Sprite not found: ${spriteName}`)
      return false
    }

    ctx.drawImage(
      this.atlasImage,
      frame.x, frame.y, frame.w, frame.h,
      x, y, frame.w * scale, frame.h * scale
    )

    return true
  }

  /**
   * Get a cached canvas with a specific sprite pre-rendered
   * Useful for sprites that are used frequently
   */
  public getSpriteCanvas(spriteName: string, scale: number = 1): HTMLCanvasElement | null {
    const cacheKey = `${spriteName}_${scale}`
    
    if (this.offscreenCanvases.has(cacheKey)) {
      return this.offscreenCanvases.get(cacheKey)!
    }

    if (!this.isLoaded || !this.atlasImage || !this.atlasData) {
      return null
    }

    const frame = this.getFrame(spriteName)
    if (!frame) return null

    // Create offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = frame.w * scale
    canvas.height = frame.h * scale
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Draw sprite to offscreen canvas
    ctx.drawImage(
      this.atlasImage,
      frame.x, frame.y, frame.w, frame.h,
      0, 0, frame.w * scale, frame.h * scale
    )

    // Cache and return
    this.offscreenCanvases.set(cacheKey, canvas)
    return canvas
  }

  /**
   * Get all available sprite names
   */
  public getSpriteNames(): string[] {
    if (!this.atlasData) return []
    return Object.keys(this.atlasData.frames)
  }

  /**
   * Check if atlas is loaded
   */
  public isAtlasLoaded(): boolean {
    return this.isLoaded
  }

  /**
   * Get atlas dimensions
   */
  public getAtlasDimensions(): { width: number; height: number } | null {
    if (!this.atlasData) return null
    return {
      width: this.atlasData.meta.size.w,
      height: this.atlasData.meta.size.h
    }
  }

  /**
   * Clear sprite cache
   */
  public clearCache(): void {
    this.offscreenCanvases.clear()
  }
}

// Export singleton instance
export const spriteAtlas = SpriteAtlas.getInstance() 
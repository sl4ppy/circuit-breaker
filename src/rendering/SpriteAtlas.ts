// Circuit Breaker - Sprite Atlas Manager
// Efficient sprite loading and management using texture atlases

import { Debug } from '../utils/Debug';

export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasData {
  frames: { [key: string]: SpriteFrame };
  meta: {
    image: string;
    size: { w: number; h: number };
    scale: number;
  };
}

export class SpriteAtlas {
  private static instance: SpriteAtlas;
  private atlases: Map<string, { image: HTMLImageElement; data: AtlasData }> = new Map();
  private isLoaded: boolean = false;
  private offscreenCanvases: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): SpriteAtlas {
    if (!SpriteAtlas.instance) {
      SpriteAtlas.instance = new SpriteAtlas();
    }
    return SpriteAtlas.instance;
  }

  /**
   * Load the sprite atlas image and JSON data
   */
  public async load(): Promise<void> {
    try {
      Debug.log('🚀 Starting sprite atlas loading process...');
      
      // Load main atlas
      await this.loadAtlas('main', './assets/sprites/atlas_01.json', './assets/sprites/atlas_01.png');
      
      // Load power-up atlas
      await this.loadAtlas('powerup', './assets/sprites/powerup_atlas_01.json', './assets/sprites/powerup_atlas_01.png');

      this.isLoaded = true;
      
      let totalSprites = 0;
      this.atlases.forEach((atlas, name) => {
        const spriteCount = Object.keys(atlas.data.frames).length;
        totalSprites += spriteCount;
        Debug.log(`📊 Atlas '${name}' contains ${spriteCount} sprites`);
      });
      
      Debug.log(
        '🎨 All sprite atlases loaded successfully with',
        totalSprites,
        'total sprites',
      );
    } catch (error) {
      Debug.log('❌ Failed to load sprite atlases:', error);
      this.isLoaded = false;
    }
  }

  /**
   * Load a specific atlas
   */
  private async loadAtlas(name: string, jsonPath: string, imagePath: string): Promise<void> {
    Debug.log(`🔄 Loading ${name} atlas from ${jsonPath} and ${imagePath}`);
    
    // Load atlas JSON data
    const jsonResponse = await fetch(jsonPath);
    if (!jsonResponse.ok) {
      throw new Error(`Failed to load ${name} atlas JSON: ${jsonResponse.status}`);
    }
    const atlasData = await jsonResponse.json();
    Debug.log(`📄 ${name} atlas JSON loaded with ${Object.keys(atlasData.frames).length} sprites`);

    // Load atlas image
    const atlasImage = new Image();
    atlasImage.src = imagePath;

    await new Promise<void>((resolve, reject) => {
      atlasImage.onload = () => {
        Debug.log(`🖼️ ${name} atlas image loaded successfully`);
        resolve();
      };
      atlasImage.onerror = (error) => {
        Debug.log(`❌ Failed to load ${name} atlas image:`, error);
        reject(error);
      };
    });

    this.atlases.set(name, { image: atlasImage, data: atlasData });
    
    Debug.log(
      `🎨 ${name} atlas loaded with`,
      Object.keys(atlasData.frames).length,
      'sprites:',
      Object.keys(atlasData.frames).join(', '),
    );
  }

  /**
   * Get a sprite frame definition by name
   */
  public getFrame(spriteName: string): { frame: SpriteFrame; atlas: string } | null {
    // Search through all atlases
    for (const [atlasName, atlas] of this.atlases) {
      if (atlas.data.frames[spriteName]) {
        return { frame: atlas.data.frames[spriteName], atlas: atlasName };
      }
    }
    Debug.log(`❌ Sprite ${spriteName} not found in any atlas`);
    return null;
  }

  /**
   * Draw a sprite from the atlas to a canvas context
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    scale: number = 1,
  ): boolean {
    if (!this.isLoaded) {
      return false;
    }

    const frameData = this.getFrame(spriteName);
    if (!frameData) {
      return false;
    }

    const atlas = this.atlases.get(frameData.atlas);
    if (!atlas) {
      return false;
    }

    ctx.drawImage(
      atlas.image,
      frameData.frame.x,
      frameData.frame.y,
      frameData.frame.w,
      frameData.frame.h,
      x,
      y,
      frameData.frame.w * scale,
      frameData.frame.h * scale,
    );

    return true;
  }

  /**
   * Get a cached canvas with a specific sprite pre-rendered
   * Useful for sprites that are used frequently
   */
  public getSpriteCanvas(
    spriteName: string,
    scale: number = 1,
  ): HTMLCanvasElement | null {
    const cacheKey = `${spriteName}_${scale}`;

    if (this.offscreenCanvases.has(cacheKey)) {
      const cachedCanvas = this.offscreenCanvases.get(cacheKey);
      if (cachedCanvas) {
        return cachedCanvas;
      }
    }

    if (!this.isLoaded) {
      return null;
    }

    const frameData = this.getFrame(spriteName);
    if (!frameData) return null;

    const atlas = this.atlases.get(frameData.atlas);
    if (!atlas) return null;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = frameData.frame.w * scale;
    canvas.height = frameData.frame.h * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw sprite to offscreen canvas
    ctx.drawImage(
      atlas.image,
      frameData.frame.x,
      frameData.frame.y,
      frameData.frame.w,
      frameData.frame.h,
      0,
      0,
      frameData.frame.w * scale,
      frameData.frame.h * scale,
    );

    // Cache and return
    this.offscreenCanvases.set(cacheKey, canvas);
    return canvas;
  }

  /**
   * Get all available sprite names
   */
  public getSpriteNames(): string[] {
    const allSprites: string[] = [];
    this.atlases.forEach((atlas) => {
      allSprites.push(...Object.keys(atlas.data.frames));
    });
    return allSprites;
  }

  /**
   * Check if atlas is loaded
   */
  public isAtlasLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get atlas dimensions for a specific atlas
   */
  public getAtlasDimensions(atlasName: string = 'main'): { width: number; height: number } | null {
    const atlas = this.atlases.get(atlasName);
    if (!atlas) return null;
    return {
      width: atlas.data.meta.size.w,
      height: atlas.data.meta.size.h,
    };
  }

  /**
   * Clear sprite cache
   */
  public clearCache(): void {
    this.offscreenCanvases.clear();
  }
}

// Export singleton instance
export const spriteAtlas = SpriteAtlas.getInstance();

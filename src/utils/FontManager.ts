// Circuit Breaker - Font Manager
// Centralized font management for Canvas rendering

import { logger } from './Logger';

export class FontManager {
  private static instance: FontManager;
  private fontsLoaded: boolean = false;

  // Font definitions with fallbacks
  private fonts = {
    primary: 'Interceptor, "Courier New", Monaco, Consolas, monospace',
    display: 'Cyberpunks, Interceptor, "Courier New", monospace',
    mono: 'Interceptor, "Courier New", Monaco, Consolas, monospace',
  };

  private constructor() {
    this.loadFonts();
  }

  public static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager();
    }
    return FontManager.instance;
  }

  /**
   * Load custom fonts and check if they're available
   */
  private async loadFonts(): Promise<void> {
    try {
      // Check if fonts are available using CSS Font Loading API
      if ('fonts' in document) {
        // Create font faces with better error handling
        const fontPromises: Promise<FontFace>[] = [];

        // Load Cyberpunks font family (using relative paths for GitHub Pages compatibility)
        try {
          const cyberpunksRegular = new FontFace(
            'Cyberpunks',
            'url("./assets/fonts/Cyberpunks.otf")',
          );
          const cyberpunksItalic = new FontFace(
            'Cyberpunks',
            'url("./assets/fonts/Cyberpunks Italic.otf")',
            { style: 'italic' },
          );
          fontPromises.push(cyberpunksRegular.load(), cyberpunksItalic.load());
        } catch (e) {
          logger.warn('⚠️ Cyberpunks font creation failed:', e, 'FontManager');
        }

        // Load Interceptor font family (using relative paths for GitHub Pages compatibility)
        try {
          const interceptorRegular = new FontFace(
            'Interceptor',
            'url("/public/assets/fonts/Interceptor.otf")',
          );
          const interceptorItalic = new FontFace(
            'Interceptor',
            'url("./assets/fonts/Interceptor Italic.otf")',
            { style: 'italic' },
          );
          const interceptorBold = new FontFace(
            'Interceptor',
            'url("./assets/fonts/Interceptor Bold.otf")',
            { weight: 'bold' },
          );
          const interceptorBoldItalic = new FontFace(
            'Interceptor',
            'url("./assets/fonts/Interceptor Bold Italic.otf")',
            { weight: 'bold', style: 'italic' },
          );
          fontPromises.push(
            interceptorRegular.load(),
            interceptorItalic.load(),
            interceptorBold.load(),
            interceptorBoldItalic.load(),
          );
        } catch (e) {
          logger.warn('⚠️ Interceptor font creation failed:', e, 'FontManager');
        }

        if (fontPromises.length > 0) {
          // Load fonts with individual error handling
          const results = await Promise.allSettled(fontPromises);

          let loadedCount = 0;
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              try {
                document.fonts.add(result.value);
                loadedCount++;
              } catch (e) {
                logger.warn(`⚠️ Failed to add font ${index} to document:`, e, 'FontManager');
              }
            } else {
              logger.warn(`⚠️ Font ${index} failed to load:`, result.reason, 'FontManager');
            }
          });

          if (loadedCount > 0) {
            this.fontsLoaded = true;
            logger.info(
              `🎨 Loaded ${loadedCount}/${fontPromises.length} custom fonts successfully`,
              null,
              'FontManager',
            );
          } else {
            this.fontsLoaded = false;
            logger.warn('⚠️ No custom fonts loaded, using fallbacks', null, 'FontManager');
          }
        } else {
          this.fontsLoaded = false;
          logger.warn('⚠️ No fonts could be created, using fallbacks', null, 'FontManager');
        }
      } else {
        this.fontsLoaded = false;
        logger.warn('⚠️ Font Loading API not available, using fallbacks', null, 'FontManager');
      }
    } catch (error) {
      logger.warn('⚠️ Font loading completely failed, using fallbacks:', error, 'FontManager');
      this.fontsLoaded = false;
    }
  }

  /**
   * Get font string for Canvas context
   */
  public getFont(
    type: 'primary' | 'display' | 'mono',
    size: number,
    weight: 'normal' | 'bold' = 'normal',
  ): string {
    const fontFamily = this.fonts[type];
    return `${weight} ${size}px ${fontFamily}`;
  }

  /**
   * Set font on Canvas context
   */
  public setFont(
    ctx: CanvasRenderingContext2D,
    type: 'primary' | 'display' | 'mono',
    size: number,
    weight: 'normal' | 'bold' = 'normal',
  ): void {
    ctx.font = this.getFont(type, size, weight);
  }

  /**
   * Check if custom fonts are loaded
   */
  public areFontsLoaded(): boolean {
    return this.fontsLoaded;
  }

  /**
   * Preload fonts (call this early in initialization)
   */
  public async preloadFonts(): Promise<void> {
    if (!this.fontsLoaded) {
      await this.loadFonts();
    }
  }

  /**
   * Get available font types
   */
  public getFontTypes(): string[] {
    return Object.keys(this.fonts);
  }

  /**
   * Check if specific font family is available
   */
  public isFontAvailable(fontFamily: string): boolean {
    if (!('fonts' in document)) return false;
    return document.fonts.check(`12px ${fontFamily}`);
  }
}

// Export singleton instance
export const fontManager = FontManager.getInstance();

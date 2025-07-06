// Circuit Breaker - Font Manager
// Centralized font management for Canvas rendering

export class FontManager {
  private static instance: FontManager
  private fontsLoaded: boolean = false
  
  // Font definitions with fallbacks
  private fonts = {
    primary: 'Interceptor, "Courier New", Monaco, Consolas, monospace',
    display: 'Cyberpunks, Interceptor, "Courier New", monospace',
    mono: 'Interceptor, "Courier New", Monaco, Consolas, monospace'
  }
  
  private constructor() {
    this.loadFonts()
  }
  
  public static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager()
    }
    return FontManager.instance
  }
  
  /**
   * Load custom fonts and check if they're available
   */
  private async loadFonts(): Promise<void> {
    try {
      // Check if fonts are available using CSS Font Loading API
      if ('fonts' in document) {
        // Load Cyberpunks font family
        const cyberpunksRegular = new FontFace('Cyberpunks', 'url("/assets/fonts/Cyberpunks.otf")')
        const cyberpunksItalic = new FontFace('Cyberpunks', 'url("/assets/fonts/Cyberpunks Italic.otf")', { style: 'italic' })
        
        // Load Interceptor font family
        const interceptorRegular = new FontFace('Interceptor', 'url("/assets/fonts/Interceptor.otf")')
        const interceptorItalic = new FontFace('Interceptor', 'url("/assets/fonts/Interceptor Italic.otf")', { style: 'italic' })
        const interceptorBold = new FontFace('Interceptor', 'url("/assets/fonts/Interceptor Bold.otf")', { weight: 'bold' })
        const interceptorBoldItalic = new FontFace('Interceptor', 'url("/assets/fonts/Interceptor Bold Italic.otf")', { weight: 'bold', style: 'italic' })
        
        await Promise.all([
          cyberpunksRegular.load(),
          cyberpunksItalic.load(),
          interceptorRegular.load(),
          interceptorItalic.load(),
          interceptorBold.load(),
          interceptorBoldItalic.load()
        ])
        
        // Add fonts to document
        document.fonts.add(cyberpunksRegular)
        document.fonts.add(cyberpunksItalic)
        document.fonts.add(interceptorRegular)
        document.fonts.add(interceptorItalic)
        document.fonts.add(interceptorBold)
        document.fonts.add(interceptorBoldItalic)
        
        this.fontsLoaded = true
        console.log('🎨 Custom cyberpunk fonts loaded successfully')
      }
    } catch (error) {
      console.log('⚠️ Custom fonts failed to load, using fallbacks:', error)
      this.fontsLoaded = false
    }
  }
  
  /**
   * Get font string for Canvas context
   */
  public getFont(type: 'primary' | 'display' | 'mono', size: number, weight: 'normal' | 'bold' = 'normal'): string {
    const fontFamily = this.fonts[type]
    return `${weight} ${size}px ${fontFamily}`
  }
  
  /**
   * Set font on Canvas context
   */
  public setFont(ctx: CanvasRenderingContext2D, type: 'primary' | 'display' | 'mono', size: number, weight: 'normal' | 'bold' = 'normal'): void {
    ctx.font = this.getFont(type, size, weight)
  }
  
  /**
   * Check if custom fonts are loaded
   */
  public areFontsLoaded(): boolean {
    return this.fontsLoaded
  }
  
  /**
   * Preload fonts (call this early in initialization)
   */
  public async preloadFonts(): Promise<void> {
    if (!this.fontsLoaded) {
      await this.loadFonts()
    }
  }
  
  /**
   * Get available font types
   */
  public getFontTypes(): string[] {
    return Object.keys(this.fonts)
  }
  
  /**
   * Check if specific font family is available
   */
  public isFontAvailable(fontFamily: string): boolean {
    if (!('fonts' in document)) return false
    return document.fonts.check(`12px ${fontFamily}`)
  }
}

// Export singleton instance
export const fontManager = FontManager.getInstance() 
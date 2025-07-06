// Circuit Breaker - Font Manager
// Centralized font management for Canvas rendering

export class FontManager {
  private static instance: FontManager
  private fontsLoaded: boolean = false
  
  // Font definitions with fallbacks
  private fonts = {
    primary: 'CyberFont, "Courier New", Monaco, Consolas, monospace',
    display: 'NeonDisplay, CyberFont, "Courier New", monospace',
    mono: 'CyberFont, "Courier New", Monaco, Consolas, monospace'
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
        const fontFace1 = new FontFace('CyberFont', 'url(/assets/fonts/cyber-font.woff2)')
        const fontFace2 = new FontFace('NeonDisplay', 'url(/assets/fonts/neon-display.woff2)')
        
        await Promise.all([
          fontFace1.load(),
          fontFace2.load()
        ])
        
        document.fonts.add(fontFace1)
        document.fonts.add(fontFace2)
        
        this.fontsLoaded = true
        console.log('🎨 Custom fonts loaded successfully')
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
}

// Export singleton instance
export const fontManager = FontManager.getInstance() 
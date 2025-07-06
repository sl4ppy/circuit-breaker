// Circuit Breaker - Audio Manager
// Handles sound effects, background music, and audio processing using Web Audio API

export interface AudioConfig {
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  enabled: boolean
}

export interface SoundEffect {
  id: string
  buffer: AudioBuffer | null
  volume: number
  loop: boolean
  pitch: number
}

export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private config: AudioConfig = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4,
    enabled: true
  }
  
  private soundEffects: Map<string, SoundEffect> = new Map()
  private loadedSounds: Map<string, AudioBuffer> = new Map()
  private currentMusic: AudioBufferSourceNode | null = null
  private currentMusicGain: GainNode | null = null
  private isInitialized: boolean = false

  constructor() {
    console.log('🔊 AudioManager initialized')
  }

  /**
   * Initialize the audio system
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain()
      this.sfxGain = this.audioContext.createGain()
      this.musicGain = this.audioContext.createGain()
      
      // Connect gain nodes
      this.sfxGain.connect(this.masterGain)
      this.musicGain.connect(this.masterGain)
      this.masterGain.connect(this.audioContext.destination)
      
      // Set initial volumes
      this.masterGain.gain.value = this.config.masterVolume
      this.sfxGain.gain.value = this.config.sfxVolume
      this.musicGain.gain.value = this.config.musicVolume
      
      // Create procedural sound effects
      await this.createProceduralSounds()
      
      this.isInitialized = true
      console.log('✅ Audio system initialized')
    } catch (error) {
      console.error('❌ Failed to initialize audio system:', error)
      this.config.enabled = false
    }
  }

  /**
   * Create procedural sound effects using Web Audio API
   */
  private async createProceduralSounds(): Promise<void> {
    if (!this.audioContext) return

    // Ball bounce sound - realistic metallic ping
    const bounceBuffer = this.createBounceSound()
    this.soundEffects.set('bounce', {
      id: 'bounce',
      buffer: bounceBuffer,
      volume: 0.6,
      loop: false,
      pitch: 1.0
    })

    // Ball rolling sound - continuous rumble
    const rollBuffer = this.createRollingSound()
    this.soundEffects.set('roll', {
      id: 'roll',
      buffer: rollBuffer,
      volume: 0.3,
      loop: true,
      pitch: 1.0
    })

    // Electrical zap sound - sharp electronic buzz
    const zapBuffer = this.createElectricalZap()
    this.soundEffects.set('zap', {
      id: 'zap',
      buffer: zapBuffer,
      volume: 0.7,
      loop: false,
      pitch: 1.0
    })

    // Target port activation - satisfying chime
    const targetBuffer = this.createTargetSound()
    this.soundEffects.set('target', {
      id: 'target',
      buffer: targetBuffer,
      volume: 0.8,
      loop: false,
      pitch: 1.0
    })

    // Level complete - triumphant fanfare
    const completeBuffer = this.createLevelCompleteSound()
    this.soundEffects.set('level_complete', {
      id: 'level_complete',
      buffer: completeBuffer,
      volume: 0.9,
      loop: false,
      pitch: 1.0
    })

    // UI click sound - subtle beep
    const clickBuffer = this.createUIClickSound()
    this.soundEffects.set('ui_click', {
      id: 'ui_click',
      buffer: clickBuffer,
      volume: 0.5,
      loop: false,
      pitch: 1.0
    })

    console.log(`🎵 Created ${this.soundEffects.size} procedural sound effects`)
  }

  /**
   * Create realistic ball bounce sound
   */
  private createBounceSound(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.2 // 200ms
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 8) // Quick decay
      
      // Metallic ping with harmonics
      const fundamental = Math.sin(2 * Math.PI * 800 * t) * 0.5
      const harmonic2 = Math.sin(2 * Math.PI * 1600 * t) * 0.3
      const harmonic3 = Math.sin(2 * Math.PI * 2400 * t) * 0.2
      
      // Add some noise for realism
      const noise = (Math.random() - 0.5) * 0.1
      
      data[i] = (fundamental + harmonic2 + harmonic3 + noise) * envelope
    }

    return buffer
  }

  /**
   * Create ball rolling sound
   */
  private createRollingSound(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 1.0 // 1 second loop
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      
      // Low frequency rumble with random variations
      const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.3
      const highFreq = Math.sin(2 * Math.PI * 200 * t) * 0.1
      const noise = (Math.random() - 0.5) * 0.2
      
      data[i] = rumble + highFreq + noise
    }

    return buffer
  }

  /**
   * Create electrical zap sound
   */
  private createElectricalZap(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.3
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 6)
      
      // Sharp, buzzing electrical sound
      const buzz = Math.sin(2 * Math.PI * 1200 * t) * 0.4
      const crackle = Math.sin(2 * Math.PI * 3000 * t) * 0.3
      const noise = (Math.random() - 0.5) * 0.5
      
      data[i] = (buzz + crackle + noise) * envelope
    }

    return buffer
  }

  /**
   * Create target port activation sound
   */
  private createTargetSound(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.5
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 4)
      
      // Pleasant chime sound
      const chime1 = Math.sin(2 * Math.PI * 523 * t) * 0.5 // C5
      const chime2 = Math.sin(2 * Math.PI * 659 * t) * 0.3 // E5
      const chime3 = Math.sin(2 * Math.PI * 784 * t) * 0.2 // G5
      
      data[i] = (chime1 + chime2 + chime3) * envelope
    }

    return buffer
  }

  /**
   * Create level complete sound
   */
  private createLevelCompleteSound(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 1.0
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    // Simple ascending melody
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    const noteLength = length / notes.length

    for (let i = 0; i < length; i++) {
      const noteIndex = Math.floor(i / noteLength)
      const t = (i % noteLength) / sampleRate
      const envelope = Math.exp(-t * 2)
      
      const freq = notes[noteIndex] || notes[notes.length - 1]
      const tone = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5
      
      data[i] = tone
    }

    return buffer
  }

  /**
   * Create UI click sound
   */
  private createUIClickSound(): AudioBuffer {
    if (!this.audioContext) return null as any

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.1
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 20)
      
      const click = Math.sin(2 * Math.PI * 1000 * t) * envelope * 0.3
      data[i] = click
    }

    return buffer
  }

  /**
   * Play a sound effect
   */
  public playSound(soundId: string, volume: number = 1.0, pitch: number = 1.0): void {
    if (!this.config.enabled || !this.audioContext || !this.isInitialized) return

    const sound = this.soundEffects.get(soundId)
    if (!sound || !sound.buffer) {
      console.warn(`🔇 Sound not found: ${soundId}`)
      return
    }

    try {
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = sound.buffer
      source.loop = sound.loop
      source.playbackRate.value = pitch
      
      gainNode.gain.value = sound.volume * volume
      
      source.connect(gainNode)
      gainNode.connect(this.sfxGain!)
      
      source.start()
      
      // Auto-cleanup for non-looping sounds
      if (!sound.loop) {
        source.addEventListener('ended', () => {
          source.disconnect()
          gainNode.disconnect()
        })
      }
    } catch (error) {
      console.error(`❌ Error playing sound ${soundId}:`, error)
    }
  }

  /**
   * Play ball bounce sound with velocity-based pitch
   */
  public playBounceSound(velocity: number): void {
    const normalizedVelocity = Math.min(velocity / 500, 1.0)
    const volume = 0.3 + normalizedVelocity * 0.7
    const pitch = 0.8 + normalizedVelocity * 0.4
    
    this.playSound('bounce', volume, pitch)
  }

  /**
   * Play rolling sound (continuous)
   */
  public playRollingSound(): void {
    // Only play if not already playing
    this.playSound('roll', 0.5)
  }

  /**
   * Stop all sounds
   */
  public stopAllSounds(): void {
    if (!this.audioContext) return

    try {
      // Stop current music
      if (this.currentMusic) {
        this.currentMusic.stop()
        this.currentMusic = null
      }
      
      // Note: Individual sound effects will stop automatically
      console.log('🔇 All sounds stopped')
    } catch (error) {
      console.error('❌ Error stopping sounds:', error)
    }
  }

  /**
   * Set master volume
   */
  public setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume
    }
  }

  /**
   * Set sound effects volume
   */
  public setSFXVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume))
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.config.sfxVolume
    }
  }

  /**
   * Set music volume
   */
  public setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.musicGain) {
      this.musicGain.gain.value = this.config.musicVolume
    }
  }

  /**
   * Enable/disable audio
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    if (!enabled) {
      this.stopAllSounds()
    }
  }

  /**
   * Get audio configuration
   */
  public getConfig(): AudioConfig {
    return { ...this.config }
  }

  /**
   * Resume audio context (required for user interaction)
   */
  public async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
      console.log('🔊 Audio context resumed')
    }
  }

  /**
   * Check if audio is available
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.config.enabled
  }

  /**
   * Get the correct base URL for assets
   */
  private getBaseUrl(): string {
    // For GitHub Pages deployment, use the base URL from the current location
    const baseUrl = window.location.pathname.includes('/circuit-breaker/') 
      ? '/circuit-breaker/' 
      : '/'
    return baseUrl
  }

  /**
   * Load an MP3 file from the public/assets/audio folder
   */
  public async loadMusic(filename: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null

    try {
      const baseUrl = this.getBaseUrl()
      const audioUrl = `${baseUrl}assets/audio/${filename}`
      console.log(`🎵 Attempting to load audio from: ${audioUrl}`)
      
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Cache the loaded music
      this.loadedSounds.set(filename, audioBuffer)
      
      console.log(`🎵 Loaded music: ${filename}`)
      return audioBuffer
    } catch (error) {
      console.error(`❌ Error loading music ${filename}:`, error)
      return null
    }
  }

  /**
   * Play background music
   */
  public async playMusic(filename: string, loop: boolean = true, volume: number = 1.0): Promise<void> {
    if (!this.config.enabled || !this.audioContext || !this.isInitialized) return

    // Stop current music if playing
    this.stopMusic()

    try {
      // Load music if not already cached
      let audioBuffer = this.loadedSounds.get(filename)
      if (!audioBuffer) {
        const loadedBuffer = await this.loadMusic(filename)
        if (!loadedBuffer) return
        audioBuffer = loadedBuffer
      }

      // Create source and gain nodes
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = audioBuffer
      source.loop = loop
      gainNode.gain.value = volume

      // Connect nodes
      source.connect(gainNode)
      gainNode.connect(this.musicGain!)

      // Store references for later control
      this.currentMusic = source
      this.currentMusicGain = gainNode

      // Start playing
      source.start()

      // Handle music ending (for non-looping tracks)
      if (!loop) {
        source.addEventListener('ended', () => {
          this.currentMusic = null
          this.currentMusicGain = null
        })
      }

      console.log(`🎵 Playing music: ${filename} (loop: ${loop})`)
    } catch (error) {
      console.error(`❌ Error playing music ${filename}:`, error)
    }
  }

  /**
   * Stop current background music
   */
  public stopMusic(): void {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop()
        this.currentMusic.disconnect()
        if (this.currentMusicGain) {
          this.currentMusicGain.disconnect()
        }
      } catch (error) {
        // Ignore errors when stopping already stopped music
      }
      this.currentMusic = null
      this.currentMusicGain = null
      console.log('🔇 Music stopped')
    }
  }

  /**
   * Fade out current music and optionally start new music
   */
  public async fadeToMusic(newFilename: string | null = null, fadeTime: number = 1.0): Promise<void> {
    if (!this.currentMusicGain || !this.audioContext) {
      if (newFilename) {
        await this.playMusic(newFilename)
      }
      return
    }

    // Fade out current music
    const fadeSteps = 60 // 60 steps for smooth fade
    const fadeInterval = (fadeTime * 1000) / fadeSteps
    const volumeStep = this.currentMusicGain.gain.value / fadeSteps

    for (let i = 0; i < fadeSteps; i++) {
      setTimeout(() => {
        if (this.currentMusicGain) {
          this.currentMusicGain.gain.value = Math.max(0, this.currentMusicGain.gain.value - volumeStep)
        }
      }, i * fadeInterval)
    }

    // Stop current music after fade
    setTimeout(() => {
      this.stopMusic()
      
      // Start new music if specified
      if (newFilename) {
        this.playMusic(newFilename)
      }
    }, fadeTime * 1000)
  }

  /**
   * Check if music is currently playing
   */
  public isMusicPlaying(): boolean {
    return this.currentMusic !== null
  }
}
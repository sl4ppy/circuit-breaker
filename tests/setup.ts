// Circuit Breaker - Test Setup
// Global test configuration and setup

// Mock canvas for testing
const mockCanvas = {
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    fillText: () => {},
    strokeText: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    setTransform: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
  }),
  width: 800,
  height: 600,
}

// Mock HTMLCanvasElement
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class {
    getContext() {
      return mockCanvas.getContext()
    }
    get width() {
      return mockCanvas.width
    }
    set width(value: number) {
      mockCanvas.width = value
    }
    get height() {
      return mockCanvas.height
    }
    set height(value: number) {
      mockCanvas.height = value
    }
  },
})

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as any
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Mock performance
global.performance = {
  now: () => Date.now(),
} as Performance 
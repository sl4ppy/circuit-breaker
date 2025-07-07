// Circuit Breaker - Centralized Power-Up Configuration
// Single source of truth for all power-up settings and effects

import { PowerUpType, BallType } from './PowerUpTypes';

export interface VisualEffectConfig {
  type: 'overlay' | 'particle' | 'glow' | 'animation';
  data: any;
}

export interface PhysicsEffectConfig {
  timeScale?: number;
  magneticForce?: number;
  barSpeedMultiplier?: number;
  frictionModifier?: number;
  massMultiplier?: number;
}

export interface PowerUpConfig {
  // Basic properties
  name: string;
  description: string;
  baseDuration: number; // -1 for permanent until used
  baseCharges: number;
  
  // Effect configurations
  physics: PhysicsEffectConfig;
  
  // Visual effects
  visualEffects: {
    activation: VisualEffectConfig[];
    active: VisualEffectConfig[];
    deactivation: VisualEffectConfig[];
  };
  
  // Audio effects
  audio: {
    activation?: string;
    deactivation?: string;
    ambient?: string;
  };
  
  // Upgrade scaling
  upgradeScaling: {
    durationMultiplier?: number;
    chargesMultiplier?: number;
    effectMultiplier?: number;
  };
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  [PowerUpType.SLOW_MO_SURGE]: {
    name: 'Slow-Mo Surge',
    description: 'Slows down time for precise control',
    baseDuration: 5000, // 5 seconds
    baseCharges: 1,
    physics: {
      timeScale: 0.3, // 30% speed - unified value
    },
    visualEffects: {
      activation: [
        {
          type: 'overlay',
          data: {
            color: 'rgba(0, 255, 255, 0.2)',
            opacity: 0.3,
            fadeIn: 300,
          },
        },
      ],
      active: [
        {
          type: 'overlay',
          data: {
            color: 'rgba(0, 255, 255, 0.4)',
            opacity: 0.3,
            pulse: true,
            pulseSpeed: 0.01,
          },
        },
        {
          type: 'glow',
          data: {
            target: 'ball',
            color: '#00ffff',
            intensity: 1.5,
            pulse: true,
          },
        },
      ],
      deactivation: [
        {
          type: 'overlay',
          data: {
            color: 'rgba(0, 255, 255, 0.2)',
            opacity: 0.3,
            fadeOut: 500,
          },
        },
      ],
    },
    audio: {
      activation: 'slowmo_activate',
      deactivation: 'slowmo_deactivate',
      ambient: 'slowmo_ambient',
    },
    upgradeScaling: {
      durationMultiplier: 1.2,
      chargesMultiplier: 1.0,
      effectMultiplier: 1.0,
    },
  },

  [PowerUpType.MAGNETIC_GUIDE]: {
    name: 'Magnetic Guide',
    description: 'Attracts the ball toward the target',
    baseDuration: 5000, // 5 seconds
    baseCharges: 1,
    physics: {
      magneticForce: 0.3,
    },
    visualEffects: {
      activation: [
        {
          type: 'glow',
          data: {
            target: 'hole',
            color: '#ff00ff',
            intensity: 0.5,
            fadeIn: 200,
          },
        },
      ],
      active: [
        {
          type: 'glow',
          data: {
            target: 'hole',
            color: '#ff00ff',
            intensity: 1.0,
            pulse: true,
            pulseSpeed: 0.01,
            pulseAmplitude: 0.3,
          },
        },
        {
          type: 'particle',
          data: {
            type: 'electric_arc',
            from: 'ball',
            to: 'hole',
            color: '#ff00ff',
            count: 3,
            frequency: 100, // ms between particles
          },
        },
      ],
      deactivation: [
        {
          type: 'glow',
          data: {
            target: 'hole',
            color: '#ff00ff',
            intensity: 0.5,
            fadeOut: 300,
          },
        },
      ],
    },
    audio: {
      activation: 'magnetic_activate',
      ambient: 'magnetic_ambient',
    },
    upgradeScaling: {
      durationMultiplier: 1.1,
      effectMultiplier: 1.3,
    },
  },

  [PowerUpType.CIRCUIT_PATCH]: {
    name: 'Circuit Patch',
    description: 'Shields the ball from falling off once',
    baseDuration: -1, // Permanent until used
    baseCharges: 1,
    physics: {
      // No physics effects - handled as special case
    },
    visualEffects: {
      activation: [
        {
          type: 'glow',
          data: {
            target: 'ball',
            color: '#00ff00',
            intensity: 0.8,
            type: 'shield_ring',
            fadeIn: 400,
          },
        },
      ],
      active: [
        {
          type: 'glow',
          data: {
            target: 'ball',
            color: '#00ff00',
            intensity: 1.2,
            type: 'shield_ring',
            pulse: true,
            pulseSpeed: 0.02,
          },
        },
      ],
      deactivation: [
        {
          type: 'glow',
          data: {
            target: 'ball',
            color: '#00ff00',
            intensity: 2.0,
            type: 'shield_explosion',
            duration: 200,
          },
        },
      ],
    },
    audio: {
      activation: 'shield_activate',
      deactivation: 'shield_used',
    },
    upgradeScaling: {
      chargesMultiplier: 1.0,
    },
  },

  [PowerUpType.OVERCLOCK_BOOST]: {
    name: 'Overclock Boost',
    description: 'Increases bar movement speed',
    baseDuration: 4000, // 4 seconds
    baseCharges: 1,
    physics: {
      barSpeedMultiplier: 1.5,
    },
    visualEffects: {
      activation: [
        {
          type: 'glow',
          data: {
            target: 'bar',
            color: '#ff6600',
            intensity: 1.0,
            fadeIn: 200,
          },
        },
      ],
      active: [
        {
          type: 'glow',
          data: {
            target: 'bar',
            color: '#ff6600',
            intensity: 1.0,
            pulse: true,
            pulseSpeed: 0.02,
            pulseAmplitude: 0.5,
          },
        },
        {
          type: 'particle',
          data: {
            type: 'spark',
            target: 'bar_ends',
            color: '#ff6600',
            count: 5,
            frequency: 200,
          },
        },
      ],
      deactivation: [
        {
          type: 'glow',
          data: {
            target: 'bar',
            color: '#ff6600',
            intensity: 1.5,
            fadeOut: 400,
          },
        },
      ],
    },
    audio: {
      activation: 'overclock_activate',
      deactivation: 'overclock_deactivate',
      ambient: 'overclock_ambient',
    },
    upgradeScaling: {
      durationMultiplier: 1.2,
      effectMultiplier: 1.1,
    },
  },

  [PowerUpType.SCAN_REVEAL]: {
    name: 'Scan Reveal',
    description: 'Shows the optimal path to the target',
    baseDuration: 3000, // 3 seconds
    baseCharges: 1,
    physics: {
      // No physics effects - pure visual
    },
    visualEffects: {
      activation: [
        {
          type: 'animation',
          data: {
            type: 'scan_sweep',
            color: '#00ffff',
            speed: 3.0,
            fadeIn: 100,
          },
        },
      ],
      active: [
        {
          type: 'overlay',
          data: {
            type: 'path_reveal',
            color: '#00ffff',
            opacity: 0.6,
            animated: true,
          },
        },
        {
          type: 'animation',
          data: {
            type: 'scan_bar',
            color: '#00ffff',
            speed: 2.0,
          },
        },
      ],
      deactivation: [
        {
          type: 'overlay',
          data: {
            type: 'path_reveal',
            color: '#00ffff',
            opacity: 0.6,
            fadeOut: 500,
          },
        },
      ],
    },
    audio: {
      activation: 'scan_activate',
      deactivation: 'scan_deactivate',
    },
    upgradeScaling: {
      durationMultiplier: 1.3,
    },
  },
};

// Ball type configurations
export interface BallTypeConfig {
  name: string;
  description: string;
  physics: {
    mass: number;
    friction: number;
    restitution: number;
  };
  visual: {
    sprite: string;
    glow?: {
      color: string;
      intensity: number;
    };
    trail?: {
      color: string;
      length: number;
    };
  };
  unlockCondition: {
    type: 'score' | 'achievement' | 'level';
    value: number | string;
  };
}

export const BALL_TYPE_CONFIGS: Record<BallType, BallTypeConfig> = {
  [BallType.STANDARD]: {
    name: 'Standard Ball',
    description: 'The classic ball with balanced physics',
    physics: {
      mass: 6,
      friction: 0.18,
      restitution: 0.65,
    },
    visual: {
      sprite: 'ball_standard',
    },
    unlockCondition: {
      type: 'score',
      value: 0, // Always unlocked
    },
  },

  [BallType.HEAVY]: {
    name: 'Heavy Ball',
    description: 'Harder to control but more stable',
    physics: {
      mass: 9, // 1.5x standard
      friction: 0.216, // 1.2x standard
      restitution: 0.52, // 0.8x standard
    },
    visual: {
      sprite: 'ball_heavy',
      glow: {
        color: '#666666',
        intensity: 0.8,
      },
    },
    unlockCondition: {
      type: 'score',
      value: 50000,
    },
  },

  [BallType.LIGHT]: {
    name: 'Light Ball',
    description: 'More responsive but less stable',
    physics: {
      mass: 4.2, // 0.7x standard
      friction: 0.108, // 0.6x standard
      restitution: 0.715, // 1.1x standard
    },
    visual: {
      sprite: 'ball_light',
      glow: {
        color: '#ffffff',
        intensity: 1.2,
      },
      trail: {
        color: '#ffffff',
        length: 5,
      },
    },
    unlockCondition: {
      type: 'achievement',
      value: 'speed_demon',
    },
  },

  [BallType.NEON_SPLIT]: {
    name: 'Neon Split',
    description: 'Unique physics with special effects',
    physics: {
      mass: 5.4, // 0.9x standard
      friction: 0.162, // 0.9x standard
      restitution: 0.65, // Same as standard
    },
    visual: {
      sprite: 'ball_neon',
      glow: {
        color: '#00ffff',
        intensity: 1.5,
      },
      trail: {
        color: '#00ffff',
        length: 8,
      },
    },
    unlockCondition: {
      type: 'level',
      value: 15,
    },
  },
};

// Upgrade configurations
export interface UpgradeConfig {
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // Cost for each level
  effects: {
    [key: string]: number[]; // Effect values per level
  };
}

export const UPGRADE_CONFIGS: Record<string, UpgradeConfig> = {
  slowMoCharges: {
    name: 'Slow-Mo Charges',
    description: 'Increases maximum Slow-Mo Surge charges',
    maxLevel: 3,
    costs: [1000, 2500, 5000],
    effects: {
      maxCharges: [2, 3, 4],
    },
  },

  barSpeedLevel: {
    name: 'Bar Speed',
    description: 'Increases base bar movement speed',
    maxLevel: 5,
    costs: [500, 1000, 2000, 4000, 8000],
    effects: {
      speedMultiplier: [1.1, 1.2, 1.3, 1.4, 1.5],
    },
  },

  frictionLevel: {
    name: 'Friction Reduction',
    description: 'Reduces surface friction for smoother movement',
    maxLevel: 4,
    costs: [800, 1600, 3200, 6400],
    effects: {
      frictionModifier: [0.95, 0.9, 0.85, 0.8],
    },
  },

  shieldLevel: {
    name: 'Shield Capacity',
    description: 'Increases maximum shield charges',
    maxLevel: 3,
    costs: [1500, 3000, 6000],
    effects: {
      maxCharges: [2, 3, 4],
    },
  },
};

// Helper functions
export function getPowerUpConfig(type: PowerUpType): PowerUpConfig {
  return POWER_UP_CONFIGS[type];
}

export function getBallTypeConfig(type: BallType): BallTypeConfig {
  return BALL_TYPE_CONFIGS[type];
}

export function getUpgradeConfig(upgradeType: string): UpgradeConfig {
  return UPGRADE_CONFIGS[upgradeType];
}

// Configuration validation
export function validatePowerUpConfig(config: PowerUpConfig): boolean {
  return (
    config.name.length > 0 &&
    config.baseDuration > 0 &&
    config.baseCharges > 0 &&
    config.visualEffects.activation.length > 0
  );
}

export function validateBallTypeConfig(config: BallTypeConfig): boolean {
  return (
    config.name.length > 0 &&
    config.physics.mass > 0 &&
    config.physics.friction >= 0 &&
    config.physics.restitution >= 0 &&
    config.visual.sprite.length > 0
  );
} 
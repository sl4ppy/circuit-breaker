// Circuit Breaker - Power-Up Type Definitions
// Separate file to avoid circular dependencies

export enum PowerUpType {
  SLOW_MO_SURGE = 'slow_mo_surge',
  MAGNETIC_GUIDE = 'magnetic_guide',
  CIRCUIT_PATCH = 'circuit_patch',
  OVERCLOCK_BOOST = 'overclock_boost',
  SCAN_REVEAL = 'scan_reveal',
}

export enum BallType {
  STANDARD = 'standard',
  HEAVY = 'heavy',
  LIGHT = 'light',
  NEON_SPLIT = 'neon_split',
} 
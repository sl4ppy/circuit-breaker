# Circuit Breaker - Robust Physics System

## Overview

Circuit Breaker now uses a highly robust and accurate physics system based on **Verlet Integration** with **constraint solving** and **impulse-based collision resolution**. This system provides stable, accurate physics simulation suitable for intensive physics-based gameplay.

## Key Features

### 1. Verlet Integration
- **Stable Integration**: Uses Verlet integration instead of Euler integration for better stability
- **Energy Conservation**: Maintains better energy conservation over time
- **No Velocity Accumulation**: Reduces numerical drift and instability
- **Position-Based**: Directly integrates positions, calculating velocities from position changes

### 2. Constraint Solving
- **Distance Constraints**: Maintain fixed distances between objects (springs, rods)
- **Position Constraints**: Pin objects to specific positions (anchors)
- **Angle Constraints**: Maintain angles between objects (planned)
- **Iterative Solver**: Multiple constraint iterations per frame for accuracy

### 3. Advanced Collision Detection
- **Continuous Collision Detection**: Prevents tunneling through fast-moving objects
- **Collision Manifolds**: Detailed collision information including contact points and normals
- **Spatial Partitioning**: Efficient broad-phase collision detection using spatial grids
- **Impulse-Based Resolution**: Accurate collision response with proper mass consideration

### 4. Fixed Timestep Simulation
- **Deterministic Physics**: Fixed timestep ensures consistent behavior across different framerates
- **Substeps**: Multiple physics substeps per frame for increased accuracy
- **Time Accumulation**: Handles variable framerate gracefully

### 5. Per-Object Properties
- **Mass**: Affects collision response and constraint solving
- **Restitution**: Bounciness (0-1)
- **Friction**: Surface friction for realistic interactions
- **Individual Settings**: Each object can have unique physical properties

## Physics Engine Architecture

### Core Components

```typescript
interface PhysicsObject {
  id: string
  position: { x: number; y: number }
  previousPosition: { x: number; y: number }
  acceleration: { x: number; y: number }
  velocity: { x: number; y: number }
  radius: number
  mass: number
  inverseMass: number
  restitution: number
  friction: number
  isStatic: boolean
  constraints: Constraint[]
}
```

### Simulation Loop

1. **Position Integration** (Verlet)
   ```
   newPosition = 2 * position - previousPosition + acceleration * dt²
   ```

2. **Constraint Solving** (Iterative)
   - Distance constraints
   - Position constraints
   - Angle constraints

3. **Collision Detection**
   - Broad phase (spatial grid)
   - Narrow phase (circle-circle)
   - Manifold generation

4. **Collision Resolution**
   - Position correction
   - Impulse-based velocity correction

5. **Boundary Handling**
   - Wall collisions
   - Floor collisions
   - Tilting bar collisions

## Performance Optimizations

### Spatial Partitioning
- **Grid-Based**: Divides space into 60x60 pixel cells
- **Efficient Queries**: Only checks nearby objects for collisions
- **Dynamic Updates**: Grid updates as objects move

### Substeps
- **4 Substeps**: Each frame divided into 4 physics substeps
- **Smaller Timesteps**: Increases accuracy without reducing performance
- **Constraint Iterations**: 3 iterations per substep for constraint solving

### Mass Optimization
- **Inverse Mass**: Precomputed 1/mass for performance
- **Static Objects**: Zero inverse mass for immovable objects

## Configuration Parameters

### Global Settings
```typescript
// Gravity
physicsEngine.setGravity(0, 400)

// Air resistance
physicsEngine.setAirResistance(0.999)

// Simulation bounds
physicsEngine.setBounds(360, 640)

// Constraint iterations
constraintIterations = 3

// Substeps per frame
substeps = 4
```

### Per-Object Settings
```typescript
const ball = physicsEngine.createObject({
  id: 'ball',
  x: 100, y: 100,
  radius: 12,
  mass: 1,
  restitution: 0.8,  // Bounciness
  friction: 0.2,     // Surface friction
  isStatic: false
})
```

## Constraint System

### Distance Constraints
Maintain fixed distances between objects:
```typescript
physicsEngine.addConstraint({
  type: 'distance',
  objectA: ball1,
  objectB: ball2,
  targetDistance: 50,
  stiffness: 0.8
})
```

### Position Constraints
Pin objects to specific positions:
```typescript
physicsEngine.addConstraint({
  type: 'position',
  objectA: ball,
  targetPosition: { x: 300, y: 200 },
  stiffness: 0.1
})
```

## Debug Visualization

The system includes comprehensive debug visualization:

- **Velocity Vectors**: Yellow arrows showing object velocities
- **Collision Points**: Red dots at collision contact points
- **Collision Normals**: Red lines showing collision directions
- **Distance Constraints**: Green dashed lines between constrained objects
- **Position Constraints**: Magenta dashed lines to target positions
- **Object Info**: ID and velocity magnitude for each object

## Advantages Over Previous System

### Stability
- **No Tunneling**: Continuous collision detection prevents objects passing through barriers
- **Consistent Behavior**: Fixed timestep ensures reproducible physics
- **Energy Conservation**: Verlet integration maintains energy better than Euler

### Accuracy
- **Proper Mass Handling**: Realistic collision response based on object masses
- **Constraint Satisfaction**: Iterative solver maintains constraints accurately
- **Impulse-Based Collisions**: Physically accurate collision resolution

### Flexibility
- **Per-Object Properties**: Individual restitution, friction, and mass settings
- **Constraint System**: Flexible constraint types for complex behaviors
- **Modular Design**: Easy to extend with new constraint types

### Performance
- **Spatial Partitioning**: Efficient collision detection for many objects
- **Optimized Math**: Precomputed inverse masses and optimized vector operations
- **Substeps**: Better accuracy without proportional performance cost

## Testing and Validation

The current implementation includes several test objects:

1. **Main Game Ball**: Standard physics properties
2. **Bouncy Ball**: High restitution, low friction
3. **Heavy Ball**: High mass, lower restitution
4. **Static Obstacle**: Immovable collision object
5. **Constrained Balls**: Demonstrate distance constraints
6. **Pinned Ball**: Demonstrates position constraints

## Future Enhancements

### Planned Features
- **Angle Constraints**: Maintain angles between objects
- **Soft Body Physics**: Deformable objects using constraint networks
- **Fluid Simulation**: Particle-based fluid dynamics
- **Force Fields**: Magnetic fields, wind, etc.

### Performance Improvements
- **Broad Phase Optimization**: Hierarchical spatial structures
- **Parallel Processing**: Multi-threaded constraint solving
- **Adaptive Timesteps**: Variable timestep based on simulation complexity

## Integration with Game Systems

The robust physics system integrates seamlessly with existing game systems:

- **Tilting Bar**: Continuous collision detection prevents ball tunneling
- **Input System**: Responsive controls with stable physics
- **Rendering**: Debug visualization and smooth object movement
- **Game Logic**: Reliable physics for gameplay mechanics

This robust physics system provides the foundation for intensive physics-based gameplay while maintaining excellent performance and stability. 
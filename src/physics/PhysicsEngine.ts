// Circuit Breaker - Advanced Physics Engine
// Robust Verlet integration with constraint solving and accurate collision detection

import { Debug } from '../utils/Debug';
import { TiltingBar } from '../core/TiltingBar';

export interface PhysicsObject {
  id: string;
  position: { x: number; y: number };
  previousPosition: { x: number; y: number };
  acceleration: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  mass: number;
  inverseMass: number; // 1/mass for performance
  restitution: number; // Bounciness (0-1)
  friction: number; // Surface friction (0-1)
  isStatic: boolean;
  constraints: Constraint[];

  // For backward compatibility
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  type?: 'dynamic' | 'static';
  rotation?: number;
  width?: number;
  height?: number;

  // Rolling physics state
  isRollingOnBar?: boolean;
}

export interface Constraint {
  type: 'distance' | 'position' | 'angle';
  objectA: PhysicsObject;
  objectB?: PhysicsObject;
  targetDistance?: number;
  targetPosition?: { x: number; y: number };
  targetAngle?: number;
  stiffness: number;
  restLength?: number;
}

export interface CollisionManifold {
  objectA: PhysicsObject;
  objectB: PhysicsObject;
  normal: { x: number; y: number };
  penetration: number;
  contactPoint: { x: number; y: number };
}

interface SpatialCell {
  objects: PhysicsObject[];
}

export class PhysicsEngine {
  private gravity: { x: number; y: number } = { x: 0, y: 400 };
  private airResistance: number = 0.999;
  private objects: PhysicsObject[] = [];
  private constraints: Constraint[] = [];
  private spatialGrid: Map<string, SpatialCell> = new Map();
  private gridSize: number = 60;
  private tiltingBar: TiltingBar | null = null;
  private bounds = { width: 360, height: 640 };

  // Simulation parameters (optimized for performance)
  private deltaTime: number = 1 / 60;

  // Performance tracking
  private debug: boolean = false;
  private collisionManifolds: CollisionManifold[] = [];

  // Audio callback for collision sounds
  private audioCallback: ((velocity: number, type: string) => void) | null =
    null;

  // Audio cooldown timers to prevent rapid-fire collision sounds (in milliseconds)
  private audioTimeouts: Map<string, number> = new Map();
  private readonly AUDIO_COOLDOWN_MS = 150; // 150ms cooldown between same collision type sounds

  constructor() {
    Debug.log('⚡ Advanced PhysicsEngine initialized with Verlet integration');
  }

  /**
   * Set the tilting bar reference for collision detection
   */
  public setTiltingBar(bar: TiltingBar): void {
    this.tiltingBar = bar;
  }

  /**
   * Set audio callback for collision sounds
   */
  public setAudioCallback(
    callback: (velocity: number, type: string) => void,
  ): void {
    this.audioCallback = callback;
  }

  /**
   * Play audio with cooldown to prevent rapid-fire sounds
   */
  private playAudioWithCooldown(
    velocity: number,
    type: string,
    objectId: string,
  ): void {
    if (!this.audioCallback) return;

    const now = Date.now();
    const cooldownKey = `${objectId}_${type}`;
    const lastAudioTime = this.audioTimeouts.get(cooldownKey) || 0;

    // Only play if enough time has passed since last audio of this type for this object
    if (now - lastAudioTime >= this.AUDIO_COOLDOWN_MS) {
      this.audioCallback(velocity, type);
      this.audioTimeouts.set(cooldownKey, now);
    }
  }

  /**
   * Create a physics object with proper initialization
   */
  public createObject(config: {
    id: string;
    x: number;
    y: number;
    radius: number;
    mass?: number;
    restitution?: number;
    friction?: number;
    isStatic?: boolean;
  }): PhysicsObject {
    const mass = config.mass || 1;
    const obj: PhysicsObject = {
      id: config.id,
      position: { x: config.x, y: config.y },
      previousPosition: { x: config.x, y: config.y },
      acceleration: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: config.radius,
      mass: mass,
      inverseMass: config.isStatic ? 0 : 1 / mass,
      restitution: config.restitution || 0.7,
      friction: config.friction || 0.3,
      isStatic: config.isStatic || false,
      constraints: [],
      // Backward compatibility
      x: config.x,
      y: config.y,
      vx: 0,
      vy: 0,
    };

    return obj;
  }

  /**
   * Add a physics object to the simulation
   */
  public addObject(obj: PhysicsObject): void {
    // Ensure proper initialization if not created with createObject
    if (!obj.previousPosition) {
      obj.previousPosition = {
        x: obj.position?.x || obj.x || 0,
        y: obj.position?.y || obj.y || 0,
      };
    }
    if (!obj.acceleration) {
      obj.acceleration = { x: 0, y: 0 };
    }
    if (!obj.velocity) {
      obj.velocity = { x: 0, y: 0 };
    }
    if (!obj.inverseMass) {
      obj.inverseMass = obj.isStatic ? 0 : 1 / (obj.mass || 1);
    }
    if (!obj.constraints) {
      obj.constraints = [];
    }

    this.objects.push(obj);
    this.updateSpatialGrid();
    Debug.log(`Added physics object: ${obj.id}`);
  }

  /**
   * Remove a physics object by id
   */
  public removeObject(id: string): void {
    this.objects = this.objects.filter(obj => obj.id !== id);
    this.updateSpatialGrid();
    Debug.log(`Removed physics object: ${id}`);
  }

  /**
   * Add a constraint between objects
   */
  public addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
    Debug.log(`Added constraint: ${constraint.type}`);
  }

  /**
   * Main physics update (optimized for performance)
   */
  public update(frameTime: number): void {
    // Convert milliseconds to seconds and apply time scaling
    const dt = frameTime / 1000; // Convert to seconds
    this.simulateStep(dt);

    // Update backward compatibility properties
    this.updateBackwardCompatibility();
  }

  /**
   * Single physics simulation step (optimized)
   */
  private simulateStep(dt: number): void {
    // Clear collision manifolds and rolling flags
    this.collisionManifolds = [];
    for (const obj of this.objects) {
      obj.isRollingOnBar = false;
    }

    // Update spatial grid only when needed
    if (this.objects.length > 0) {
      this.updateSpatialGrid();
    }

    // Integrate positions using simplified Verlet integration
    this.integratePositions(dt);

    // Single iteration of constraints and collisions for performance
    this.solveConstraints();
    this.detectAndResolveCollisions();

    // Handle tilting bar collisions and rolling physics
    this.handleTiltingBarCollisions();

    // Handle boundary collisions
    this.handleBoundaryCollisions();

    // Update velocities from position changes
    this.updateVelocities(dt);
  }

  /**
   * Simplified Verlet integration for position updates
   */
  private integratePositions(dt: number): void {
    for (const obj of this.objects) {
      if (obj.isStatic) continue;

      // Check if ball is held (e.g., in a saucer)
      if (this.isBallHeld(obj.id)) {
        // Get target position for held ball
        const targetPos = this.getHeldBallTarget(obj.id);
        if (targetPos) {
          // Smoothly move ball to target position
          const smoothingFactor = 0.1; // Smooth movement
          obj.position.x += (targetPos.x - obj.position.x) * smoothingFactor;
          obj.position.y += (targetPos.y - obj.position.y) * smoothingFactor;
        }
        
        // Keep ball in place by maintaining consistent previous position
        // This prevents jittery movement when physics tries to move the ball
        obj.previousPosition.x = obj.position.x;
        obj.previousPosition.y = obj.position.y;
        continue;
      }

      // Calculate current velocity
      const velX = obj.position.x - obj.previousPosition.x;
      const velY = obj.position.y - obj.previousPosition.y;

      // Store current position as previous
      obj.previousPosition.x = obj.position.x;
      obj.previousPosition.y = obj.position.y;

      // Update position with velocity and gravity
      const gravityX = this.gravity.x * dt * dt;
      const gravityY = this.gravity.y * dt * dt;
      obj.position.x += velX * this.airResistance + gravityX;
      obj.position.y += velY * this.airResistance + gravityY;
    }
  }

  /**
   * Update velocities from position changes
   */
  private updateVelocities(dt: number): void {
    for (const obj of this.objects) {
      if (obj.isStatic) continue;

      obj.velocity.x = (obj.position.x - obj.previousPosition.x) / dt;
      obj.velocity.y = (obj.position.y - obj.previousPosition.y) / dt;
    }
  }

  /**
   * Solve all constraints
   */
  private solveConstraints(): void {
    for (const constraint of this.constraints) {
      this.solveConstraint(constraint);
    }
  }

  /**
   * Solve individual constraint
   */
  private solveConstraint(constraint: Constraint): void {
    switch (constraint.type) {
    case 'distance':
      this.solveDistanceConstraint(constraint);
      break;
    case 'position':
      this.solvePositionConstraint(constraint);
      break;
    case 'angle':
      this.solveAngleConstraint(constraint);
      break;
    }
  }

  /**
   * Solve distance constraint between two objects
   */
  private solveDistanceConstraint(constraint: Constraint): void {
    if (!constraint.objectB || !constraint.targetDistance) return;

    const objA = constraint.objectA;
    const objB = constraint.objectB;

    const dx = objB.position.x - objA.position.x;
    const dy = objB.position.y - objA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const difference = constraint.targetDistance - distance;
    const percent = difference / distance / 2;
    const offsetX = dx * percent * constraint.stiffness;
    const offsetY = dy * percent * constraint.stiffness;

    if (!objA.isStatic) {
      objA.position.x -= offsetX * objA.inverseMass;
      objA.position.y -= offsetY * objA.inverseMass;
    }

    if (!objB.isStatic) {
      objB.position.x += offsetX * objB.inverseMass;
      objB.position.y += offsetY * objB.inverseMass;
    }
  }

  /**
   * Solve position constraint (pin object to position)
   */
  private solvePositionConstraint(constraint: Constraint): void {
    if (!constraint.targetPosition) return;

    const obj = constraint.objectA;
    if (obj.isStatic) return;

    const dx = constraint.targetPosition.x - obj.position.x;
    const dy = constraint.targetPosition.y - obj.position.y;

    obj.position.x += dx * constraint.stiffness;
    obj.position.y += dy * constraint.stiffness;
  }

  /**
   * Solve angle constraint (maintain angle between objects)
   */
  private solveAngleConstraint(_constraint: Constraint): void {
    // Implementation for angle constraints if needed
    // This is more complex and depends on specific requirements
  }

  /**
   * Detect and resolve collisions between objects (optimized)
   */
  private detectAndResolveCollisions(): void {
    // Only check collisions if we have multiple objects
    if (this.objects.length < 2) return;

    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      if (obj.isStatic) continue;

      // Check only against objects after this one to avoid duplicate checks
      for (let j = i + 1; j < this.objects.length; j++) {
        const otherObj = this.objects[j];

        // Quick distance check before expensive collision detection
        const dx = otherObj.position.x - obj.position.x;
        const dy = otherObj.position.y - obj.position.y;
        const maxDistance = obj.radius + otherObj.radius + 5; // Small buffer

        if (dx * dx + dy * dy < maxDistance * maxDistance) {
          const manifold = this.detectCollision(obj, otherObj);
          if (manifold) {
            this.collisionManifolds.push(manifold);
            this.resolveCollisionSimple(manifold);
          }
        }
      }
    }
  }

  /**
   * Detect collision between two objects
   */
  private detectCollision(
    objA: PhysicsObject,
    objB: PhysicsObject,
  ): CollisionManifold | null {
    const dx = objB.position.x - objA.position.x;
    const dy = objB.position.y - objA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = objA.radius + objB.radius;

    if (distance < minDistance) {
      const penetration = minDistance - distance;
      const normal =
        distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };

      return {
        objectA: objA,
        objectB: objB,
        normal: normal,
        penetration: penetration,
        contactPoint: {
          x: objA.position.x + normal.x * objA.radius,
          y: objA.position.y + normal.y * objA.radius,
        },
      };
    }

    return null;
  }

  /**
   * Resolve collision using impulse-based method
   */
  // private resolveCollision(manifold: CollisionManifold): void {
  //   const objA = manifold.objectA;
  //   const objB = manifold.objectB;

  //   // Position correction to prevent sinking
  //   const correction =
  //     (manifold.penetration / (objA.inverseMass + objB.inverseMass)) * 0.8;
  //   objA.position.x -= manifold.normal.x * correction * objA.inverseMass;
  //   objA.position.y -= manifold.normal.y * correction * objA.inverseMass;
  //   objB.position.x += manifold.normal.x * correction * objB.inverseMass;
  //   objB.position.y += manifold.normal.y * correction * objB.inverseMass;

  //   // Velocity correction
  //   const relativeVelocity = {
  //     x: objB.velocity.x - objA.velocity.x,
  //     y: objB.velocity.y - objA.velocity.y,
  //   };

  //   const velocityAlongNormal =
  //     relativeVelocity.x * manifold.normal.x +
  //     relativeVelocity.y * manifold.normal.y;

  //   if (velocityAlongNormal > 0) return; // Objects separating

  //   const restitution = Math.min(objA.restitution, objB.restitution);
  //   const impulseScalar =
  //     (-(1 + restitution) * velocityAlongNormal) /
  //     (objA.inverseMass + objB.inverseMass);

  //   const impulse = {
  //       x: impulseScalar * manifold.normal.x,
  //       y: impulseScalar * manifold.normal.y,
  //   };

  //   // Apply impulse to velocities (which affects next frame's position)
  //   if (!objA.isStatic) {
  //     objA.previousPosition.x -= impulse.x * objA.inverseMass;
  //     objA.previousPosition.y -= impulse.y * objA.inverseMass;
  //   }

  //   if (!objB.isStatic) {
  //     objB.previousPosition.x += impulse.x * objB.inverseMass;
  //     objB.previousPosition.y += impulse.y * objB.inverseMass;
  //   }
  // }

  /**
   * Simplified collision resolution for better performance
   */
  private resolveCollisionSimple(manifold: CollisionManifold): void {
    const objA = manifold.objectA;
    const objB = manifold.objectB;

    // Simple position separation
    const separationX = manifold.normal.x * manifold.penetration * 0.5;
    const separationY = manifold.normal.y * manifold.penetration * 0.5;

    if (!objA.isStatic) {
      objA.position.x -= separationX;
      objA.position.y -= separationY;
    }

    if (!objB.isStatic) {
      objB.position.x += separationX;
      objB.position.y += separationY;
    }

    // Simple velocity reflection
    const relativeVelocity = {
      x: objB.velocity.x - objA.velocity.x,
      y: objB.velocity.y - objA.velocity.y,
    };

    const velocityAlongNormal =
      relativeVelocity.x * manifold.normal.x +
      relativeVelocity.y * manifold.normal.y;

    if (velocityAlongNormal > 0) return; // Objects separating

    const restitution = Math.min(objA.restitution, objB.restitution) * 0.8; // Reduced for stability
    const impulse = velocityAlongNormal * restitution;

    if (!objA.isStatic) {
      objA.previousPosition.x += manifold.normal.x * impulse * 0.5;
      objA.previousPosition.y += manifold.normal.y * impulse * 0.5;
    }

    if (!objB.isStatic) {
      objB.previousPosition.x -= manifold.normal.x * impulse * 0.5;
      objB.previousPosition.y -= manifold.normal.y * impulse * 0.5;
    }
  }

  /**
   * Handle tilting bar collisions with realistic rolling physics
   */
  private handleTiltingBarCollisions(): void {
    if (!this.tiltingBar) return;

    for (const obj of this.objects) {
      if (obj.isStatic) continue;

      // Skip balls that are held (e.g., in saucers)
      if (this.isBallHeld(obj.id)) continue;

      const endpoints = this.tiltingBar.getEndpoints();
      const closestPointOnCenterLine = this.getClosestPointOnLineSegment(
        obj.position,
        endpoints.start,
        endpoints.end,
      );
      const distanceToCenterLine = Math.sqrt(
        (obj.position.x - closestPointOnCenterLine.x) ** 2 +
          (obj.position.y - closestPointOnCenterLine.y) ** 2,
      );

      // Account for bar thickness - collision happens when ball touches the bar surface
      const barThickness = this.tiltingBar.thickness || 12;
      const barSurfaceDistance = barThickness / 2;
      const collisionDistance = obj.radius + barSurfaceDistance;

      if (distanceToCenterLine < collisionDistance) {
        // Calculate bar vectors
        const barVec = {
          x: endpoints.end.x - endpoints.start.x,
          y: endpoints.end.y - endpoints.start.y,
        };
        const barLength = Math.sqrt(barVec.x * barVec.x + barVec.y * barVec.y);
        const barTangent = { x: barVec.x / barLength, y: barVec.y / barLength }; // Along the bar
        const barNormal = { x: -barVec.y / barLength, y: barVec.x / barLength }; // Perpendicular to bar

        // Ensure normal points away from bar (upward)
        if (barNormal.y > 0) {
          barNormal.x = -barNormal.x;
          barNormal.y = -barNormal.y;
        }

        // Calculate the actual collision point on the bar surface
        const barSurfacePoint = {
          x: closestPointOnCenterLine.x + barNormal.x * barSurfaceDistance,
          y: closestPointOnCenterLine.y + barNormal.y * barSurfaceDistance,
        };

        // Position correction - place ball exactly at collision distance from bar surface
        obj.position.x = barSurfacePoint.x + barNormal.x * obj.radius;
        obj.position.y = barSurfacePoint.y + barNormal.y * obj.radius;

        // Current velocity
        const velocity = {
          x: obj.position.x - obj.previousPosition.x,
          y: obj.position.y - obj.previousPosition.y,
        };

        const velocityAlongNormal =
          velocity.x * barNormal.x + velocity.y * barNormal.y;
        const velocityAlongTangent =
          velocity.x * barTangent.x + velocity.y * barTangent.y;

        // Check if ball is moving into the bar (collision) or resting on it
        if (velocityAlongNormal < -0.5) {
          // High-speed collision - reflect velocity
          const restitution = obj.restitution * 0.8; // Reduced bounce on bar
          const friction = this.tiltingBar.friction || 0.3;

          const reflectedVelocity = {
            x: velocity.x - 2 * velocityAlongNormal * barNormal.x,
            y: velocity.y - 2 * velocityAlongNormal * barNormal.y,
          };

          // Apply restitution and friction
          reflectedVelocity.x *= restitution * (1 - friction);
          reflectedVelocity.y *= restitution;

          // Update previous position to reflect new velocity
          obj.previousPosition.x = obj.position.x - reflectedVelocity.x;
          obj.previousPosition.y = obj.position.y - reflectedVelocity.y;

          // Play bounce sound based on collision velocity (with cooldown)
          const collisionVelocity = Math.sqrt(
            velocity.x * velocity.x + velocity.y * velocity.y,
          );
          this.playAudioWithCooldown(collisionVelocity, 'bounce', obj.id);
        } else {
          // Ball is resting on or gently touching the bar - apply rolling physics
          this.applyRollingPhysics(
            obj,
            barTangent,
            barNormal,
            velocityAlongTangent,
            this.deltaTime,
          );
        }
      }
    }
  }

  /**
   * Apply realistic rolling physics when ball is on the tilted bar
   */
  private applyRollingPhysics(
    obj: PhysicsObject,
    barTangent: { x: number; y: number },
    _barNormal: { x: number; y: number },
    currentTangentVelocity: number,
    dt: number,
  ): void {
    // Calculate the component of gravity along the bar slope
    const gravityAlongSlope =
      this.gravity.x * barTangent.x + this.gravity.y * barTangent.y;

    // Rolling resistance and friction
    const rollingFriction = this.tiltingBar?.friction || 0.05;
    const rollingResistance = 0.01; // Small resistance to rolling (reduced for smoother motion)

    // Calculate acceleration along the slope
    let slopeAcceleration = gravityAlongSlope;

    // Apply rolling resistance (opposes motion)
    if (Math.abs(currentTangentVelocity) > 0.5) {
      const resistanceForce =
        -Math.sign(currentTangentVelocity) *
        rollingResistance *
        Math.abs(this.gravity.y);
      slopeAcceleration += resistanceForce;
    }

    // Apply friction if ball is moving along the slope
    if (Math.abs(currentTangentVelocity) > 0.5) {
      const frictionForce =
        -Math.sign(currentTangentVelocity) *
        rollingFriction *
        Math.abs(this.gravity.y);
      slopeAcceleration += frictionForce;
    }

    // Calculate new velocity along the slope
    const newTangentVelocity = currentTangentVelocity + slopeAcceleration * dt;

    // Apply the new velocity (only along the tangent, no normal component)
    const newVelocity = {
      x: newTangentVelocity * barTangent.x,
      y: newTangentVelocity * barTangent.y,
    };

    // Update previous position to reflect rolling motion
    obj.previousPosition.x = obj.position.x - newVelocity.x;
    obj.previousPosition.y = obj.position.y - newVelocity.y;

    // Update velocity for backward compatibility
    obj.velocity.x = newVelocity.x;
    obj.velocity.y = newVelocity.y;

    // Mark that this object is currently rolling on the bar (for debugging/gameplay)
    obj.isRollingOnBar = true;
  }

  /**
   * Check if a ball is currently in contact with the tilting bar
   */
  public isBallOnBar(ballId: string): boolean {
    const ball = this.objects.find(obj => obj.id === ballId);
    if (!ball || !this.tiltingBar) return false;

    const endpoints = this.tiltingBar.getEndpoints();
    const closestPoint = this.getClosestPointOnLineSegment(
      ball.position,
      endpoints.start,
      endpoints.end,
    );
    const distance = Math.sqrt(
      (ball.position.x - closestPoint.x) ** 2 +
        (ball.position.y - closestPoint.y) ** 2,
    );

    const barThickness = this.tiltingBar.thickness || 12;
    const collisionDistance = ball.radius + barThickness / 2;

    return distance <= collisionDistance + 2; // Small tolerance
  }

  /**
   * Handle boundary collisions
   */
  private handleBoundaryCollisions(): void {
    for (const obj of this.objects) {
      if (obj.isStatic) continue;

      // Skip balls that are held (e.g., in saucers)
      if (this.isBallHeld(obj.id)) continue;

      // Floor collision
      if (obj.position.y + obj.radius > this.bounds.height) {
        obj.position.y = this.bounds.height - obj.radius;

        const velocity = {
          x: obj.position.x - obj.previousPosition.x,
          y: obj.position.y - obj.previousPosition.y,
        };

        if (velocity.y > 0) {
          obj.previousPosition.y =
            obj.position.y + velocity.y * obj.restitution;
          obj.previousPosition.x = obj.position.x - velocity.x * 0.8; // Floor friction

          // Removed audio for floor collision - no sound on boundary hits
        }
      }

      // Left wall collision
      if (obj.position.x - obj.radius < 0) {
        obj.position.x = obj.radius;
        const velocity = {
          x: obj.position.x - obj.previousPosition.x,
          y: obj.position.y - obj.previousPosition.y,
        };
        if (velocity.x < 0) {
          obj.previousPosition.x =
            obj.position.x + velocity.x * obj.restitution;

          // Removed audio for wall collision - no sound on boundary hits
        }
      }

      // Right wall collision
      if (obj.position.x + obj.radius > this.bounds.width) {
        obj.position.x = this.bounds.width - obj.radius;
        const velocity = {
          x: obj.position.x - obj.previousPosition.x,
          y: obj.position.y - obj.previousPosition.y,
        };
        if (velocity.x > 0) {
          obj.previousPosition.x =
            obj.position.x + velocity.x * obj.restitution;

          // Removed audio for wall collision - no sound on boundary hits
        }
      }
    }
  }

  /**
   * Check if a ball should be held in place (e.g., in a saucer)
   */
  public isBallHeld(_ballId: string): boolean {
    // This will be called from the Game class to check saucer state
    return false; // Default implementation - Game class will override this
  }

  /**
   * Get the target position for a held ball (e.g., saucer center)
   */
  public getHeldBallTarget(_ballId: string): { x: number; y: number } | null {
    // This will be called from the Game class to get saucer position
    return null; // Default implementation - Game class will override this
  }

  /**
   * Update backward compatibility properties
   */
  private updateBackwardCompatibility(): void {
    for (const obj of this.objects) {
      obj.x = obj.position.x;
      obj.y = obj.position.y;
      obj.vx = obj.velocity.x;
      obj.vy = obj.velocity.y;
    }
  }

  /**
   * Update spatial partitioning grid (optimized)
   */
  private updateSpatialGrid(): void {
    // Skip spatial grid for small number of objects
    if (this.objects.length <= 3) return;

    this.spatialGrid.clear();

    for (const obj of this.objects) {
      const cells = this.getObjectCells(obj);
      for (const cellKey of cells) {
        if (!this.spatialGrid.has(cellKey)) {
          this.spatialGrid.set(cellKey, { objects: [] });
        }
        const cell = this.spatialGrid.get(cellKey);
        if (cell) {
          cell.objects.push(obj);
        }
      }
    }
  }

  /**
   * Get grid cells that an object occupies
   */
  private getObjectCells(obj: PhysicsObject): string[] {
    const cells: string[] = [];
    const radius = obj.radius;
    const minX = Math.floor((obj.position.x - radius) / this.gridSize);
    const maxX = Math.floor((obj.position.x + radius) / this.gridSize);
    const minY = Math.floor((obj.position.y - radius) / this.gridSize);
    const maxY = Math.floor((obj.position.y + radius) / this.gridSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }

  /**
   * Get objects in nearby cells for collision detection
   */
  // private getNearbyObjects(obj: PhysicsObject): PhysicsObject[] {
  //   const nearby: PhysicsObject[] = [];
  //   const cells = this.getObjectCells(obj);

  //   for (const cellKey of cells) {
  //     const cell = this.spatialGrid.get(cellKey);
  //     if (cell) {
  //       for (const otherObj of cell.objects) {
  //         if (otherObj.id !== obj.id && !nearby.includes(otherObj)) {
  //           nearby.push(otherObj);
  //         }
  //       }
  //     }
  //   }
  //   return nearby;
  // }

  /**
   * Get closest point on line segment to a point
   */
  private getClosestPointOnLineSegment(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number },
  ): { x: number; y: number } {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return lineStart;

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          (length * length),
      ),
    );

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };
  }

  // Public API methods
  public getObjects(): PhysicsObject[] {
    return this.objects;
  }

  public setGravity(x: number, y: number): void {
    this.gravity.x = x;
    this.gravity.y = y;
    Debug.log(`Gravity set to: (${x}, ${y})`);
  }

  public setAirResistance(resistance: number): void {
    this.airResistance = Math.max(0, Math.min(1, resistance));
    Debug.log(`Air resistance set to: ${this.airResistance}`);
  }

  public setBounds(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
    Debug.log(`Physics bounds set to: ${width}x${height}`);
  }

  public setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  public getDebug(): boolean {
    return this.debug;
  }

  public getCollisionManifolds(): CollisionManifold[] {
    return this.collisionManifolds;
  }

  public getConstraints(): Constraint[] {
    return this.constraints;
  }

  // Legacy compatibility methods
  public getFriction(): number {
    return 0.98; // Return a default value for compatibility
  }

  public getBounceEnergy(): number {
    return 0.7; // Return a default value for compatibility
  }

  public getGravity(): number {
    return this.gravity.y; // Return Y gravity for compatibility
  }

  public setFriction(_friction: number): void {
    Debug.log(
      'Legacy friction setting ignored - use per-object friction instead',
    );
  }

  public setBounceEnergy(_energy: number): void {
    Debug.log(
      'Legacy bounce energy setting ignored - use per-object restitution instead',
    );
  }
}

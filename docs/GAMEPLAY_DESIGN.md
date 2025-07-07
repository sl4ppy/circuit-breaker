# FILENAME: GAMEPLAY_DESIGN.md

# Circuit Breaker - Gameplay Design

🎮 **[PLAY THE GAME NOW](https://sl4ppy.github.io/circuit-breaker/)** 🎮

## Core Game Loop

### Primary Objective
Guide a glowing data packet from the bottom of a vertical circuit board to an illuminated target port at the top, avoiding all live electrical nodes (holes) along the way.

### Game Flow
1. **Level Start**: Data packet spawns at bottom center of circuit board
2. **Navigation**: Player tilts bar to roll packet left/right and upward
3. **Obstacle Avoidance**: Navigate around electrical nodes and hazards
4. **Target Acquisition**: Reach illuminated port to complete level
5. **Progression**: Unlock next level with increased difficulty
6. **Failure Recovery**: Restart current level if packet falls through nodes

## Win/Lose Conditions

### Victory Conditions
- **Level Complete**: Data packet successfully reaches illuminated target port
- **Progression**: Unlock next level with new target location
- **Achievement**: Complete all levels to "beat the game"

### Failure Conditions
- **Packet Destruction**: Data packet falls through any electrical node (hole)
- **Time Limit**: Optional time pressure on higher difficulty levels
- **Bar Overload**: Excessive tilting causes system failure (advanced mechanic)

### Recovery Mechanics
- **Immediate Restart**: Level resets instantly upon failure
- **No Lives System**: Infinite attempts encourage experimentation
- **Quick Reset**: Single button press to restart current level

## Controls

### Primary Input Methods
- **Keyboard**: Arrow keys or WASD for bar tilting
- **Mouse**: Click and drag for direct bar manipulation
- **Touch**: Swipe gestures for mobile compatibility
- **Gamepad**: Analog stick support for console-style play

### Control Mapping
```
Left Tilt:  A, Left Arrow, or Left Mouse/Touch
Right Tilt: D, Right Arrow, or Right Mouse/Touch
Reset Level: R, Space, or Reset Button
Pause:      Escape or Pause Button
```

### Bar Mechanics
- **Independent Control**: Left and right sides of bar can tilt separately
- **Smooth Movement**: Gradual tilting with momentum and physics
- **Responsive Input**: Immediate response to player commands
- **Visual Feedback**: Bar position clearly visible and intuitive

## Physics Behavior

### Data Packet Physics
- **Gravity**: Constant downward force when not supported
- **Momentum**: Packet maintains velocity when rolling
- **Bounce**: Realistic collision response with bar and walls
- **Friction**: Gradual slowdown on bar surface
- **Air Resistance**: Minimal drag when falling

### Bar Physics
- **Tilt Limits**: Maximum 45-degree angle on each side
- **Smooth Rotation**: Gradual movement with easing
- **Collision Detection**: Precise packet-bar interaction
- **Stability**: Bar returns to level when no input

### Environmental Physics
- **Wall Collisions**: Packet bounces off circuit board boundaries
- **Node Hazards**: Instant destruction when packet enters holes
- **Target Ports**: Magnetic attraction when packet is close
- **Special Zones**: Speed boost areas, teleporters, or barriers

## Level Progression

### Difficulty Curve
1. **Level 1-3**: Basic navigation with few obstacles
2. **Level 4-6**: Introduction of moving hazards
3. **Level 7-10**: Complex pathfinding with multiple targets
4. **Level 11+**: Expert challenges with time pressure

### Level Design Principles
- **Clear Path**: Always provide a viable route to target
- **Progressive Complexity**: Introduce one new element per level
- **Visual Clarity**: Hazards and targets are easily distinguishable
- **Fair Challenge**: Difficulty increases gradually, not suddenly

### Level Elements
- **Static Nodes**: Fixed electrical hazards
- **Animated Nodes**: Dynamic holes that appear/disappear with spring animation
- **Moving Hazards**: Rotating or sliding obstacles
- **Multiple Targets**: Choose between different ports
- **Time Pressure**: Countdown timers for urgency
- **Special Mechanics**: Teleporters, speed zones, barriers

### Dynamic Animated Holes (v1.0.0)
- **Appearance**: Holes spring into view with smooth overshoot animation
- **Timing**: 1-second animation in, 3-10 seconds active, 1-second animation out, 2-5 seconds hidden
- **Positioning**: Only appear in top half of playfield for balanced difficulty
- **Scaling**: 2-3 holes in early levels, increasing with level progression
- **Collision**: Only active for collision when fully visible, creating dynamic obstacle patterns

## Failure Modes

### Common Failure Scenarios
1. **Overcorrection**: Player tilts too aggressively and loses control
2. **Momentum Issues**: Packet gains too much speed and overshoots
3. **Path Planning**: Poor route selection leads to dead ends
4. **Timing Errors**: Misjudging when to change direction
5. **Physics Misunderstanding**: Not accounting for bounce and momentum

### Learning Opportunities
- **Immediate Feedback**: Clear visual and audio cues for failures
- **Tutorial Levels**: Gradual introduction of mechanics
- **Practice Mode**: Sandbox environment for experimentation
- **Hint System**: Optional guidance for stuck players

## Solo-Friendly Implementation Notes

### AI-Assisted Development Strategies

#### Physics Implementation
**Prompt for AI**: "Generate a 2D physics system for a ball rolling on a tilting bar with realistic gravity, momentum, and collision detection. Include bounce physics and friction calculations."

**Key Components**:
- Gravity simulation with configurable strength
- Momentum preservation during movement
- Collision detection between packet and bar
- Bounce calculations with energy loss
- Friction modeling for realistic rolling

#### Input Handling
**Prompt for AI**: "Create an input manager that handles keyboard, mouse, and touch controls for a tilting bar game. Include smooth input processing and multiple control schemes."

**Implementation Notes**:
- Input abstraction layer for multiple devices
- Smooth interpolation for bar movement
- Dead zone handling for analog inputs
- Touch gesture recognition for mobile
- Configurable sensitivity settings

#### Level System
**Prompt for AI**: "Design a level loading system that can parse level data from JSON files. Include level validation, progression tracking, and difficulty scaling."

**Features**:
- JSON-based level definitions
- Dynamic level loading and unloading
- Progress persistence across sessions
- Difficulty adjustment algorithms
- Level validation and error handling

#### Game State Management
**Prompt for AI**: "Implement a game state manager that handles level transitions, win/lose conditions, and player progress. Include pause functionality and save/load features."

**State Machine**:
- Menu state (title, options, level select)
- Playing state (active gameplay)
- Paused state (game paused)
- Win/Lose state (level completion or failure)
- Transition states (loading, animations)

### Development Priorities

#### Phase 1: Core Mechanics (Weeks 1-2)
1. **Basic Physics**: Implement gravity and basic collision
2. **Bar Control**: Create tilting bar with input handling
3. **Packet Movement**: Basic rolling mechanics
4. **Simple Level**: Single target with minimal obstacles

#### Phase 2: Game Loop (Weeks 3-4)
1. **Win/Lose Conditions**: Target detection and failure handling
2. **Level System**: Multiple levels with progression
3. **UI Elements**: Score display, level indicator, reset button
4. **Basic Audio**: Sound effects for actions and events

#### Phase 3: Polish (Weeks 5-6)
1. **Visual Effects**: Neon aesthetics and animations
2. **Audio Enhancement**: Music and improved sound effects
3. **Level Variety**: Different obstacle types and layouts
4. **Performance Optimization**: Smooth 60fps gameplay

### Testing Strategy

#### Automated Testing
- **Physics Validation**: Unit tests for gravity and collision
- **Input Testing**: Verify all control schemes work correctly
- **Level Loading**: Test level parsing and validation
- **Performance Testing**: Frame rate and memory usage

#### Manual Testing
- **Playability Testing**: Regular gameplay sessions
- **Control Feel**: Adjust sensitivity and responsiveness
- **Difficulty Balance**: Ensure fair challenge progression
- **Cross-Platform**: Test on different devices and browsers

### AI Integration Points

#### Code Generation
- Physics calculations and collision detection
- Input handling and control schemes
- Level loading and game state management
- UI components and menu systems

#### Asset Creation
- Level design tools and editors
- Visual effect generation
- Audio asset creation
- UI element design

#### Debugging Assistance
- Physics debugging and visualization
- Performance profiling and optimization
- Error handling and logging
- Cross-platform compatibility issues

---

*This gameplay design prioritizes smooth, satisfying mechanics that feel great to play while maintaining realistic scope for solo development with AI assistance.* 
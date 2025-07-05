# FILENAME: VISUAL_DESIGN.md

# Circuit Breaker - Visual Design

## Art Style & Thematic Goals

### Core Aesthetic: Neon Cyberpunk
**"A digital frontier where every circuit pulses with life and every pixel glows with neon energy"**

### Visual Philosophy
- **High Contrast**: Bright neon colors against dark backgrounds
- **Glowing Elements**: Everything that matters should emit light
- **Clean Geometry**: Sharp, precise shapes with minimal noise
- **Digital Authenticity**: Looks like it belongs in a cyberpunk world
- **Smooth Animation**: Fluid motion that feels responsive and alive

### Color Palette
```
Primary Neon Colors:
- Electric Blue: #00FFFF (cyan) - Data packets, safe zones
- Hot Pink: #FF00FF (magenta) - Hazards, warnings
- Electric Green: #00FF00 (lime) - Success, targets
- Bright Orange: #FF6600 (amber) - Energy, power sources
- Deep Purple: #6600FF (violet) - Background elements, atmosphere

Background Colors:
- Dark Gray: #1A1A1A - Main background
- Charcoal: #2A2A2A - Secondary surfaces
- Deep Black: #000000 - Void spaces
```

## Playfield Layout Mock Descriptions

### Main Circuit Board
**Overall Structure**: Vertical rectangular playfield with a dark, metallic appearance

**Background Elements**:
- **Circuit Traces**: Thin, glowing lines connecting various components
- **Grid Pattern**: Subtle hexagonal or square grid overlay
- **Depth Layers**: Multiple background layers for parallax effect
- **Atmospheric Effects**: Floating particles and energy wisps

**Visual Hierarchy**:
1. **Foreground**: Active gameplay elements (packet, bar, targets)
2. **Midground**: Obstacles and hazards
3. **Background**: Circuit traces and atmospheric elements
4. **Deep Background**: Grid patterns and depth layers

### Data Packet Design
**Appearance**: Spherical or hexagonal glowing orb with data-like patterns

**Visual Features**:
- **Core Glow**: Bright cyan center with pulsing animation
- **Data Streams**: Trailing particles that follow the packet
- **Energy Field**: Subtle aura around the packet
- **Rotation**: Gentle spinning animation
- **Size**: Approximately 20-30 pixels in diameter

**Animation States**:
- **Idle**: Gentle pulsing and rotation
- **Moving**: Increased glow and particle trails
- **Rolling**: Dynamic rotation based on movement direction
- **Falling**: Streak effect with increased particle density
- **Destroyed**: Explosion effect with particle burst

### Tilting Bar Design
**Appearance**: Metallic bar with glowing edges and mechanical details

**Visual Features**:
- **Main Body**: Dark metallic surface with subtle texture
- **Glowing Edges**: Bright cyan outline that intensifies with tilt
- **Mechanical Joints**: Visible pivot points with energy effects
- **Holographic Display**: Small status indicators on bar surface
- **Size**: Spans full width of playfield, 10-15 pixels thick

**Animation States**:
- **Neutral**: Subtle glow with gentle pulsing
- **Tilting**: Edge glow intensifies based on tilt angle
- **Active**: Mechanical parts animate during movement
- **Overload**: Warning effects when tilted too far

### Electrical Nodes (Hazards)
**Appearance**: Circular or hexagonal holes with dangerous energy effects

**Visual Features**:
- **Dark Center**: Deep black void that absorbs light
- **Energy Rim**: Bright pink or red glowing edge
- **Spark Effects**: Random electrical discharges
- **Warning Aura**: Subtle pulsing effect around the hole
- **Size**: 25-40 pixels in diameter

**Animation States**:
- **Idle**: Gentle pulsing with occasional sparks
- **Active**: Increased spark frequency and intensity
- **Warning**: Bright flashing when packet is nearby
- **Destruction**: Energy burst when packet is destroyed

### Target Ports
**Appearance**: Illuminated circular ports with welcoming energy

**Visual Features**:
- **Bright Center**: Intense green or blue glow
- **Concentric Rings**: Multiple glowing rings around the center
- **Magnetic Effect**: Energy field that attracts the packet
- **Success Animation**: Celebration effects when reached
- **Size**: 30-50 pixels in diameter

**Animation States**:
- **Inactive**: Dim glow with slow pulsing
- **Active**: Bright, fast pulsing when packet is nearby
- **Attracting**: Magnetic field effect with particle streams
- **Success**: Explosion of particles and energy when reached

## UI/HUD Elements

### Main HUD Layout
**Positioning**: Clean, minimal interface that doesn't obstruct gameplay

**Elements**:
- **Level Indicator**: Top-left corner with neon styling
- **Score Display**: Top-right corner with digital readout
- **Progress Bar**: Bottom of screen showing level completion
- **Control Hints**: Subtle button prompts when needed
- **Pause Button**: Top-center with minimal design

### Menu System
**Title Screen**:
- **Game Logo**: Glowing "Circuit Breaker" text with neon effects
- **Background**: Animated circuit board with floating elements
- **Menu Options**: Glowing buttons with hover effects
- **Particle Effects**: Ambient energy particles throughout

**Level Select**:
- **Grid Layout**: Organized level grid with completion indicators
- **Level Previews**: Small screenshots or icons for each level
- **Difficulty Indicators**: Color-coded difficulty levels
- **Progress Tracking**: Visual indicators for completed levels

**Pause Menu**:
- **Overlay Effect**: Semi-transparent dark overlay
- **Menu Panel**: Glowing panel with menu options
- **Quick Actions**: Resume, restart, options, quit
- **Minimal Design**: Clean, uncluttered interface

### Visual Feedback Systems

#### Success Feedback
- **Screen Flash**: Brief white flash with green tint
- **Particle Burst**: Explosion of success particles
- **Sound Visualization**: Visual representation of audio
- **Level Transition**: Smooth fade with loading animation

#### Failure Feedback
- **Screen Shake**: Brief camera shake effect
- **Red Flash**: Warning flash with red tint
- **Destruction Effect**: Particle explosion at failure point
- **Reset Animation**: Smooth transition back to start

#### Warning Systems
- **Proximity Warning**: Glow intensifies when packet is near hazards
- **Time Pressure**: Visual countdown with pulsing effects
- **System Overload**: Warning effects when bar is tilted too far

## Animation Goals

### Core Animation Principles
- **Smooth Interpolation**: All movements use easing functions
- **Responsive Feedback**: Immediate visual response to player input
- **Consistent Timing**: Unified animation speed across all elements
- **Performance Focus**: Optimized animations for 60fps

### Key Animation Types

#### Physics-Based Animations
- **Packet Rolling**: Rotation based on movement direction and speed
- **Bar Tilting**: Smooth rotation with momentum and easing
- **Bounce Effects**: Realistic bounce with energy loss
- **Particle Systems**: Dynamic particle behavior based on physics

#### UI Animations
- **Button Hover**: Glow intensification and scale effects
- **Menu Transitions**: Smooth fade and slide effects
- **Loading Screens**: Animated progress indicators
- **Text Effects**: Typing animations and glow effects

#### Environmental Animations
- **Circuit Traces**: Flowing energy along circuit paths
- **Atmospheric Particles**: Floating energy wisps and dust
- **Background Effects**: Subtle parallax and depth movement
- **Lighting Effects**: Dynamic lighting based on game state

## AI Asset Generation Notes

### Sprite Generation Strategies

#### Data Packet Assets
**AI Prompt Examples**:
- "Create a glowing cyan sphere with digital circuit patterns, neon cyberpunk style, 32x32 pixels"
- "Design a hexagonal data packet with pulsing energy core and trailing particles"
- "Generate a futuristic orb with holographic elements and neon glow effects"

**Required Variations**:
- Idle state (gentle pulsing)
- Moving state (increased glow)
- Rolling state (dynamic rotation)
- Destroyed state (explosion effect)

#### Bar and Mechanical Elements
**AI Prompt Examples**:
- "Design a metallic tilting bar with glowing cyan edges, cyberpunk aesthetic"
- "Create mechanical pivot joints with energy effects and holographic displays"
- "Generate futuristic control surfaces with neon accents and digital readouts"

**Required Elements**:
- Main bar body with texture
- Glowing edge effects
- Mechanical joint details
- Status indicator displays

#### Hazard and Target Elements
**AI Prompt Examples**:
- "Create dangerous electrical nodes with dark centers and bright pink energy rims"
- "Design illuminated target ports with concentric glowing rings and magnetic effects"
- "Generate cyberpunk hazard symbols with warning auras and spark effects"

**Required Variations**:
- Different sizes and shapes
- Multiple animation states
- Warning and success effects
- Environmental integration

### Background and Environment Assets

#### Circuit Board Elements
**AI Prompt Examples**:
- "Design a cyberpunk circuit board background with glowing traces and grid patterns"
- "Create futuristic electronic components with neon accents and energy effects"
- "Generate atmospheric background elements with floating particles and energy wisps"

**Required Elements**:
- Circuit trace patterns
- Grid overlays
- Electronic components
- Atmospheric particles

#### UI and Interface Elements
**AI Prompt Examples**:
- "Create neon cyberpunk UI buttons with glowing edges and hover effects"
- "Design digital readouts and status displays with futuristic typography"
- "Generate menu panels and overlays with cyberpunk aesthetic"

**Required Elements**:
- Button designs
- Text displays
- Menu panels
- Icon sets

### Animation and Effect Assets

#### Particle Effects
**AI Prompt Examples**:
- "Create energy particle effects with neon colors and cyberpunk style"
- "Design explosion and destruction effects with particle bursts"
- "Generate magnetic and attraction effects with flowing energy streams"

**Required Effects**:
- Success particles
- Destruction effects
- Magnetic fields
- Energy trails

#### Lighting and Glow Effects
**AI Prompt Examples**:
- "Create neon glow effects with realistic light diffusion"
- "Design energy auras and light fields with cyberpunk aesthetic"
- "Generate dynamic lighting effects that respond to game events"

**Required Effects**:
- Glow overlays
- Light diffusion
- Dynamic shadows
- Energy auras

### Asset Pipeline Integration

#### File Organization
```
assets/
├── sprites/
│   ├── packet/           # Data packet variations
│   ├── bar/              # Tilting bar elements
│   ├── hazards/          # Electrical nodes
│   ├── targets/          # Target ports
│   └── ui/               # Interface elements
├── backgrounds/
│   ├── circuit-boards/   # Main playfield backgrounds
│   ├── components/       # Electronic components
│   └── effects/          # Atmospheric elements
└── animations/
    ├── particles/        # Particle effect sprites
    ├── effects/          # Special effects
    └── ui/               # UI animations
```

#### AI Generation Workflow
1. **Concept Generation**: Use AI to create initial concepts and variations
2. **Style Refinement**: Iterate on AI-generated assets to match game style
3. **Animation Planning**: Plan animation sequences for each asset
4. **Integration Testing**: Test assets in-game for visual consistency
5. **Optimization**: Reduce file sizes and optimize for performance

#### Quality Assurance
- **Style Consistency**: Ensure all assets follow the same visual language
- **Performance Testing**: Verify assets don't impact frame rate
- **Scalability**: Test assets at different resolutions
- **Accessibility**: Ensure sufficient contrast and visibility

---

*This visual design prioritizes a cohesive cyberpunk aesthetic that feels modern and engaging while remaining achievable for solo development with AI assistance.* 
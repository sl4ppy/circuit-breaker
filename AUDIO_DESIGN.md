# FILENAME: AUDIO_DESIGN.md

# Circuit Breaker - Audio Design

## Sound Effect List

### Core Gameplay Sounds

#### Data Packet Sounds
- **Packet Spawn**: Soft electronic "whoosh" with data stream effects
- **Packet Rolling**: Continuous rolling sound with surface texture variation
- **Packet Bounce**: Sharp electronic "ping" with reverb
- **Packet Falling**: Descending tone with doppler effect
- **Packet Destruction**: Explosive electronic burst with particle sounds
- **Packet Success**: Triumphant electronic chime with energy surge

#### Bar Control Sounds
- **Bar Tilt Start**: Mechanical servo sound with energy hum
- **Bar Movement**: Continuous servo whine that varies with tilt speed
- **Bar Return**: Smooth mechanical retraction with settling sound
- **Bar Overload**: Warning buzz with system stress sounds
- **Bar Collision**: Sharp metallic impact with energy discharge

#### Environmental Sounds
- **Electrical Nodes**: Continuous electrical buzzing with random sparks
- **Node Warning**: Intensified buzzing when packet approaches
- **Node Destruction**: Electrical explosion with energy discharge
- **Target Port**: Gentle humming with magnetic attraction sounds
- **Target Success**: Energy surge with celebration chimes
- **Wall Collision**: Sharp electronic "thud" with bounce reverb

### UI and Menu Sounds

#### Navigation Sounds
- **Button Hover**: Soft electronic "blip" with glow effect
- **Button Click**: Sharp electronic "click" with confirmation
- **Menu Open**: Smooth electronic slide with energy build-up
- **Menu Close**: Reverse slide with energy dissipation
- **Selection Change**: Quick electronic "tick" with direction indication

#### System Sounds
- **Level Start**: Dramatic energy build-up with circuit activation
- **Level Complete**: Triumphant fanfare with energy surge
- **Level Fail**: Dramatic failure sound with energy collapse
- **Pause**: Time freeze effect with energy suspension
- **Resume**: Time resume effect with energy restoration

### Feedback Sounds

#### Success Feedback
- **Target Reached**: Multi-layered success chime with energy burst
- **Level Progression**: Ascending electronic arpeggio
- **Achievement Unlock**: Special celebration sound with particle effects
- **Perfect Score**: Extended success fanfare with multiple layers

#### Warning Feedback
- **Proximity Warning**: Pulsing electronic alert with increasing intensity
- **Time Pressure**: Ticking countdown with urgency build-up
- **System Overload**: Stress warning with mechanical strain sounds
- **Danger Zone**: Intense warning buzz with visual sync

## Music Needs

### Main Theme
**Style**: Electronic/cyberpunk with neon energy and digital precision

**Characteristics**:
- **Tempo**: 120-140 BPM for energetic but controlled feel
- **Key**: Minor keys with electronic harmonies
- **Instruments**: Synthesizers, electronic drums, digital effects
- **Mood**: Futuristic, energetic, slightly mysterious

**Structure**:
- **Intro**: Atmospheric build-up with circuit sounds
- **Main Loop**: Driving electronic beat with neon melodies
- **Breakdown**: Ambient section with floating elements
- **Build-up**: Energy increase leading back to main loop

### Level Music Variations

#### Early Levels (1-5)
- **Style**: Lighter, more accessible electronic
- **Tempo**: 110-120 BPM
- **Complexity**: Simple melodies with clear structure
- **Mood**: Optimistic, encouraging, tutorial-friendly

#### Mid Levels (6-15)
- **Style**: More complex electronic with cyberpunk elements
- **Tempo**: 125-135 BPM
- **Complexity**: Layered arrangements with counter-melodies
- **Mood**: Determined, focused, challenging

#### Advanced Levels (16+)
- **Style**: Intense cyberpunk with industrial elements
- **Tempo**: 135-145 BPM
- **Complexity**: Complex rhythms and harmonies
- **Mood**: Intense, urgent, high-stakes

### Dynamic Music System

#### Adaptive Elements
- **Intensity Scaling**: Music intensity increases with level difficulty
- **Success/Failure Response**: Music responds to player performance
- **Proximity Warnings**: Musical tension builds when near hazards
- **Time Pressure**: Urgency increases with time limits

#### Layered Composition
- **Base Layer**: Ambient electronic textures
- **Rhythm Layer**: Electronic drums and percussion
- **Melody Layer**: Lead synthesizer lines
- **Effect Layer**: Atmospheric sounds and transitions

## Feedback Sounds (Success, Failure, Rolling)

### Success Sound Design
**Primary Success Sound**:
- **Frequency**: Bright, high-frequency electronic chime (2-4kHz)
- **Duration**: 0.5-1.0 seconds
- **Envelope**: Quick attack, medium decay, short sustain
- **Effects**: Reverb, delay, and slight pitch bend

**Success Variations**:
- **Minor Success**: Shorter, simpler chime
- **Major Success**: Extended fanfare with multiple layers
- **Perfect Success**: Special achievement sound with particle effects

### Failure Sound Design
**Primary Failure Sound**:
- **Frequency**: Low, ominous electronic drone (200-400Hz)
- **Duration**: 1.0-2.0 seconds
- **Envelope**: Slow attack, long decay, dark character
- **Effects**: Distortion, low-pass filter, reverb

**Failure Variations**:
- **Minor Failure**: Quick warning sound
- **Major Failure**: Extended dramatic failure sequence
- **Catastrophic Failure**: Special sound for rare events

### Rolling Sound Design
**Continuous Rolling Sound**:
- **Base Frequency**: Mid-range rolling texture (500-1000Hz)
- **Variation**: Surface-dependent texture changes
- **Duration**: Continuous while rolling
- **Effects**: Real-time filtering based on speed and surface

**Rolling Variations**:
- **Slow Rolling**: Gentle, low-frequency rumble
- **Fast Rolling**: High-frequency, energetic sound
- **Surface Changes**: Different textures for different materials
- **Momentum Effects**: Sound intensity matches movement speed

## AI Audio Generation Strategies

### Sound Effect Generation

#### AI Prompt Examples for Sound Effects
**Packet Sounds**:
- "Generate an electronic rolling sound for a data packet moving on a metallic surface"
- "Create a futuristic bounce sound with electronic reverb and energy effects"
- "Design a cyberpunk destruction sound with particle explosion effects"

**Bar Control Sounds**:
- "Generate mechanical servo sounds for a tilting bar with energy hum"
- "Create smooth mechanical movement sounds with electronic elements"
- "Design warning sounds for system overload with stress indicators"

**Environmental Sounds**:
- "Generate electrical buzzing sounds for dangerous nodes with spark effects"
- "Create magnetic attraction sounds for target ports with energy fields"
- "Design wall collision sounds with electronic bounce and reverb"

#### Sound Effect Categories
1. **Impact Sounds**: Collisions, bounces, landings
2. **Movement Sounds**: Rolling, sliding, tilting
3. **Environmental Sounds**: Electrical, mechanical, atmospheric
4. **UI Sounds**: Buttons, menus, navigation
5. **Feedback Sounds**: Success, failure, warnings

### Music Generation

#### AI Prompt Examples for Music
**Main Theme**:
- "Create a cyberpunk electronic track with neon energy and digital precision, 120 BPM"
- "Generate futuristic game music with electronic beats and synth melodies"
- "Design atmospheric cyberpunk music with circuit sounds and energy effects"

**Level Variations**:
- "Create upbeat electronic music for early game levels with encouraging melodies"
- "Generate intense cyberpunk music for advanced levels with industrial elements"
- "Design adaptive music that responds to player performance and game events"

#### Music Generation Workflow
1. **Style Definition**: Define cyberpunk electronic style with specific characteristics
2. **Tempo and Key**: Establish consistent musical foundation
3. **Layered Composition**: Create multiple tracks for adaptive mixing
4. **Dynamic Elements**: Implement real-time music adaptation
5. **Integration Testing**: Test music with gameplay for emotional impact

### Audio Asset Organization

#### File Structure
```
assets/audio/
├── sfx/
│   ├── packet/            # Data packet sound effects
│   ├── bar/               # Tilting bar sounds
│   ├── environment/       # Environmental sounds
│   ├── ui/                # User interface sounds
│   └── feedback/          # Success/failure sounds
├── music/
│   ├── main-theme/        # Main game theme
│   ├── level-music/       # Level-specific music
│   ├── menu-music/        # Menu and UI music
│   └── ambient/           # Atmospheric sounds
└── voice/
    ├── tutorial/          # Tutorial voice prompts
    └── feedback/          # Voice feedback (optional)
```

#### Audio Specifications
- **Format**: WAV for quality, MP3 for web deployment
- **Sample Rate**: 44.1kHz for compatibility
- **Bit Depth**: 16-bit for standard quality, 24-bit for high quality
- **Channels**: Stereo for music, mono for most sound effects
- **Compression**: Optimized for web streaming and mobile devices

### AI Integration Workflow

#### Sound Effect Creation
1. **Concept Generation**: Use AI to create initial sound concepts
2. **Style Refinement**: Iterate on AI-generated sounds to match game style
3. **Variation Creation**: Generate multiple variations for different contexts
4. **Integration Testing**: Test sounds in-game for appropriate impact
5. **Optimization**: Reduce file sizes while maintaining quality

#### Music Creation
1. **Style Definition**: Define cyberpunk electronic style with AI assistance
2. **Composition**: Use AI to generate base musical elements
3. **Arrangement**: Organize and structure musical components
4. **Adaptation**: Implement dynamic music system
5. **Polish**: Refine and optimize for emotional impact

### Free Resource Alternatives

#### Sound Effect Libraries
- **Freesound.org**: Community-contributed sound effects
- **OpenGameArt.org**: Free game audio assets
- **Zapsplat**: Free sound effect library with attribution
- **BBC Sound Effects**: High-quality free sound library

#### Music Resources
- **Incompetech**: Kevin MacLeod's royalty-free music
- **OpenGameArt.org**: Free game music tracks
- **Free Music Archive**: Creative Commons licensed music
- **YouTube Audio Library**: Free music for content creators

#### AI Audio Tools
- **Mubert**: AI-generated music for various moods
- **AIVA**: AI music composition tool
- **Amper Music**: AI music generation platform
- **Soundraw**: AI-generated royalty-free music

### Quality Assurance

#### Audio Testing
- **Volume Balance**: Ensure appropriate levels across all sounds
- **Frequency Range**: Check for conflicts and clarity
- **Performance Impact**: Verify audio doesn't affect frame rate
- **Cross-Platform**: Test on different devices and browsers
- **Accessibility**: Provide volume controls and audio options

#### Integration Guidelines
- **Consistent Style**: Maintain cyberpunk aesthetic across all audio
- **Emotional Impact**: Ensure sounds enhance gameplay experience
- **Performance Optimization**: Balance quality with file size
- **User Control**: Provide comprehensive audio settings
- **Documentation**: Maintain clear audio asset documentation

---

*This audio design creates an immersive cyberpunk soundscape that enhances gameplay while remaining achievable for solo development with AI assistance and free resources.* 
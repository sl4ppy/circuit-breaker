# Development Tools

This directory contains development and debugging tools for the Circuit Breaker game. These tools are separate from the main test suite and are used for manual testing, debugging, and development verification.

## Audio Tests (`audio-tests/`)

### `audio_test_page.html`
Interactive web-based audio testing interface with:
- Audio system status checker
- Sound effects testing buttons
- Volume control sliders
- Music playback controls
- Performance testing tools
- Real-time test logging

**Usage**: Open in browser via `http://localhost:3001/dev-tools/audio-tests/audio_test_page.html`

### `audio_test.js`
Console-based audio system test script for:
- AudioManager availability testing
- Sound effects verification
- Volume control testing
- Mute functionality verification
- Audio context resume testing
- Music transition testing
- Performance benchmarking

**Usage**: Run in browser console while game is running

### `AUDIO_TEST.md`
Comprehensive audio testing checklist covering:
- System initialization
- Menu audio
- UI sound effects
- Settings menu controls
- Gameplay audio
- Performance metrics
- Cross-browser compatibility
- Mobile/tablet support
- Error handling
- Audio quality verification

## System Tests (`system-tests/`)

### `save_load_test.js`
Console-based save/load system testing for:
- Save/Load menu functionality
- Storage Manager operations
- Achievement Manager integration
- Game progress tracking
- UI component verification

**Usage**: Run in browser console from main menu

### `stats_test.js`
Console-based statistics system testing for:
- Stats menu accessibility
- Stats manager functionality
- Performance statistics
- Session tracking
- Data export/import
- Event recording

**Usage**: Run in browser console from main menu

### `test_atlas.html`
Visual sprite atlas testing interface for:
- Atlas JSON loading verification
- Image loading verification
- Sprite rendering testing
- Console logging of atlas contents

**Usage**: Open in browser via `http://localhost:3001/dev-tools/system-tests/test_atlas.html`

### `test_tabs.js`
Stats menu tab switching verification for:
- Tab navigation testing
- Keyboard input handling
- Tab state management

**Usage**: Run in browser console with stats menu open

## How to Use

1. **Start the development server**: `npm run dev`
2. **For HTML tools**: Navigate to the appropriate URL
3. **For JS tools**: Open browser console and paste/run the script
4. **Check console output**: All tools provide detailed logging

## Notes

- These tools are for development use only
- They are not part of the production build
- Tools assume the game is running and accessible via `window.game`
- Some tools require specific game states (menus open, etc.) 
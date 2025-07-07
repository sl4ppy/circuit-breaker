# POWERUPS_AND_UPGRADES.md

## Circuit Breaker: Power-Ups and Meta Upgrades (Browser-Based JavaScript)

This document defines **power-ups** and **meta-progression upgrades** for **Circuit Breaker**, designed to run entirely in-browser using **JavaScript**.

**Constraints:**
- Web-based (no install).
- HTML5 Canvas/WebGL.
- Works with frameworks like Phaser, PixiJS, or raw Canvas.

---

## SECTION 1: POWER-UPS

Power-ups are **single-run, limited-use** abilities. They can be:
- **Pre-selected before a run** (player loadout).
- **Picked up dynamically on the level** as collectible items.

---

### 1. Slow-Mo Surge
- **Effect:** Slow-motion effect for 3 seconds.
- **Acquisition:**
  - Pre-selected in loadout.
  - Or picked up as a glowing pickup on the board.
- **Visual Appearance:**
  - Cyan overlay tint on the playfield.
  - Ball leaves longer neon trails.
  - Circuit board animation slows down.
  - Pickup item: Pulsing cyan orb with glitch effects.
- **Implementation Notes:**
  - Time-scale factor in game loop.
  - Canvas overlay layer with opacity.
  - Animate collectible on board.
  - Adjust deltaTime in requestAnimationFrame.

---

### 2. Magnetic Guide
- **Effect:** Gentle attraction toward target port when close.
- **Acquisition:**
  - Can appear as a power-up pickup on higher levels.
- **Visual Appearance:**
  - Target hole pulses with neon glow.
  - Thin electric arcs from target to ball when active.
  - Ball glow intensifies.
  - Pickup item: Magenta spark with animated arcs.
- **Implementation Notes:**
  - Distance threshold in physics loop.
  - Radial gradient pulses.
  - Collectible animation and pickup detection.

---

### 3. Circuit Patch (Shield)
- **Effect:** Prevents one failed drop.
- **Acquisition:**
  - Pre-selected or picked up in-level as rare reward.
- **Visual Appearance:**
  - Neon shield ring around the ball.
  - Shield shatters with sparks when used.
  - HUD shield counter glows.
  - Pickup item: Rotating shield icon with glow.
- **Implementation Notes:**
  - Boolean shield state.
  - Pickup triggers adding shield.
  - Break animation and sound.

---

### 4. Overclock Boost
- **Effect:** Temporarily increases bar movement speed.
- **Acquisition:**
  - Pre-selected loadout or found on level as reward.
- **Visual Appearance:**
  - Bar edges glow with animated gradients.
  - Electric sparks on bar ends.
  - Ball motion blur trail.
  - Pickup item: Glowing orange energy node.
- **Implementation Notes:**
  - Bar speed multiplier.
  - Particle sprites for sparks.
  - Pickup animation.

---

### 5. Scan Reveal
- **Effect:** Shows recommended path for 3 seconds.
- **Acquisition:**
  - Earned by perfect streak or found as rare pickup.
- **Visual Appearance:**
  - Ghosted neon lines on playfield.
  - Target hole animates circuit glyphs.
  - Sweeping scan bar with opacity.
  - Pickup item: Holographic map icon with glow cycle.
- **Implementation Notes:**
  - Pre-calculate path.
  - Draw with Canvas strokes.
  - Pickup animation with sound cue.

---

## SECTION 2: META-PROGRESSION UPGRADES

Persistent unlocks saved in **localStorage** or **IndexedDB**.

---

### 1. Extra Slow-Mo Charge
- **Effect:** +1 Slow-Mo use per run.
- **Visual Appearance:**
  - Extra charge slot in UI.
  - Neon highlight border.
- **Implementation Notes:**
  - Track maxCharges in localStorage.
  - Update HUD accordingly.

---

### 2. Quick Lift Motors
- **Effect:** Slightly faster bar movement.
- **Visual Appearance:**
  - Animated neon outlines on the bar.
  - Subtle servo sounds.
- **Implementation Notes:**
  - Increase movement delta.
  - Play sound with HTML5 Audio API.

---

### 3. Friction Coating
- **Effect:** Slightly reduces ball rolling speed.
- **Visual Appearance:**
  - Subtle grid overlay on ball.
  - Fewer sparks when rolling.
- **Implementation Notes:**
  - Adjust friction coefficient.
  - Overlay pattern with alpha.

---

### 4. Circuit Patch+
- **Effect:** Start with 2 shields.
- **Visual Appearance:**
  - Double-layered neon shield rings.
  - HUD icon shows stack.
- **Implementation Notes:**
  - Start with shieldCount=2.
  - Draw extra shield layer.

---

### 5. Neon Board Themes
- **Effect:** Unlock alternative visual themes.
- **Visual Appearance:**
  - New neon color schemes.
  - Animated circuit backgrounds.
- **Implementation Notes:**
  - Store theme in localStorage.
  - Swap backgrounds dynamically.

---

## SECTION 3: UNLOCKABLE BALL TYPES

Cosmetic + functional variations unlocked over time.

---

### 1. Heavy Ball
- **Effect:** Slower roll, less bounce.
- **Visual Appearance:**
  - Metallic texture.
  - Slow orange glow pulse.
- **Implementation Notes:**
  - Increase mass variable.
  - Radial gradient overlay.

---

### 2. Light Ball
- **Effect:** Faster, lower friction.
- **Visual Appearance:**
  - Bright shifting neon colors.
  - Rainbow trail effect.
- **Implementation Notes:**
  - Lower mass and friction.
  - Animate hue shift on trail.

---

### 3. Neon Split Ball
- **Effect:** Splits into two after level 5.
- **Visual Appearance:**
  - Crackling electric effect.
  - Two balls with synchronized pulses.
- **Implementation Notes:**
  - Instantiate two ball objects.
  - Sync bar control input.
  - Check both for success.

---

## SECTION 4: OPTIONAL IMPLEMENTATION STRATEGY

**Browser/JavaScript-friendly design:**
- Use Phaser, PixiJS, or Canvas API.
- Store upgrade data in JSON files.
- Save progression in localStorage.
- Animate with:
  - Canvas gradients.
  - Sprite sheets.
  - requestAnimationFrame.

**Sample AI prompts in Cursor:**
- "Write Phaser 3 code for Slow-Mo Surge with timeScale."
- "Draw neon glow with Canvas 2D context."
- "Save and load upgrade data from localStorage."
- "Animate sprite sheet for shield break effect."

---

## SECTION 5: NOTES FOR SOLO DEV USING AI IN CURSOR

- Plan features in markdown specs like this.
- Use AI to:
  - Write modular JS classes.
  - Design Canvas drawing functions.
  - Create pickup and collection logic.
  - Create upgrade management with localStorage.
  - Debug and optimize code.
- Iteratively test in-browser.
- Modular design for easy addition of new power-ups and collectibles later.

---

*END OF FILE*

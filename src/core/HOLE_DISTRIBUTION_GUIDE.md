# HOLE_DISTRIBUTION_GUIDE.md

## Purpose

This document describes **how to distribute a given number of holes vertically on a playfield** so that **hole density *increases* with height (y)**.

✅ **More holes per unit distance near the top (y=H).**  
✅ **Fewer holes per unit distance near the bottom (y=0).**  
✅ Intended for designs where the top is the most challenging and visually dense area.

---

## Overview

**Goal:**  
- Place N holes along a vertical axis of height H.  
- Holes should be **sparser near the bottom**.  
- Holes should be **more tightly packed near the top**.  
- Density *increases* as y increases.

---

## Design Principle

We achieve this with a **nonlinear mapping** that spaces holes further apart near the bottom and compresses them near the top.

This is done by **inverting** the typical spread formula:

y_i = H * (1 - ((N - i + 1) / N)^k )


- For **k > 1**, spacing *compresses* near the top.
- Larger k = stronger density increase toward top.

---

## Recommended Formula

**Formula for hole i (1-based):**
y_i = H * (1 - ((N - i + 1) / N)^k)

- **H** = Total vertical height of the playfield.  
- **N** = Total number of holes.  
- **i** = Hole index (1 = bottom, N = top).  
- **k** = Density exponent (>1).

---

## Explanation of k

- **k = 1** ➜ Uniform linear spacing (no density variation).  
- **k > 1** ➜ Exponential compression toward top:
  - Large gaps at bottom.
  - Small gaps at top.

**Recommended k Values:**
- k = 1.5 ➜ Gentle density increase near top.
- k = 2 ➜ Quadratic compression.
- k = 3 ➜ Strong density concentration near top.

---

## Example with k = 2

For N = 10 holes, H = 100 units:

| i | Calculation                                 | y_i Value   |
|---|---------------------------------------------|-------------|
| 1 | 100 * (1 - (10/10)^2)                       | 0           |
| 2 | 100 * (1 - (9/10)^2)                        | 19          |
| 3 | 100 * (1 - (8/10)^2)                        | 36          |
| 4 | 100 * (1 - (7/10)^2)                        | 51          |
| 5 | 100 * (1 - (6/10)^2)                        | 64          |
| 6 | 100 * (1 - (5/10)^2)                        | 75          |
| 7 | 100 * (1 - (4/10)^2)                        | 84          |
| 8 | 100 * (1 - (3/10)^2)                        | 91          |
| 9 | 100 * (1 - (2/10)^2)                        | 96          |
| 10| 100 * (1 - (1/10)^2)                        | 99          |

- Notice **large jumps at bottom**, **tiny jumps at top**.

---

## Advantages

- Simple, tunable formula.
- Guarantees **higher hole density near the top**.
- Designer-friendly control with **k**.

---

## Suggested Pseudocode

**Loop-Based Approach:**
for i = 1 to N:
y_i = H * (1 - ((N - i + 1) / N)^k)
place hole at (x, y_i)

- x-position can be staggered or randomly chosen.

---

## Example JavaScript Function

```javascript
function generateHolePositions(N, H, k) {
  const positions = [];
  for (let i = 1; i <= N; i++) {
    const ratio = (N - i + 1) / N;
    const y = H * (1 - Math.pow(ratio, k));
    positions.push(y);
  }
  return positions;
}

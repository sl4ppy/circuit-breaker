# SCORING_SYSTEM.md

## Circuit Breaker - Unified Score System Design

This document defines a **single, clear scoring system** for **Circuit Breaker** that:

✅ Combines **levels completed** and **time** into **one numeric score**.  
✅ Updates **every level** so the player always sees their score grow.  
✅ Guarantees players with **more levels in less time** will have **higher scores**.  
✅ Produces a **single sortable leaderboard** with no multiple vectors or confusing ranking criteria.

---

## 1. Design Goals

- **One score number**: no separate "levels" and "time" columns.
- Encourages **fast, skilled, continuous progression**.
- Penalizes slowness and failure naturally.
- Simple for players to understand: *higher score = better*.

---

## 2. Core Scoring Formula

Each time the player completes a level, they earn **Level Points** based on:

Level Points = BaseLevelValue / LevelTime


Where:

- **BaseLevelValue** grows with level number to reward progression.  
- **LevelTime** is the player's time to complete that level (in seconds).  

**Intuition:**  
- Faster times = higher points for that level.  
- Higher levels = higher BaseLevelValue = more points even if times increase.

---

## 3. Example BaseLevelValue Curve

| Level | BaseLevelValue |
|-------|-----------------|
| 1     | 100,000         |
| 2     | 120,000         |
| 3     | 140,000         |
| 4     | 160,000         |
| 5     | 180,000         |
| ...   | +20,000 per level |

**Rationale:**
- Rewards surviving to higher levels even if they take longer.  
- Keeps difficulty scaling fair.  

---

## 4. Total Score Calculation

Player’s **Total Score** is the **sum of all Level Points** earned:

Total Score = Σ (BaseLevelValue / LevelTime)


---

## 5. Example Calculation

| Level | BaseLevelValue | Player Time (s) | Level Points          |
|-------|-----------------|-----------------|-----------------------|
| 1     | 100,000         | 10.0            | 10,000.0              |
| 2     | 120,000         | 8.5             | 14,117.6              |
| 3     | 140,000         | 12.0            | 11,666.7              |
| 4     | 160,000         | 9.2             | 17,391.3              |
| 5     | 180,000         | 15.0            | 12,000.0              |
| **Total Score** | | | **65,175.6**   |

*Note:* Slower times reduce per-level points even as BaseValue increases.

---

## 6. Power-Up Integration

Power-ups can affect **LevelTime**:

- **Time Cut Node:** Reduces current LevelTime immediately when picked up.
- **Assist Power-Ups (e.g., Slow-Mo):** Add a small time penalty (balancing trade-off).

**Example:**
AdjustedLevelTime = RawTime - TimeReductions + AssistPenalties


*Used in the formula for Level Points.*

---

## 7. Guarantees for Leaderboards

✅ Players who clear *more levels* always have more BaseLevelValue summed up.  
✅ Faster players get *higher score per level* even at the same level.  
✅ A player with fewer levels *cannot* beat someone with more levels unless they were **much faster** on average.  

---

## 8. Leaderboard Display

- Player Name
- **Total Score** (primary sort, higher is better)

**Optional Extras for Info:**
- Levels Completed
- Total Time
- Power-Ups Used

But **Total Score** is *the only sorting metric*.

---

## 9. UI Suggestions

- During Game:
  - Show **Current Level Timer**
  - Show **Score so far**
  - Show **Level Points earned on level complete**
- After Run:
  - Breakdown of each level’s points
  - Final **Total Score**
- Leaderboard:
  - Player Name
  - Total Score

---

## 10. Balancing Notes

- **BaseLevelValue Curve** can be tuned to ensure higher levels always meaningfully reward progression even with longer times.
- Power-Up costs/bonuses should be balanced so they're strategic choices, not trivial auto-wins.

---

## 11. Example Scoring Session

| Level | BaseValue | Time (s) | Adjusted Time | Level Points      | Notes                                  |
|-------|-----------|----------|----------------|-------------------|----------------------------------------|
| 1     | 100       | 12       | 11 (-1 cut)    | ~9.1              | Used Time Cut Node (-1s)               |
| 2     | 120       | 14       | 16 (+2 penalty)| 7.5                | Used Slow-Mo (+2s penalty)             |
| 3     | 140       | 15       | 15             | ~9.3              | Clean run                              |
| 4     | 160       | 20       | 18 (-2 cuts)   | ~8.9              | Used 2x Time Cut Nodes (-2s)           |
| 5     | 180       | 22       | 24 (+2 penalty)| 7.5                | Used Magnetic Guide (+2s penalty)      |

**Total Score after 5 levels ≈ 42.3**

---

## 12. Implementation Notes (JavaScript)

- Track per-level times with `performance.now()`.
- Store BaseLevelValue table in JSON or as constants.
- On level complete:
  - Calculate AdjustedTime.
  - Compute LevelPoints.
  - Add to TotalScore.
- Display running TotalScore live in HUD.
- Save high scores in `localStorage` or to backend.

---

*END OF FILE*

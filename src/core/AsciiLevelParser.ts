import yaml from 'js-yaml';

export type HoleType = 'standard' | 'moving' | 'goal' | 'animated' | 'powerup';

export interface AsciiLevelMeta {
  id: number;
  name: string;
  description?: string;
  cellWidth: number;
  cellHeight: number;
  offsetX: number;
  offsetY: number;
  grid: string;
}

export interface ParsedHole {
  x: number;
  y: number;
  type: HoleType;
  // For moving holes, define the movement path
  movementAxis?: 'x' | 'y';
  movementBounds?: { min: number; max: number };
}

export function parseAsciiLevel(yamlText: string): { meta: AsciiLevelMeta, holes: ParsedHole[] } {
  const meta = yaml.load(yamlText) as AsciiLevelMeta;
  const holes: ParsedHole[] = [];
  const lines = meta.grid.trim().split('\n');
  
  // Track which cells have been processed to avoid double-counting
  const processed = new Set<string>();
  
  // First pass: handle non-moving holes
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === 'M') continue; // Skip M's for now, handle them in second pass
      
      let type: HoleType | undefined;
      if (ch === 'O') type = 'standard';
      else if (ch === 'G') type = 'goal';
      else if (ch === 'A') type = 'animated';
      else if (ch === 'P') type = 'powerup';
      
      if (type) {
        holes.push({
          x: meta.offsetX + col * meta.cellWidth,
          y: meta.offsetY + row * meta.cellHeight,
          type,
        });
      }
    }
  }
  
  // Second pass: handle moving holes by grouping consecutive M's
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const cellKey = `${row},${col}`;
      if (processed.has(cellKey)) continue;
      
      const ch = line[col];
      if (ch !== 'M') continue;
      
      // Check if this M is part of a horizontal sequence
      const horizontalBounds = findHorizontalMBounds(lines, row, col, processed, meta);
      if (horizontalBounds) {
        const centerX = (horizontalBounds.min + horizontalBounds.max) / 2;
        holes.push({
          x: centerX,
          y: meta.offsetY + row * meta.cellHeight,
          type: 'moving',
          movementAxis: 'x',
          movementBounds: horizontalBounds,
        });
        continue;
      }
      
      // Check if this M is part of a vertical sequence
      const verticalBounds = findVerticalMBounds(lines, row, col, processed, meta);
      if (verticalBounds) {
        const centerY = (verticalBounds.min + verticalBounds.max) / 2;
        holes.push({
          x: meta.offsetX + col * meta.cellWidth,
          y: centerY,
          type: 'moving',
          movementAxis: 'y',
          movementBounds: verticalBounds,
        });
        continue;
      }
      
      // Single M (not part of a sequence) - treat as static hole
      holes.push({
        x: meta.offsetX + col * meta.cellWidth,
        y: meta.offsetY + row * meta.cellHeight,
        type: 'moving',
      });
      processed.add(cellKey);
    }
  }
  
  return { meta, holes };
}

function findHorizontalMBounds(lines: string[], row: number, col: number, processed: Set<string>, meta: AsciiLevelMeta): { min: number; max: number } | null {
  const line = lines[row];
  if (!line || line[col] !== 'M') return null;
  
  // Find the start of the horizontal sequence
  let startCol = col;
  while (startCol > 0 && line[startCol - 1] === 'M') {
    startCol--;
  }
  
  // Find the end of the horizontal sequence
  let endCol = col;
  while (endCol < line.length - 1 && line[endCol + 1] === 'M') {
    endCol++;
  }
  
  // If it's just a single M, not a sequence
  if (startCol === endCol) return null;
  
  // Mark all cells in this sequence as processed
  for (let c = startCol; c <= endCol; c++) {
    processed.add(`${row},${c}`);
  }
  
  // Calculate bounds in world coordinates
  const min = meta.offsetX + startCol * meta.cellWidth;
  const max = meta.offsetX + endCol * meta.cellWidth;
  
  return { min, max };
}

function findVerticalMBounds(lines: string[], row: number, col: number, processed: Set<string>, meta: AsciiLevelMeta): { min: number; max: number } | null {
  if (row < 0 || row >= lines.length || lines[row][col] !== 'M') return null;
  
  // Find the start of the vertical sequence
  let startRow = row;
  while (startRow > 0 && lines[startRow - 1] && lines[startRow - 1][col] === 'M') {
    startRow--;
  }
  
  // Find the end of the vertical sequence
  let endRow = row;
  while (endRow < lines.length - 1 && lines[endRow + 1] && lines[endRow + 1][col] === 'M') {
    endRow++;
  }
  
  // If it's just a single M, not a sequence
  if (startRow === endRow) return null;
  
  // Mark all cells in this sequence as processed
  for (let r = startRow; r <= endRow; r++) {
    processed.add(`${r},${col}`);
  }
  
  // Calculate bounds in world coordinates
  const min = meta.offsetY + startRow * meta.cellHeight;
  const max = meta.offsetY + endRow * meta.cellHeight;
  
  return { min, max };
} 
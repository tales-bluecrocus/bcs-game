import type { PieceLetter } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function colLetter(col: number): string {
  return LETTERS[col] ?? '?';
}

/** Piece ids are 1-based numbers as strings: "1", "2", … */
export function pieceLetter(index: number): PieceLetter {
  return String(index + 1);
}

export function slotLabel(row: number, col: number): string {
  return `${colLetter(col)}${row + 1}`;
}

export function parseSlotLabel(label: string, gridSize: number): { row: number; col: number } | null {
  const m = /^([A-Z])(\d+)$/i.exec(label.trim());
  if (!m) return null;
  const col = LETTERS.indexOf(m[1].toUpperCase());
  const row = Number(m[2]) - 1;
  if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) return null;
  return { row, col };
}

export function allPieceLetters(gridSize: number): PieceLetter[] {
  const n = gridSize * gridSize;
  return Array.from({ length: n }, (_, i) => pieceLetter(i));
}

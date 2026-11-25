export type PieceLetter = string; // '1' | '2' | ...

export type GridSize = 3 | 4 | 5;

export interface PieceDef {
  letter: PieceLetter;
  correctRow: number;
  correctCol: number;
  imageUrl: string;
}

export interface TeamMeta {
  id: number;
  captain: string;
  members: string[];
  color: string;
}

export interface TeamBoard {
  /** slots[row][col] = piece letter or null */
  slots: (PieceLetter | null)[][];
  /** pieces not on the board */
  tray: PieceLetter[];
  complete: boolean;
}

export type PuzzlePhase = 'setup' | 'play' | 'done';

export interface PuzzleState {
  phase: PuzzlePhase;
  gridSize: GridSize;
  imageDataUrl: string | null;
  pieces: Record<PieceLetter, PieceDef>;
  teams: TeamMeta[];
  boards: Record<number, TeamBoard>;
  activeTeamId: number;
  selected: PieceLetter | null;
  startedAt: number | null;
}

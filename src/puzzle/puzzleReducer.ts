import { allPieceLetters } from './coords';
import { shuffleWithSeed, teamSeed } from './scramble';
import type {
  GridSize,
  PieceDef,
  PieceLetter,
  PuzzleState,
  TeamBoard,
  TeamMeta,
} from './types';

export const initialPuzzleState: PuzzleState = {
  phase: 'setup',
  gridSize: 4,
  imageDataUrl: null,
  pieces: {},
  teams: [],
  boards: {},
  activeTeamId: 0,
  selected: null,
  startedAt: null,
};

function emptySlots(n: number): (PieceLetter | null)[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}

function isComplete(
  slots: (PieceLetter | null)[][],
  pieces: Record<PieceLetter, PieceDef>,
): boolean {
  for (let row = 0; row < slots.length; row++) {
    for (let col = 0; col < slots[row].length; col++) {
      const letter = slots[row][col];
      if (!letter) return false;
      const p = pieces[letter];
      if (!p || p.correctRow !== row || p.correctCol !== col) return false;
    }
  }
  return true;
}

function findPieceLocation(
  board: TeamBoard,
  letter: PieceLetter,
): { kind: 'tray' } | { kind: 'slot'; row: number; col: number } | null {
  if (board.tray.includes(letter)) return { kind: 'tray' };
  for (let row = 0; row < board.slots.length; row++) {
    for (let col = 0; col < board.slots[row].length; col++) {
      if (board.slots[row][col] === letter) return { kind: 'slot', row, col };
    }
  }
  return null;
}

function buildBoard(
  gridSize: number,
  letters: PieceLetter[],
  seed: number,
): TeamBoard {
  const tray = shuffleWithSeed(letters, seed);
  return {
    slots: emptySlots(gridSize),
    tray,
    complete: false,
  };
}

export type PuzzleAction =
  | {
      type: 'START';
      imageDataUrl: string;
      gridSize: GridSize;
      pieces: Record<PieceLetter, PieceDef>;
      teams: TeamMeta[];
      startedAt: number;
    }
  | { type: 'SELECT_TEAM'; teamId: number }
  | { type: 'PICK_PIECE'; letter: PieceLetter }
  | { type: 'PLACE'; row: number; col: number }
  | { type: 'RESET_BOARD' }
  | { type: 'END' }
  | { type: 'RESTART' }
  | { type: 'HYDRATE'; state: PuzzleState };

export function puzzleReducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'START': {
      const letters = allPieceLetters(action.gridSize);
      const boards: Record<number, TeamBoard> = {};
      for (const team of action.teams) {
        boards[team.id] = buildBoard(
          action.gridSize,
          letters,
          teamSeed(team.id, action.startedAt),
        );
      }
      return {
        phase: 'play',
        gridSize: action.gridSize,
        imageDataUrl: action.imageDataUrl,
        pieces: action.pieces,
        teams: action.teams,
        boards,
        activeTeamId: action.teams[0]?.id ?? 0,
        selected: null,
        startedAt: action.startedAt,
      };
    }

    case 'SELECT_TEAM':
      return { ...state, activeTeamId: action.teamId, selected: null };

    case 'PICK_PIECE': {
      if (state.phase !== 'play') return state;
      const board = state.boards[state.activeTeamId];
      if (!board || board.complete) return state;
      if (state.selected === action.letter) {
        return { ...state, selected: null };
      }
      return { ...state, selected: action.letter };
    }

    case 'PLACE': {
      if (state.phase !== 'play' || !state.selected) return state;
      const board = state.boards[state.activeTeamId];
      if (!board || board.complete) return state;

      const letter = state.selected;
      const loc = findPieceLocation(board, letter);
      if (!loc) return state;

      const slots = board.slots.map((r) => [...r]);
      let tray = [...board.tray];
      const target = slots[action.row][action.col];

      // remove selected from current place
      if (loc.kind === 'tray') {
        tray = tray.filter((l) => l !== letter);
      } else {
        slots[loc.row][loc.col] = null;
      }

      if (target === null) {
        slots[action.row][action.col] = letter;
      } else if (target === letter) {
        // same slot — put back
        slots[action.row][action.col] = letter;
      } else {
        // swap: target goes where selected was
        slots[action.row][action.col] = letter;
        if (loc.kind === 'tray') {
          tray.push(target);
        } else {
          slots[loc.row][loc.col] = target;
        }
      }

      const complete = isComplete(slots, state.pieces);
      const nextBoard: TeamBoard = { slots, tray, complete };
      const boards = { ...state.boards, [state.activeTeamId]: nextBoard };
      const allDone = state.teams.every((t) => boards[t.id]?.complete);

      return {
        ...state,
        boards,
        selected: null,
        phase: allDone ? 'done' : 'play',
      };
    }

    case 'RESET_BOARD': {
      if (!state.startedAt) return state;
      const letters = allPieceLetters(state.gridSize);
      const board = buildBoard(
        state.gridSize,
        letters,
        teamSeed(state.activeTeamId, state.startedAt) + Date.now(),
      );
      return {
        ...state,
        boards: { ...state.boards, [state.activeTeamId]: board },
        selected: null,
        phase: 'play',
      };
    }

    case 'END':
      return { ...state, phase: 'done', selected: null };

    case 'RESTART':
      return { ...initialPuzzleState };

    default:
      return state;
  }
}

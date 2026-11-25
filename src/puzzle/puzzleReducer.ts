import { allPieceLetters } from './coords';
import { shuffleWithSeed, teamSeed } from './scramble';
import type {
  GridSize,
  PieceDef,
  PieceLetter,
  PieceMark,
  PieceRotation,
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

const ROTATIONS: PieceRotation[] = [0, 90, 180, 270];

function emptySlots(n: number): (PieceLetter | null)[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}

function nextRotation(r: PieceRotation): PieceRotation {
  return ROTATIONS[(ROTATIONS.indexOf(r) + 1) % 4];
}

function isPieceCorrect(
  letter: PieceLetter,
  row: number,
  col: number,
  rotation: PieceRotation,
  pieces: Record<PieceLetter, PieceDef>,
): boolean {
  const p = pieces[letter];
  return !!p && p.correctRow === row && p.correctCol === col && rotation === 0;
}

function isComplete(
  board: TeamBoard,
  pieces: Record<PieceLetter, PieceDef>,
): boolean {
  for (let row = 0; row < board.slots.length; row++) {
    for (let col = 0; col < board.slots[row].length; col++) {
      const letter = board.slots[row][col];
      if (!letter) return false;
      if (!isPieceCorrect(letter, row, col, board.rotations[letter] ?? 0, pieces)) {
        return false;
      }
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
  const rotSeed = shuffleWithSeed(letters, seed ^ 0x9e3779b9);
  const rotations: Record<PieceLetter, PieceRotation> = {};
  rotSeed.forEach((letter, i) => {
    rotations[letter] = ROTATIONS[i % 4];
  });
  return {
    slots: emptySlots(gridSize),
    tray,
    rotations,
    marks: {},
    complete: false,
  };
}

function clearMark(
  marks: Record<PieceLetter, PieceMark>,
  letter: PieceLetter,
): Record<PieceLetter, PieceMark> {
  if (!(letter in marks)) return marks;
  const next = { ...marks };
  delete next[letter];
  return next;
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
  | { type: 'ROTATE' }
  | { type: 'CHECK' }
  | { type: 'RESET_BOARD' }
  | { type: 'END' }
  | { type: 'RESTART' }
  | { type: 'HYDRATE'; state: PuzzleState };

export function puzzleReducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  switch (action.type) {
    case 'HYDRATE': {
      // migrate old saves without rotations/marks
      const boards: Record<number, TeamBoard> = {};
      for (const [id, b] of Object.entries(action.state.boards ?? {})) {
        boards[Number(id)] = {
          ...b,
          rotations: b.rotations ?? {},
          marks: b.marks ?? {},
        };
      }
      return { ...action.state, boards };
    }

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

    case 'ROTATE': {
      if (state.phase !== 'play' || !state.selected) return state;
      const board = state.boards[state.activeTeamId];
      if (!board || board.complete) return state;
      const letter = state.selected;
      const cur = board.rotations[letter] ?? 0;
      const rotations = { ...board.rotations, [letter]: nextRotation(cur) };
      const marks = clearMark(board.marks, letter);
      const nextBoard: TeamBoard = { ...board, rotations, marks };
      const complete = isComplete(nextBoard, state.pieces);
      nextBoard.complete = complete;
      const boards = { ...state.boards, [state.activeTeamId]: nextBoard };
      const allDone = state.teams.every((t) => boards[t.id]?.complete);
      return {
        ...state,
        boards,
        phase: allDone ? 'done' : 'play',
      };
    }

    case 'CHECK': {
      if (state.phase !== 'play' || !state.selected) return state;
      const board = state.boards[state.activeTeamId];
      if (!board || board.complete) return state;
      const letter = state.selected;
      const loc = findPieceLocation(board, letter);
      if (!loc || loc.kind !== 'slot') return state;
      const ok = isPieceCorrect(
        letter,
        loc.row,
        loc.col,
        board.rotations[letter] ?? 0,
        state.pieces,
      );
      return {
        ...state,
        boards: {
          ...state.boards,
          [state.activeTeamId]: {
            ...board,
            marks: { ...board.marks, [letter]: ok ? 'ok' : 'bad' },
          },
        },
      };
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
      let marks = { ...board.marks };
      const target = slots[action.row][action.col];

      if (loc.kind === 'tray') {
        tray = tray.filter((l) => l !== letter);
      } else {
        slots[loc.row][loc.col] = null;
      }
      marks = clearMark(marks, letter);

      if (target === null) {
        slots[action.row][action.col] = letter;
      } else if (target === letter) {
        slots[action.row][action.col] = letter;
      } else {
        slots[action.row][action.col] = letter;
        marks = clearMark(marks, target);
        if (loc.kind === 'tray') {
          tray.push(target);
        } else {
          slots[loc.row][loc.col] = target;
        }
      }

      const nextBoard: TeamBoard = {
        slots,
        tray,
        rotations: board.rotations,
        marks,
        complete: false,
      };
      nextBoard.complete = isComplete(nextBoard, state.pieces);
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

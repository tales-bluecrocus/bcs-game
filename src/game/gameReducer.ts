import type { Answer, GameSegment, Phase, Question, Team } from './types';
import { SLOTS, SKIPS, BONUS_ROUND_BALLS, FINAL_ROUND_SLOT_MULT, isFinalRound } from './config';
import { QUESTIONS } from '../data/questions';

export interface GameState {
  teams: Team[];
  rounds: number;
  segment: GameSegment;
  currentRound: number; // 0 = bonus-green; 1..N regular
  turnIndex: number; // index into teams within the current round
  phase: Phase;
  chute: number | null;
  qOrder: number[];
  hardQOrder: number[];
  usedQuestionIds: number[];
  ballsPerTurn: number;
  ballIndex: number; // balls already landed this turn
  turnDeltaTotal: number;
  question: Question | null;
  selected: number | null;
  revealed: boolean;
  answered: Answer | null;
  lastDelta: number | null;
  lastSlot: number | null;
}

export type Action =
  | { type: 'START_GAME'; teams: Team[]; rounds: number }
  | { type: 'PICK_CHUTE'; chute: number }
  | { type: 'SELECT'; index: number }
  | { type: 'REVIEW' }
  | { type: 'SKIP' }
  | { type: 'DROP' }
  | { type: 'LAND'; slot: number }
  | { type: 'NEXT' }
  | { type: 'SET_ROUNDS'; rounds: number }
  | { type: 'END' };

export const initialState: GameState = {
  teams: [],
  rounds: 1,
  segment: 'bonus-green',
  currentRound: 0,
  turnIndex: 0,
  phase: 'pick',
  chute: null,
  qOrder: [],
  hardQOrder: [],
  usedQuestionIds: [],
  ballsPerTurn: 1,
  ballIndex: 0,
  turnDeltaTotal: 0,
  question: null,
  selected: null,
  revealed: false,
  answered: null,
  lastDelta: null,
  lastSlot: null,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawQuestion(
  hard: boolean,
  normalOrder: number[],
  hardOrder: number[],
  usedQuestionIds: number[],
): { question: Question; usedQuestionIds: number[] } | null {
  const used = new Set(usedQuestionIds);
  const order = hard ? hardOrder : normalOrder;
  let idx = order.find((i) => !used.has(i)) ?? null;
  if (idx === null) {
    const fallback = QUESTIONS.findIndex((q, i) => !used.has(i) && !!q.hard === hard);
    if (fallback < 0) return null;
    idx = fallback;
  }
  return {
    question: QUESTIONS[idx],
    usedQuestionIds: [...usedQuestionIds, idx],
  };
}

function buildOrders() {
  const normal = QUESTIONS.map((_, i) => i).filter((i) => !QUESTIONS[i].hard);
  const hard = QUESTIONS.map((_, i) => i).filter((i) => QUESTIONS[i].hard);
  return { normalOrder: shuffle(normal), hardOrder: shuffle(hard) };
}

function turnBallSetup() {
  return {
    ballsPerTurn: 1,
    ballIndex: 0,
    turnDeltaTotal: 0,
  };
}

function firstRegularQuestion(
  rounds: number,
  normalOrder: number[],
  hardOrder: number[],
  usedQuestionIds: number[],
) {
  const hard = rounds === 1;
  return drawQuestion(hard, normalOrder, hardOrder, usedQuestionIds);
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { normalOrder, hardOrder } = buildOrders();
      return {
        ...initialState,
        teams: action.teams.map((t) => ({
          ...t,
          score: 0,
          skipsLeft: SKIPS,
          bonusChute: null,
        })),
        rounds: action.rounds,
        segment: 'bonus-green',
        currentRound: 0,
        turnIndex: 0,
        phase: 'pick',
        chute: null,
        qOrder: normalOrder,
        hardQOrder: hardOrder,
        usedQuestionIds: [],
        question: null,
        ballsPerTurn: BONUS_ROUND_BALLS,
        ballIndex: 0,
        turnDeltaTotal: 0,
      };
    }

    case 'PICK_CHUTE': {
      if (state.segment === 'bonus-red') return state;
      if (state.segment === 'bonus-green') {
        const teams = state.teams.map((t, i) =>
          i === state.turnIndex ? { ...t, bonusChute: action.chute } : t,
        );
        return {
          ...state,
          teams,
          chute: action.chute,
          phase: 'drop',
          answered: 'correct',
        };
      }
      return {
        ...state,
        chute: action.chute,
        phase: 'answer',
        selected: null,
        revealed: false,
        answered: null,
      };
    }

    case 'SELECT': {
      if (state.revealed) return state;
      return { ...state, selected: action.index };
    }

    case 'REVIEW': {
      if (state.revealed || state.selected === null || !state.question) return state;
      const answer: Answer = state.selected === state.question.a ? 'correct' : 'wrong';
      return { ...state, revealed: true, answered: answer };
    }

    case 'SKIP': {
      if (state.segment !== 'regular' || !state.question) return state;
      const team = state.teams[state.turnIndex];
      if (state.revealed || !team || team.skipsLeft <= 0) return state;
      const teams = state.teams.map((t, i) =>
        i === state.turnIndex ? { ...t, skipsLeft: t.skipsLeft - 1 } : t,
      );
      const final = isFinalRound(state.currentRound, state.rounds);
      const drawn = drawQuestion(final, state.qOrder, state.hardQOrder, state.usedQuestionIds);
      if (!drawn) return state;
      return {
        ...state,
        teams,
        usedQuestionIds: drawn.usedQuestionIds,
        question: drawn.question,
        selected: null,
        revealed: false,
        answered: null,
      };
    }

    case 'DROP':
      if (state.segment === 'bonus-red') {
        return { ...state, phase: 'drop', answered: 'wrong' };
      }
      return { ...state, phase: 'drop' };

    case 'LAND': {
      const final =
        state.segment === 'regular' && isFinalRound(state.currentRound, state.rounds);
      const val = SLOTS[action.slot] * (final ? FINAL_ROUND_SLOT_MULT : 1);
      const delta = state.answered === 'correct' ? val : -val;
      const teams = state.teams.map((t, i) =>
        i === state.turnIndex ? { ...t, score: t.score + delta } : t,
      );
      const ballIndex = state.ballIndex + 1;
      const turnDeltaTotal = state.turnDeltaTotal + delta;
      const moreBalls = ballIndex < state.ballsPerTurn;

      return {
        ...state,
        teams,
        ballIndex,
        turnDeltaTotal,
        phase: moreBalls ? 'drop' : 'result',
        lastDelta: delta,
        lastSlot: action.slot,
      };
    }

    case 'NEXT': {
      let turn = state.turnIndex + 1;
      let round = state.currentRound;
      let segment = state.segment;

      if (turn >= state.teams.length) {
        turn = 0;
        if (segment === 'bonus-green') {
          segment = 'regular';
          round = 1;
        } else if (segment === 'regular') {
          round += 1;
          if (round > state.rounds) {
            segment = 'bonus-red';
            round = state.rounds;
          }
        } else {
          return { ...state, phase: 'gameover' };
        }
      }

      if (segment === 'bonus-red') {
        const chute = state.teams[turn]?.bonusChute ?? null;
        return {
          ...state,
          segment,
          currentRound: round,
          turnIndex: turn,
          chute,
          phase: 'pick',
          answered: null,
          question: null,
          ballsPerTurn: BONUS_ROUND_BALLS,
          ballIndex: 0,
          turnDeltaTotal: 0,
          selected: null,
          revealed: false,
          lastDelta: null,
          lastSlot: null,
        };
      }

      if (segment === 'bonus-green') {
        return {
          ...state,
          segment,
          currentRound: 0,
          turnIndex: turn,
          phase: 'pick',
          chute: null,
          answered: null,
          question: null,
          ballsPerTurn: BONUS_ROUND_BALLS,
          ballIndex: 0,
          turnDeltaTotal: 0,
          selected: null,
          revealed: false,
          lastDelta: null,
          lastSlot: null,
        };
      }

      const final = isFinalRound(round, state.rounds);
      let usedQuestionIds = state.usedQuestionIds;
      let question: Question | null = null;
      const enteringRegular = state.segment === 'bonus-green' && segment === 'regular';

      if (enteringRegular) {
        const drawn = firstRegularQuestion(state.rounds, state.qOrder, state.hardQOrder, usedQuestionIds);
        if (drawn) {
          question = drawn.question;
          usedQuestionIds = drawn.usedQuestionIds;
        }
      } else {
        const drawn = drawQuestion(final, state.qOrder, state.hardQOrder, usedQuestionIds);
        if (drawn) {
          question = drawn.question;
          usedQuestionIds = drawn.usedQuestionIds;
        }
      }

      return {
        ...state,
        segment,
        currentRound: round,
        turnIndex: turn,
        usedQuestionIds,
        question,
        ...turnBallSetup(),
        phase: 'pick',
        chute: null,
        selected: null,
        revealed: false,
        answered: null,
        lastDelta: null,
        lastSlot: null,
      };
    }

    case 'SET_ROUNDS': {
      const rounds = Math.max(1, Math.min(10, action.rounds));
      if (state.segment === 'regular' && state.currentRound > rounds) {
        return { ...state, rounds, phase: 'gameover' };
      }
      if (state.segment !== 'regular') {
        return { ...state, rounds };
      }
      const midTurn = state.phase === 'pick' || state.phase === 'answer';
      const ballsPerTurn = midTurn && state.ballIndex === 0 ? 1 : state.ballsPerTurn;
      return { ...state, rounds, ballsPerTurn };
    }

    case 'END':
      return { ...state, phase: 'gameover' };

    default:
      return state;
  }
}

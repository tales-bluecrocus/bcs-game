// Landing slots (left → right) — 7 bins, symmetric, matches N_CHUTES
export const SLOTS = [3, 2, 1, 2, 1, 2, 3];

// Top drop chutes the team chooses from before answering
export const N_CHUTES = 7;

// Fixed number of captains / teams
export const NUM_CAPTAINS = 3;

// Skips each team may use to swap a question (no penalty)
export const SKIPS = 3;

// Bonus green/red: balls per team turn
export const BONUS_ROUND_BALLS = 3;

// Final scoring round: 1 ball, slot values × this multiplier on the board
export const FINAL_ROUND_SLOT_MULT = 2;

import type { GameSegment } from './types';

export const isFinalRound = (currentRound: number, rounds: number): boolean =>
  currentRound === rounds;

export const isBonusSegment = (segment: GameSegment): boolean => segment !== 'regular';

// Company owner — hidden rule: never a captain, never on a 7-person team.
export const OWNER = 'Lewis';

// Largest team size the owner is not allowed to sit in.
export const OWNER_MAX_TEAM = 7;

export const TEAM_COLORS = [
  '#b14dff', // neon purple
  '#7af7ff', // cyan
  '#ffd24a', // gold
  '#21d07a', // green
  '#ff9f43', // orange
  '#ff4d5e', // red
];

export const slotColor = (v: number): string =>
  v === 3 ? '#ffd24a' : v === 2 ? '#21d07a' : '#3a7bd5';

export const slotLabel = (slotIndex: number, finalRound: boolean): number =>
  SLOTS[slotIndex] * (finalRound ? FINAL_ROUND_SLOT_MULT : 1);

export const slotPoints = (slotIndex: number, finalRound: boolean): number =>
  slotLabel(slotIndex, finalRound);

export const teamLabel = (captain: string): string => `Team ${captain}`;

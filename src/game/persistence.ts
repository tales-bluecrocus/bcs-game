import type { GameState } from './gameReducer';
import type { Team } from './types';

export const GAME_STORAGE_KEY = 'bcs-game-v1';
export const SETUP_STORAGE_KEY = 'bcs-setup-v1';

export interface SetupDraft {
  captains: string[];
  teams: Team[];
  rounds: number;
  choosers: string[];
  mode: 'idle' | 'choosing';
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !Array.isArray(parsed.teams) || parsed.teams.length === 0) return null;
    if (parsed.phase === 'gameover') return null;
    return {
      ...parsed,
      segment: parsed.segment ?? 'regular',
      usedQuestionIds: parsed.usedQuestionIds ?? [],
      teams: parsed.teams.map((t) => ({
        ...t,
        bonusChute: t.bonusChute ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSetupDraft(): SetupDraft | null {
  try {
    const raw = localStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupDraft;
    if (!parsed?.teams?.length || !parsed.captains?.length) return null;
    return {
      ...parsed,
      teams: parsed.teams.map((t) => ({ ...t, bonusChute: t.bonusChute ?? null })),
    };
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: SetupDraft): void {
  try {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearSetupDraft(): void {
  try {
    localStorage.removeItem(SETUP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

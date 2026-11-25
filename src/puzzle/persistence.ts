import type { PuzzleState } from './types';

const KEY = 'bcs-puzzle-v1';
const MAX_IMAGE_CHARS = 1_500_000; // ~1.5MB data URL

export function savePuzzleState(state: PuzzleState): void {
  if (state.phase === 'setup') return;
  try {
    const image =
      state.imageDataUrl && state.imageDataUrl.length <= MAX_IMAGE_CHARS
        ? state.imageDataUrl
        : null;
    const payload = {
      ...state,
      imageDataUrl: image,
      // pieces already hold tile dataURLs — drop source image if too big already handled
    };
    // If tiles themselves are huge, skip persist
    const json = JSON.stringify(payload);
    if (json.length > 4_500_000) return;
    localStorage.setItem(KEY, json);
  } catch {
    /* quota / private mode */
  }
}

export function loadPuzzleState(): PuzzleState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PuzzleState;
    if (!parsed || parsed.phase === 'setup' || !parsed.teams?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPuzzleState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function imageFitsPersist(dataUrl: string): boolean {
  return dataUrl.length <= MAX_IMAGE_CHARS;
}

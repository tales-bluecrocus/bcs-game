import { useEffect, useState } from 'react';
import { drawTeams } from '../drawTeams';
import { imageFitsPersist } from '../persistence';
import { loadRoster, parseNamesBlob, saveRoster } from '../roster';
import { readFileAsDataUrl, sliceImage } from '../sliceImage';
import type { GridSize, PieceDef, TeamMeta } from '../types';

interface Props {
  onStart: (payload: {
    imageDataUrl: string;
    gridSize: GridSize;
    pieces: Record<string, PieceDef>;
    teams: TeamMeta[];
  }) => void;
}

const GRID_OPTIONS: GridSize[] = [3, 4, 5, 6, 7];

export default function PuzzleSetup({ onStart }: Props) {
  const [namesText, setNamesText] = useState(() => loadRoster().join('\n'));
  const [names, setNames] = useState<string[]>(() => loadRoster());
  const [teams, setTeams] = useState<TeamMeta[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistWarn, setPersistWarn] = useState(false);

  useEffect(() => {
    saveRoster(names);
  }, [names]);

  function applyNamesFromText() {
    const parsed = parseNamesBlob(namesText);
    setNames(parsed);
    setTeams(null);
    setError(null);
  }

  function onDraw() {
    const list = parseNamesBlob(namesText);
    setNames(list);
    if (list.length < 3) {
      setError('Need at least 3 names to draw 3 teams');
      setTeams(null);
      return;
    }
    setError(null);
    setTeams(drawTeams(list, 3));
  }

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Pick an image file');
      return;
    }
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);
      setPersistWarn(!imageFitsPersist(dataUrl));
    } catch {
      setError('Could not read image');
    }
  }

  async function start() {
    if (!preview) {
      setError('Upload an image first');
      return;
    }
    if (!teams || teams.length < 3) {
      setError('Draw teams before starting');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pieces = await sliceImage(preview, gridSize);
      onStart({ imageDataUrl: preview, gridSize, pieces, teams });
    } catch {
      setError('Failed to slice image');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-auto px-6 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neon2">Puzzle Race</h1>
          <p className="mt-1 text-sm text-dim">Names → draw teams → image → play</p>
        </div>

        {/* roster */}
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-txt">
              Players <span className="text-dim">({names.length})</span>
            </p>
            <button
              type="button"
              onClick={applyNamesFromText}
              className="text-xs text-dim underline hover:text-txt"
            >
              Update list
            </button>
          </div>
          <textarea
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            onBlur={applyNamesFromText}
            placeholder={'One name per line (or comma-separated)\nEx:\nAna\nBruno\nCarla'}
            rows={8}
            className="w-full resize-y rounded-xl border border-line bg-panel2 px-3 py-2 font-mono text-sm text-txt placeholder:text-dim/50 focus:border-neon2 focus:outline-none"
          />
          <button
            type="button"
            onClick={onDraw}
            className="mt-3 w-full rounded-xl border border-neon bg-neon/15 px-4 py-2.5 text-sm font-semibold text-neon hover:bg-neon/25"
          >
            Draw 3 teams
          </button>
        </section>

        {teams && (
          <section className="space-y-2">
            <p className="text-sm text-dim">Drawn teams</p>
            {teams.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-line bg-panel px-4 py-3"
                style={{ borderLeftWidth: 4, borderLeftColor: t.color }}
              >
                <p className="font-semibold" style={{ color: t.color }}>
                  Team {t.id + 1}
                </p>
                <p className="mt-1 text-sm text-dim">{t.members.join(' · ')}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={onDraw}
              className="text-xs text-dim underline hover:text-txt"
            >
              Draw again
            </button>
          </section>
        )}

        {/* image */}
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel px-6 py-8 hover:border-neon2">
          <span className="text-sm text-dim">Puzzle image (center square crop)</span>
          <span className="rounded-lg bg-panel2 px-4 py-2 text-sm font-medium text-txt">
            Choose file
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        {preview && (
          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <img src={preview} alt="Puzzle source" className="mx-auto max-h-56 object-contain" />
          </div>
        )}

        {persistWarn && (
          <p className="text-sm text-gold">
            Large image — runs in memory only (refresh loses the game).
          </p>
        )}

        <div>
          <p className="mb-2 text-sm text-dim">Grid size</p>
          <div className="flex gap-2">
            {GRID_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setGridSize(n)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  gridSize === n
                    ? 'border-neon2 bg-panel2 text-neon2'
                    : 'border-line bg-panel text-dim hover:text-txt'
                }`}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-pred">{error}</p>}

        <button
          type="button"
          disabled={!preview || !teams || busy}
          onClick={start}
          className="rounded-xl bg-neon2 px-6 py-3 text-base font-semibold text-bcg disabled:opacity-40"
        >
          {busy ? 'Slicing…' : 'Start'}
        </button>
      </div>
    </div>
  );
}

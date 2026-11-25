import type { Team, GameSegment } from '../game/types';
import { teamLabel } from '../game/config';

interface Props {
  teams: Team[];
  currentIndex: number;
  segment: GameSegment;
  currentRound: number;
  rounds: number;
  finalRound?: boolean;
  onRoundsChange: (rounds: number) => void;
  onEnd: () => void;
}

export default function Scoreboard({
  teams,
  currentIndex,
  segment,
  currentRound,
  rounds,
  finalRound,
  onRoundsChange,
  onEnd,
}: Props) {
  return (
    <div className="flex flex-none items-center gap-4 border-b border-line bg-bcg/60 px-5 py-2.5">
      <div
        className="shrink-0 whitespace-nowrap text-xl font-black tracking-[0.25em]"
        style={{
          background: 'linear-gradient(90deg,#b14dff,#7af7ff)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        THE WALL
      </div>

      <div className="flex min-w-0 flex-1 flex-nowrap justify-center gap-2.5 overflow-hidden">
        {teams.map((t, i) => (
          <div
            key={t.id}
            className={`flex min-w-[130px] shrink items-center justify-between gap-3 rounded-xl border-2 bg-panel px-3.5 py-1.5 transition ${
              i === currentIndex ? 'border-neon shadow-[0_0_22px_rgba(177,77,255,.4)]' : 'border-line'
            }`}
          >
            <span className="max-w-[150px] truncate text-sm font-bold" style={{ color: t.color }}>
              {teamLabel(t.captain)}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-dim" title="skips left">
                ⏭{t.skipsLeft}
              </span>
              <span
                data-testid={i === currentIndex ? 'active-score' : undefined}
                className={`text-xl font-black ${t.score < 0 ? 'text-pred' : 'text-gold'}`}
              >
                {t.score}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs tracking-wider text-dim">
        {finalRound && (
          <span className="rounded-md border border-gold/50 bg-gold/15 px-2 py-0.5 font-black text-gold">
            FINAL
          </span>
        )}
        {segment === 'bonus-green' && (
          <span className="rounded-md border border-pgreen/50 bg-pgreen/15 px-2 py-0.5 font-black text-pgreen">
            BONUS · GREEN
          </span>
        )}
        {segment === 'bonus-red' && (
          <span className="rounded-md border border-pred/50 bg-pred/15 px-2 py-0.5 font-black text-pred">
            BONUS · RED
          </span>
        )}
        {segment === 'regular' ? (
          <label className="flex items-center gap-1.5">
            Round
            <input
              type="number"
              min={1}
              max={10}
              value={currentRound}
              readOnly
              className="w-9 rounded border border-line bg-panel2 px-1 py-0.5 text-center font-bold text-txt/70"
              aria-label="Current round"
            />
            /
            <input
              type="number"
              min={1}
              max={10}
              value={rounds}
              data-testid="rounds-input"
              onChange={(e) =>
                onRoundsChange(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
              className="w-11 rounded border border-line bg-panel2 px-1 py-0.5 text-center font-bold text-txt focus:border-neon focus:outline-none"
              aria-label="Total rounds"
            />
          </label>
        ) : (
          <span className="text-dim">Scoring rounds: {rounds}</span>
        )}
      </div>
      <button
        onClick={onEnd}
        className="shrink-0 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs font-bold text-txt transition hover:brightness-125"
      >
        End game
      </button>
    </div>
  );
}

import type { Team } from '../game/types';
import { teamLabel } from '../game/config';

interface Props {
  teams: Team[];
  onRestart: () => void;
}

export default function Result({ teams, onRestart }: Props) {
  const ranked = [...teams].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 overflow-auto p-6">
      <h2 className="text-center text-4xl font-black text-gold sm:text-5xl">
        🏁 {winner ? `${teamLabel(winner.captain)} wins!` : 'Final Results'}
      </h2>

      <div className="flex w-[min(620px,94vw)] flex-col gap-2.5">
        {ranked.map((t, i) => (
          <div
            key={t.id}
            className={`flex items-center gap-4 rounded-2xl border bg-panel px-5 py-3.5 text-xl ${
              i === 0 ? 'border-gold shadow-[0_0_26px_rgba(255,210,74,.35)]' : 'border-line'
            }`}
          >
            <span className="w-10 font-black text-neon2">{i === 0 ? '🏆' : `#${i + 1}`}</span>
            <div className="flex-1">
              <div className="font-bold" style={{ color: t.color }}>
                {teamLabel(t.captain)}
              </div>
              <div className="text-xs text-dim">{t.members.join(', ')}</div>
            </div>
            <span className={`font-black ${t.score < 0 ? 'text-pred' : 'text-gold'}`}>
              {t.score} pts
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        className="rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-7 py-3 text-lg font-extrabold text-white transition hover:brightness-110"
      >
        Play again ↻
      </button>
    </div>
  );
}

import type { TeamBoard, TeamMeta } from '../types';

interface Props {
  teams: TeamMeta[];
  boards: Record<number, TeamBoard>;
  onRestart: () => void;
}

export default function DoneScreen({ teams, boards, onRestart }: Props) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold text-gold">Race over</h1>
      <ul className="w-full max-w-md space-y-2">
        {teams.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-line bg-panel px-4 py-3"
            style={{ borderLeftWidth: 4, borderLeftColor: t.color }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Team {t.id + 1}</span>
              <span className={boards[t.id]?.complete ? 'text-pgreen' : 'text-dim'}>
                {boards[t.id]?.complete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <p className="mt-1 text-xs text-dim">{t.members.join(' · ')}</p>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-xl bg-neon2 px-5 py-2.5 font-semibold text-bcg"
      >
        New race
      </button>
    </div>
  );
}

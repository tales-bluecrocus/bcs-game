import type { TeamBoard, TeamMeta } from '../types';

interface Props {
  teams: TeamMeta[];
  boards: Record<number, TeamBoard>;
  activeTeamId: number;
  onSelect: (teamId: number) => void;
  onReset: () => void;
  onEnd: () => void;
}

export default function TeamBar({
  teams,
  boards,
  activeTeamId,
  onSelect,
  onReset,
  onEnd,
}: Props) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
      <div className="flex flex-1 flex-wrap gap-2">
        {teams.map((t) => {
          const done = boards[t.id]?.complete;
          const active = t.id === activeTeamId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-panel2' : 'bg-transparent opacity-70 hover:opacity-100'
              }`}
              style={{
                borderColor: t.color,
                color: t.color,
                boxShadow: active ? `0 0 0 1px ${t.color}` : undefined,
              }}
              title={t.members.join(', ')}
            >
              Team {t.id + 1}
              {done ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-line px-2 py-1 text-xs text-dim hover:text-txt"
      >
        Rescramble
      </button>
      <button
        type="button"
        onClick={onEnd}
        className="rounded-lg border border-pred/50 px-2 py-1 text-xs text-pred hover:bg-pred/10"
      >
        End
      </button>
    </header>
  );
}

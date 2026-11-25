import { useEffect, useMemo, useState } from 'react';
import { OWNER } from '../game/config';
import type { Team } from '../game/types';
import { buildFixedTeams, FIXED_CAPTAINS } from '../data/fixedTeams';
import {
  clearSetupDraft,
  loadSetupDraft,
  saveSetupDraft,
  type SetupDraft,
} from '../game/persistence';

interface Props {
  people: string[];
  onAdmin: () => void;
  onStart: (teams: Team[], rounds: number) => void;
}

export default function Setup({ people, onAdmin, onStart }: Props) {
  const saved = useMemo(() => loadSetupDraft(), []);
  const fixedTeams = useMemo(() => buildFixedTeams(), []);

  const [teams] = useState<Team[]>(fixedTeams);
  const [captains] = useState<string[]>(FIXED_CAPTAINS);
  const [rounds, setRounds] = useState(saved?.rounds ?? 1);

  useEffect(() => {
    const draft: SetupDraft = {
      captains,
      teams,
      rounds,
      choosers: [],
      mode: 'idle',
    };
    saveSetupDraft(draft);
  }, [teams, captains, rounds]);

  const capSet = new Set(captains);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 overflow-auto p-6">
      <div className="text-center">
        <h1
          className="text-5xl font-black tracking-[0.2em] sm:text-6xl"
          style={{
            background: 'linear-gradient(90deg,#b14dff,#7af7ff)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 40px rgba(177,77,255,.35)',
          }}
        >
          THE WALL
        </h1>
        <div className="mt-1 text-[11px] uppercase tracking-[0.35em] text-dim">
          BCS GAME SHOW only
        </div>
      </div>

      <div className="flex w-[min(820px,94vw)] flex-col gap-5 rounded-3xl border border-line bg-panel/80 p-7 shadow-[0_0_60px_rgba(20,16,50,.6)]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-dim">
            <span>Present ({people.length})</span>
            <button
              onClick={onAdmin}
              className="ml-auto rounded-lg border border-line bg-panel2 px-3 py-1.5 text-[11px] font-bold normal-case tracking-normal text-txt transition hover:border-neon"
            >
              ⚙ Manage participants
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const isCap = capSet.has(p);
              return (
                <span
                  key={p}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    isCap
                      ? 'border-neon bg-neon/20 font-bold text-neon'
                      : 'border-line bg-panel2 text-txt/80'
                  }`}
                >
                  {isCap && '★ '}
                  {p}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
          {teams.map((t) => {
            const members = t.members.filter((m) => m !== t.captain);
            return (
              <div
                key={t.id}
                data-testid="teamcard"
                data-captain={t.captain}
                data-size={t.members.length}
                data-haslewis={t.members.includes(OWNER) ? '1' : '0'}
                className="flex flex-col overflow-hidden rounded-2xl border bg-panel2/70"
                style={{ borderColor: `${t.color}55` }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: `${t.color}18` }}
                >
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: t.color }} />
                  <span className="truncate font-extrabold" style={{ color: t.color }}>
                    {t.captain}
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-dim">
                    👑 captain
                  </span>
                </div>
                <ul className="flex flex-1 flex-col gap-1 px-4 py-3 text-sm text-txt/90">
                  {members.map((m) => (
                    <li key={m} className="truncate">
                      <span className="text-dim">•</span> {m}
                    </li>
                  ))}
                </ul>
                <div className="px-4 pb-2 text-[10px] uppercase tracking-wider text-dim">
                  {members.length + 1} players
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <label className="flex items-center gap-2.5 text-sm text-dim">
            Rounds
            <input
              type="number"
              min={1}
              max={10}
              value={rounds}
              onChange={(e) => setRounds(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-line bg-panel2 px-3 py-2 text-center font-bold text-txt focus:border-neon focus:outline-none"
            />
          </label>
          <button
            onClick={() => {
              clearSetupDraft();
              onStart(teams, rounds);
            }}
            className="ml-auto rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-8 py-3 text-lg font-extrabold text-white shadow-lg shadow-neon/30 transition hover:brightness-110"
          >
            Start game ▶
          </button>
        </div>
      </div>
    </div>
  );
}

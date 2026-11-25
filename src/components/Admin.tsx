import { useState } from 'react';
import { OWNER } from '../game/config';

export interface Person {
  name: string;
  present: boolean;
}

interface Props {
  roster: Person[];
  setRoster: (r: Person[]) => void;
  onDone: () => void;
}

export default function Admin({ roster, setRoster, onDone }: Props) {
  const [draft, setDraft] = useState('');

  const present = roster.filter((p) => p.present).length;

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (roster.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      return;
    }
    setRoster([...roster, { name, present: true }]);
    setDraft('');
  };

  const toggle = (name: string) =>
    setRoster(roster.map((p) => (p.name === name ? { ...p, present: !p.present } : p)));

  const remove = (name: string) => setRoster(roster.filter((p) => p.name !== name));

  const setAll = (present: boolean) => setRoster(roster.map((p) => ({ ...p, present })));

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 overflow-auto p-6">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-wide text-txt sm:text-4xl">Participants</h1>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-dim">
          {present} present · {roster.length} total
        </div>
      </div>

      <div className="flex w-[min(720px,94vw)] flex-col gap-4 rounded-3xl border border-line bg-panel/80 p-6">
        {/* add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            placeholder="Add a name…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="flex-1 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-txt focus:border-neon focus:outline-none"
          />
          <button
            onClick={add}
            className="rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-5 py-2.5 font-extrabold text-white transition hover:brightness-110"
          >
            + Add
          </button>
        </div>

        {/* bulk */}
        <div className="flex items-center gap-3 text-xs text-dim">
          <span>Tap a name to toggle present / absent</span>
          <button onClick={() => setAll(true)} className="ml-auto rounded-lg border border-line bg-panel2 px-3 py-1.5 font-bold text-txt transition hover:brightness-125">
            All present
          </button>
          <button onClick={() => setAll(false)} className="rounded-lg border border-line bg-panel2 px-3 py-1.5 font-bold text-txt transition hover:brightness-125">
            All absent
          </button>
        </div>

        {/* list */}
        <div className="flex max-h-[48vh] flex-wrap gap-2 overflow-auto py-1">
          {roster.map((p) => {
            const isOwner = p.name === OWNER;
            return (
              <span
                key={p.name}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  p.present
                    ? 'border-neon/70 bg-neon/15 text-txt'
                    : 'border-line bg-panel2 text-dim line-through'
                }`}
              >
                <button onClick={() => toggle(p.name)} className="flex items-center gap-1.5 font-semibold">
                  <span className={`inline-block h-2 w-2 rounded-full ${p.present ? 'bg-pgreen' : 'bg-dim'}`} />
                  {p.name}
                  {isOwner && <span title="owner" className="text-gold">★</span>}
                </button>
                <button
                  onClick={() => remove(p.name)}
                  title="remove"
                  className="text-dim transition hover:text-pred"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>

        <button
          onClick={onDone}
          className="ml-auto rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-7 py-3 text-lg font-extrabold text-white transition hover:brightness-110"
        >
          Done ▶
        </button>
      </div>
    </div>
  );
}

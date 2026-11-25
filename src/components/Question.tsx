import type { Question as Q } from '../game/types';

interface Props {
  question: Q;
  teamName: string;
  teamColor: string;
  qNumber: number;
  qTotal: number;
  skipsLeft: number;
  selected: number | null;
  revealed: boolean;
  onSelect: (index: number) => void;
  onReview: () => void;
  onSkip: () => void;
  onDrop: () => void;
  isFinalRound?: boolean;
}

const KEYS = ['A', 'B', 'C', 'D'];

export default function Question({
  question,
  teamName,
  teamColor,
  qNumber,
  qTotal,
  skipsLeft,
  selected,
  revealed,
  onSelect,
  onReview,
  onSkip,
  onDrop,
  isFinalRound = false,
}: Props) {
  const correctAnswer = revealed && selected === question.a;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-5 sm:px-16">
      <div className="flex w-[min(1100px,94vw)] items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm tracking-wide text-dim">
          {isFinalRound && (
            <span className="rounded-md border border-gold/50 bg-gold/15 px-2 py-0.5 font-black text-gold">
              FINAL ROUND
            </span>
          )}
          <span className="font-extrabold uppercase text-neon2">{question.cat}</span>
          <span className="font-extrabold" style={{ color: teamColor }}>{teamName}</span>
          <span>
            Q {qNumber} / {qTotal}
          </span>
        </div>
        <span className="text-xs text-dim">
          Skips: <b className="text-txt">{skipsLeft}</b>
        </span>
      </div>

      <div
        data-testid="qtext"
        className="max-w-[1100px] text-center text-3xl font-extrabold leading-tight sm:text-4xl"
      >
        {question.q}
      </div>

      {isFinalRound && (
        <p className="max-w-[900px] text-center text-sm font-bold text-gold">
          Hard question · 1 ball · doubled slot values on the board
        </p>
      )}

      <div className="grid w-[min(1100px,94vw)] grid-cols-1 gap-3.5 sm:grid-cols-2">
        {question.o.map((opt, i) => {
          const picked = i === selected;
          const isCorrect = revealed && i === question.a;
          const isWrongPick = revealed && picked && selected !== question.a;
          const dim = revealed && !isCorrect && !isWrongPick;
          const pendingPick = !revealed && picked;
          return (
            <button
              key={i}
              data-testid="opt"
              disabled={revealed}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg transition sm:text-xl ${
                isCorrect
                  ? 'border-pgreen bg-pgreen/20'
                  : isWrongPick
                    ? 'border-pred bg-pred/15'
                    : dim
                      ? 'border-[#33335f] bg-panel2 opacity-45'
                      : pendingPick
                        ? 'border-neon bg-neon/20 shadow-[0_0_18px_rgba(177,77,255,.35)]'
                        : 'border-[#33335f] bg-panel2 hover:border-neon hover:bg-neon/10'
              }`}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-lg font-black ${
                  isCorrect
                    ? 'bg-pgreen text-[#05210f]'
                    : isWrongPick
                      ? 'bg-pred text-white'
                      : pendingPick
                        ? 'bg-neon text-white'
                        : 'bg-[#2a2a52] text-neon2'
                }`}
              >
                {KEYS[i]}
              </span>
              <span>{opt}</span>
              {isCorrect && <span className="ml-auto text-pgreen">✔ correct</span>}
              {isWrongPick && <span className="ml-auto text-pred">✗ your pick</span>}
              {pendingPick && <span className="ml-auto text-neon2">● selected</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {!revealed ? (
          <>
            <button
              onClick={onSkip}
              disabled={skipsLeft <= 0}
              className="rounded-xl border border-line bg-panel2 px-6 py-3 font-extrabold text-txt transition hover:brightness-125 disabled:opacity-40"
            >
              ⏭ Skip ({skipsLeft})
            </button>
            <button
              onClick={onReview}
              disabled={selected === null}
              className="rounded-xl bg-gradient-to-r from-[#13a35a] to-pgreen px-7 py-3 text-lg font-extrabold text-[#04230f] transition hover:brightness-110 disabled:opacity-40"
            >
              ✔ Review answer
            </button>
          </>
        ) : (
          <button
            onClick={onDrop}
            className="rounded-xl bg-gradient-to-r from-[#5b4dff] to-neon px-7 py-3 text-lg font-extrabold text-white transition hover:brightness-110"
          >
            Drop the ball ▶
          </button>
        )}
      </div>

      <div className="min-h-[18px] text-center text-sm text-dim">
        {!revealed
          ? selected === null
            ? 'Select an answer, then Review to lock it in.'
            : 'You can change it · click Review to lock.'
          : correctAnswer
            ? '✔ Correct — green ball, points will be added.'
            : '✗ Wrong — red ball, points will be subtracted.'}
      </div>
    </div>
  );
}

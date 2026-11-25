import type { PieceDef, PieceLetter } from '../types';
import PuzzlePiece from './PuzzlePiece';

interface Props {
  tray: PieceLetter[];
  pieces: Record<PieceLetter, PieceDef>;
  gridSize: number;
  selected: PieceLetter | null;
  complete: boolean;
  teamColor: string;
  onPick: (letter: PieceLetter) => void;
}

/** Stable pseudo-random tilt per piece id */
function tilt(id: string): number {
  const n = Number(id) * 17 || id.charCodeAt(0) * 17;
  return ((n % 17) - 8) * 1.4;
}

export default function Tray({
  tray,
  pieces,
  gridSize,
  selected,
  complete,
  teamColor,
  onPick,
}: Props) {
  if (complete) {
    return (
      <p className="py-3 text-center text-sm text-pgreen">
        Board complete — switch team or End
      </p>
    );
  }

  return (
    <div className="puzzle-tray shrink-0 px-3 py-4">
      <p className="mb-3 text-center text-xs uppercase tracking-[0.18em] text-amber-100/60">
        Loose pieces — click a piece, then a slot (e.g. piece 7 → B2)
      </p>
      <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
        {tray.map((letter) => {
          const piece = pieces[letter];
          if (!piece) return null;
          return (
            <PuzzlePiece
              key={letter}
              piece={piece}
              gridSize={gridSize}
              selected={selected === letter}
              accent={teamColor}
              rotateDeg={tilt(letter)}
              sizeClass="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24"
              onClick={() => onPick(letter)}
            />
          );
        })}
        {tray.length === 0 && (
          <p className="text-sm text-dim">All on the board — click a piece to move</p>
        )}
      </div>
    </div>
  );
}

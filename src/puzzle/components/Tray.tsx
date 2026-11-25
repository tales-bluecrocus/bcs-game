import type { PieceDef, PieceLetter, PieceRotation } from '../types';
import PuzzlePiece from './PuzzlePiece';

interface Props {
  tray: PieceLetter[];
  pieces: Record<PieceLetter, PieceDef>;
  rotations: Record<PieceLetter, PieceRotation>;
  gridSize: number;
  selected: PieceLetter | null;
  complete: boolean;
  teamColor: string;
  onPick: (letter: PieceLetter) => void;
}

export default function Tray({
  tray,
  pieces,
  rotations,
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
        Loose pieces — click piece → slot · Rotate / Check when selected
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
              rotateDeg={rotations[letter] ?? 0}
              sizeClass="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24"
              onClick={() => onPick(letter)}
              fit="tray"
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

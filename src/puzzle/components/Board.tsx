import { Fragment } from 'react';
import { colLetter, slotLabel } from '../coords';
import type { PieceDef, PieceLetter } from '../types';
import PuzzlePiece from './PuzzlePiece';

interface Props {
  gridSize: number;
  slots: (PieceLetter | null)[][];
  pieces: Record<PieceLetter, PieceDef>;
  selected: PieceLetter | null;
  complete: boolean;
  teamColor: string;
  onPickPiece: (letter: PieceLetter) => void;
  onPlace: (row: number, col: number) => void;
}

export default function Board({
  gridSize,
  slots,
  pieces,
  selected,
  complete,
  teamColor,
  onPickPiece,
  onPlace,
}: Props) {
  return (
    <div className="relative mx-auto w-full max-w-[min(68vh,100%)]">
      {/* wooden frame */}
      <div className="puzzle-frame rounded-xl p-3 sm:p-4">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `1.75rem repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `1.5rem repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {Array.from({ length: gridSize }, (_, col) => (
            <div
              key={`h-${col}`}
              className="flex items-center justify-center text-sm font-bold text-amber-100/80"
            >
              {colLetter(col)}
            </div>
          ))}

          {slots.map((rowSlots, row) => (
            <Fragment key={`row-${row}`}>
              <div className="flex items-center justify-center text-sm font-bold text-amber-100/80">
                {row + 1}
              </div>
              {rowSlots.map((letter, col) => {
                const piece = letter ? pieces[letter] : null;
                const isSelected = letter !== null && letter === selected;
                const canPlace = selected !== null && !complete;
                return (
                  <button
                    key={slotLabel(row, col)}
                    type="button"
                    disabled={complete}
                    onClick={() => {
                      if (selected) onPlace(row, col);
                      else if (letter) onPickPiece(letter);
                    }}
                    className={`puzzle-slot relative aspect-square ${
                      canPlace ? 'puzzle-slot--target' : ''
                    } ${isSelected ? 'z-10' : ''}`}
                    title={slotLabel(row, col)}
                  >
                    {!piece && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-white/25 sm:text-xs">
                        {slotLabel(row, col)}
                      </span>
                    )}
                    {piece && (
                      <div className="absolute inset-[4%] flex items-center justify-center">
                        <PuzzlePiece
                          piece={piece}
                          gridSize={gridSize}
                          selected={isSelected}
                          accent={teamColor}
                          sizeClass="h-full w-full"
                          interactive={false}
                          showLabel
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {complete && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bcg/65 animate-pop">
          <p className="rounded-full bg-pgreen px-6 py-2 text-2xl font-bold text-bcg shadow-lg">
            Puzzle complete!
          </p>
        </div>
      )}
    </div>
  );
}

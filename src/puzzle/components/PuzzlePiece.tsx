import { jigsawPath, pieceEdges, PIECE_PAD } from '../pieceShape';
import type { PieceDef, PieceMark } from '../types';

interface Props {
  piece: PieceDef;
  gridSize: number;
  selected?: boolean;
  accent?: string;
  rotateDeg?: number;
  sizeClass?: string;
  onClick?: () => void;
  /** false = decorative inside a slot (no nested button) */
  interactive?: boolean;
  showLabel?: boolean;
  /** slot = fill cell tighter; tray = leave room for tabs */
  fit?: 'tray' | 'slot';
  mark?: PieceMark;
}

export default function PuzzlePiece({
  piece,
  gridSize,
  selected,
  accent = '#7af7ff',
  rotateDeg = 0,
  sizeClass = 'h-20 w-20',
  onClick,
  interactive = true,
  showLabel = true,
  fit = 'tray',
  mark,
}: Props) {
  const edges = pieceEdges(piece.correctRow, piece.correctCol, gridSize);
  const path = jigsawPath(edges);
  const clipId = `clip-${piece.letter}-${piece.correctRow}-${piece.correctCol}-${fit}`;
  const vb = `-${PIECE_PAD} -${PIECE_PAD} ${100 + PIECE_PAD * 2} ${100 + PIECE_PAD * 2}`;

  // Slot: scale so the 100×100 body nearly fills the cell (tabs may overhang)
  const fillScale = fit === 'slot' ? (100 + PIECE_PAD * 2) / 100 : 1;
  const markAccent = mark === 'ok' ? '#21d07a' : mark === 'bad' ? '#ff4d5e' : null;

  const scale = fillScale * (selected ? 1.05 : 1);
  const style = {
    transform: `rotate(${rotateDeg}deg) scale(${scale})`,
    filter: selected
      ? `drop-shadow(0 0 10px ${accent}) drop-shadow(0 6px 10px rgba(0,0,0,.55))`
      : markAccent
        ? `drop-shadow(0 0 8px ${markAccent}) drop-shadow(0 4px 6px rgba(0,0,0,.45))`
        : 'drop-shadow(0 4px 6px rgba(0,0,0,.45))',
  } as const;

  const stroke = markAccent ?? (selected ? accent : 'rgba(255,255,255,0.55)');

  const body = (
    <>
      <svg viewBox={vb} className="h-full w-full overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>
        <image
          href={piece.imageUrl}
          x={0}
          y={0}
          width={100}
          height={100}
          preserveAspectRatio="none"
          clipPath={`url(#${clipId})`}
        />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={selected || mark ? 2.4 : 1.4}
        />
      </svg>
      {showLabel && (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-sm font-black tracking-wide text-white shadow"
          style={{
            background: 'rgba(0,0,0,0.72)',
            outline: selected
              ? `2px solid ${accent}`
              : markAccent
                ? `2px solid ${markAccent}`
                : undefined,
          }}
        >
          {piece.letter}
          {mark === 'ok' ? ' ✓' : mark === 'bad' ? ' ✕' : ''}
        </span>
      )}
    </>
  );

  const className = `puzzle-piece relative ${sizeClass} shrink-0 ${selected ? 'z-10' : ''}`;

  if (!interactive) {
    return (
      <div className={`${className} pointer-events-none`} style={style} aria-hidden>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={style}
      aria-label={`Piece ${piece.letter}`}
    >
      {body}
    </button>
  );
}

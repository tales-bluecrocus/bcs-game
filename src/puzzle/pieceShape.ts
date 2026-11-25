/** Edge: 1 = tab out, -1 = socket in, 0 = flat (board edge). */
export interface PieceEdges {
  top: -1 | 0 | 1;
  right: -1 | 0 | 1;
  bottom: -1 | 0 | 1;
  left: -1 | 0 | 1;
}

function edgeSeed(row: number, col: number, axis: 'h' | 'v'): 1 | -1 {
  const n = (row * 31 + col * 17 + (axis === 'h' ? 7 : 13)) * 2654435761;
  return (n >>> 0) % 2 === 0 ? 1 : -1;
}

/** Classic interlocking: shared edges mirror; outer edges flat. */
export function pieceEdges(row: number, col: number, gridSize: number): PieceEdges {
  return {
    top: row === 0 ? 0 : ((-edgeSeed(row - 1, col, 'h')) as -1 | 1),
    left: col === 0 ? 0 : ((-edgeSeed(row, col - 1, 'v')) as -1 | 1),
    right: col === gridSize - 1 ? 0 : edgeSeed(row, col, 'v'),
    bottom: row === gridSize - 1 ? 0 : edgeSeed(row, col, 'h'),
  };
}

/**
 * SVG path for a jigsaw tile in a 0..100 viewBox.
 * Tabs extend outside; sockets cut inward.
 */
export function jigsawPath(edges: PieceEdges): string {
  const tab = 18;
  const half = 15;

  function bump(
    from: [number, number],
    to: [number, number],
    dir: -1 | 0 | 1,
    nx: number,
    ny: number,
  ): string {
    if (dir === 0) return `L ${to[0]} ${to[1]}`;
    const ux = (to[0] - from[0]) / 100;
    const uy = (to[1] - from[1]) / 100;
    const a0 = from[0] + ux * (50 - half);
    const a1 = from[1] + uy * (50 - half);
    const b0 = from[0] + ux * (50 + half);
    const b1 = from[1] + uy * (50 + half);
    const mx = (from[0] + to[0]) / 2;
    const my = (from[1] + to[1]) / 2;
    const tipX = mx + nx * tab * dir;
    const tipY = my + ny * tab * dir;
    return (
      `L ${a0} ${a1} ` +
      `C ${a0 + nx * tab * 0.4 * dir} ${a1 + ny * tab * 0.4 * dir} ` +
      `${tipX - ux * 8} ${tipY - uy * 8} ` +
      `${tipX} ${tipY} ` +
      `C ${tipX + ux * 8} ${tipY + uy * 8} ` +
      `${b0 + nx * tab * 0.4 * dir} ${b1 + ny * tab * 0.4 * dir} ` +
      `${b0} ${b1} ` +
      `L ${to[0]} ${to[1]}`
    );
  }

  return (
    `M 0 0 ` +
    bump([0, 0], [100, 0], edges.top, 0, -1) +
    ' ' +
    bump([100, 0], [100, 100], edges.right, 1, 0) +
    ' ' +
    bump([100, 100], [0, 100], edges.bottom, 0, 1) +
    ' ' +
    bump([0, 100], [0, 0], edges.left, -1, 0) +
    ' Z'
  );
}

/** viewBox padding so tabs aren't clipped (path coords stay 0..100). */
export const PIECE_PAD = 22;

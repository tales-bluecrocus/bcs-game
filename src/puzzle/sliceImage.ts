import { pieceLetter } from './coords';
import type { PieceDef } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/** Crop image into N×N square tiles; returns piece defs keyed by id ("1","2",…). */
export async function sliceImage(
  dataUrl: string,
  gridSize: number,
): Promise<Record<string, PieceDef>> {
  const img = await loadImage(dataUrl);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx0 = (img.naturalWidth - side) / 2;
  const sy0 = (img.naturalHeight - side) / 2;
  const tile = Math.floor(side / gridSize);
  const canvas = document.createElement('canvas');
  canvas.width = tile;
  canvas.height = tile;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');

  const pieces: Record<string, PieceDef> = {};
  let index = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      ctx.clearRect(0, 0, tile, tile);
      ctx.drawImage(
        img,
        sx0 + col * tile,
        sy0 + row * tile,
        tile,
        tile,
        0,
        0,
        tile,
        tile,
      );
      const letter = pieceLetter(index);
      pieces[letter] = {
        letter,
        correctRow: row,
        correctCol: col,
        imageUrl: canvas.toDataURL('image/jpeg', 0.85),
      };
      index++;
    }
  }
  return pieces;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unexpected file result'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

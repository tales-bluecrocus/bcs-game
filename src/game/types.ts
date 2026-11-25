export interface Question {
  cat: string;
  q: string;
  o: string[];
  a: number; // index of correct option
  hard?: boolean;
}

export interface Team {
  id: number;
  captain: string;
  members: string[]; // includes captain
  score: number;
  color: string;
  skipsLeft: number;
  bonusChute: number | null;
}

export type GameSegment = 'bonus-green' | 'regular' | 'bonus-red';

export type Phase = 'pick' | 'answer' | 'drop' | 'result' | 'gameover';
export type Answer = 'correct' | 'wrong';
export type BallColor = 'green' | 'red';

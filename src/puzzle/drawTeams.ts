import { TEAM_COLORS } from '../game/config';
import type { TeamMeta } from './types';

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Split names into 3 teams as evenly as possible. First member = captain. */
export function drawTeams(names: string[], teamCount = 3): TeamMeta[] {
  const pool = shuffleInPlace([...names.map((n) => n.trim()).filter(Boolean)]);
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  pool.forEach((name, i) => {
    teams[i % teamCount].push(name);
  });
  // reshuffle team order so Team 0 isn't always first bucket
  shuffleInPlace(teams);
  return teams
    .filter((m) => m.length > 0)
    .map((members, id) => ({
      id,
      captain: members[0],
      members: [...members],
      color: TEAM_COLORS[id % TEAM_COLORS.length],
    }));
}

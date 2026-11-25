import { SKIPS, TEAM_COLORS } from '../game/config';
import type { Team } from '../game/types';

/** Tonight's roster — fixed captains + members (no draw). */
export const FIXED_TEAMS: { captain: string; members: string[] }[] = [
  {
    captain: 'Sabrina',
    members: ['Sabrina', 'Javier', 'Claudia', 'Adriana', 'Ruffa', 'Renz'],
  },
  {
    captain: 'Jo Nikko',
    members: ['Jo Nikko', 'Nidia', 'Rhyn', 'Meg', 'Pia', 'Jhon Rey'],
  },
  {
    captain: 'Jhon',
    members: ['Jhon', 'Matt', 'Mariel', 'Lewis', 'Nash', 'Nikko'],
  },
];

export const FIXED_CAPTAINS = FIXED_TEAMS.map((t) => t.captain);

export function buildFixedTeams(): Team[] {
  return FIXED_TEAMS.map((t, i) => ({
    id: i,
    captain: t.captain,
    members: [...t.members],
    score: 0,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    skipsLeft: SKIPS,
    bonusChute: null,
  }));
}

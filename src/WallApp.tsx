import { useEffect, useReducer, useState } from 'react';
import { gameReducer, initialState, type GameState } from './game/gameReducer';
import { teamLabel, isFinalRound } from './game/config';
import type { BallColor } from './game/types';
import { PARTICIPANTS } from './data/participants';
import {
  clearGameState,
  clearSetupDraft,
  loadGameState,
  saveGameState,
} from './game/persistence';
import Setup from './components/Setup';
import Admin, { type Person } from './components/Admin';
import Scoreboard from './components/Scoreboard';
import Wall from './components/Wall';
import Question from './components/Question';
import Result from './components/Result';

const ROSTER_KEY = 'bcs-roster-v1';

function loadRoster(): Person[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Person[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return PARTICIPANTS.map((name) => ({ name, present: true }));
}

function initGameState(): GameState {
  const saved = loadGameState();
  if (saved) {
    clearSetupDraft();
    return saved;
  }
  return initialState;
}

export default function WallApp({ onBack }: { onBack: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, initialState, initGameState);
  const [roster, setRoster] = useState<Person[]>(loadRoster);
  const [screen, setScreen] = useState<'setup' | 'admin'>('setup');

  useEffect(() => {
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    } catch {
      /* ignore */
    }
  }, [roster]);

  useEffect(() => {
    if (state.teams.length === 0 || state.phase === 'gameover') return;
    saveGameState(state);
  }, [state]);

  if (state.teams.length === 0) {
    if (screen === 'admin') {
      return <Admin roster={roster} setRoster={setRoster} onDone={() => setScreen('setup')} />;
    }
    return (
      <div className="relative h-screen">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 z-20 rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-dim hover:text-txt"
        >
          ← Hub
        </button>
        <Setup
          people={roster.filter((p) => p.present).map((p) => p.name)}
          onAdmin={() => setScreen('admin')}
          onStart={(teams, rounds) => dispatch({ type: 'START_GAME', teams, rounds })}
        />
      </div>
    );
  }

  if (state.phase === 'gameover') {
    return (
      <Result
        teams={state.teams}
        onRestart={() => {
          clearGameState();
          clearSetupDraft();
          window.location.reload();
        }}
      />
    );
  }

  const team = state.teams[state.turnIndex];
  const finalRound =
    state.segment === 'regular' && isFinalRound(state.currentRound, state.rounds);
  const ballColor: BallColor | null =
    state.segment === 'bonus-green'
      ? 'green'
      : state.segment === 'bonus-red'
        ? state.phase === 'drop' || state.phase === 'result'
          ? 'red'
          : null
        : state.answered === 'correct'
          ? 'green'
          : state.answered === 'wrong'
            ? 'red'
            : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Scoreboard
        teams={state.teams}
        currentIndex={state.turnIndex}
        segment={state.segment}
        currentRound={state.currentRound}
        rounds={state.rounds}
        finalRound={finalRound}
        onRoundsChange={(n) => dispatch({ type: 'SET_ROUNDS', rounds: n })}
        onEnd={() => dispatch({ type: 'END' })}
      />

      {state.segment === 'regular' && state.phase === 'answer' && state.question ? (
        <Question
          key={`${state.currentRound}-${state.turnIndex}-${state.usedQuestionIds.length}`}
          question={state.question}
          teamName={teamLabel(team.captain)}
          teamColor={team.color}
          qNumber={(state.currentRound - 1) * state.teams.length + state.turnIndex + 1}
          qTotal={state.rounds * state.teams.length}
          skipsLeft={team.skipsLeft}
          selected={state.selected}
          revealed={state.revealed}
          onSelect={(index) => dispatch({ type: 'SELECT', index })}
          onReview={() => dispatch({ type: 'REVIEW' })}
          onSkip={() => dispatch({ type: 'SKIP' })}
          onDrop={() => dispatch({ type: 'DROP' })}
          isFinalRound={finalRound}
        />
      ) : (
        <Wall
          phase={state.phase as 'pick' | 'drop' | 'result'}
          segment={state.segment}
          chute={state.chute}
          ballColor={ballColor}
          teamName={teamLabel(team.captain)}
          teamColor={team.color}
          lastDelta={state.lastDelta}
          isFinalRound={finalRound}
          ballsPerTurn={state.ballsPerTurn}
          ballIndex={state.ballIndex}
          turnDeltaTotal={state.turnDeltaTotal}
          onPick={(chute) => dispatch({ type: 'PICK_CHUTE', chute })}
          onDrop={() => dispatch({ type: 'DROP' })}
          onLand={(slot) => dispatch({ type: 'LAND', slot })}
          onNext={() => dispatch({ type: 'NEXT' })}
        />
      )}
    </div>
  );
}

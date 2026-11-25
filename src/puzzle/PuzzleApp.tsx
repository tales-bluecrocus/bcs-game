import { useEffect, useReducer } from 'react';
import Board from './components/Board';
import DoneScreen from './components/DoneScreen';
import PuzzleSetup from './components/Setup';
import TeamBar from './components/TeamBar';
import Tray from './components/Tray';
import { clearPuzzleState, loadPuzzleState, savePuzzleState } from './persistence';
import { initialPuzzleState, puzzleReducer } from './puzzleReducer';

function initState() {
  return loadPuzzleState() ?? initialPuzzleState;
}

export default function PuzzleApp() {
  const [state, dispatch] = useReducer(puzzleReducer, initialPuzzleState, initState);

  useEffect(() => {
    if (state.phase === 'setup') return;
    savePuzzleState(state);
  }, [state]);

  if (state.phase === 'setup') {
    return (
      <PuzzleSetup
        onStart={({ imageDataUrl, gridSize, pieces, teams }) =>
          dispatch({
            type: 'START',
            imageDataUrl,
            gridSize,
            pieces,
            teams,
            startedAt: Date.now(),
          })
        }
      />
    );
  }

  if (state.phase === 'done') {
    return (
      <DoneScreen
        teams={state.teams}
        boards={state.boards}
        onRestart={() => {
          clearPuzzleState();
          dispatch({ type: 'RESTART' });
        }}
      />
    );
  }

  const team = state.teams.find((t) => t.id === state.activeTeamId) ?? state.teams[0];
  const board = state.boards[state.activeTeamId];
  if (!team || !board) {
    return (
      <div className="flex h-screen items-center justify-center text-dim">
        Invalid state —{' '}
        <button
          type="button"
          className="ml-2 underline"
          onClick={() => {
            clearPuzzleState();
            dispatch({ type: 'RESTART' });
          }}
        >
          restart
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TeamBar
        teams={state.teams}
        boards={state.boards}
        activeTeamId={state.activeTeamId}
        onSelect={(teamId) => dispatch({ type: 'SELECT_TEAM', teamId })}
        onReset={() => dispatch({ type: 'RESET_BOARD' })}
        onEnd={() => dispatch({ type: 'END' })}
      />

      <div className="puzzle-table flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        <div className="flex items-center justify-center gap-4">
          {state.imageDataUrl && (
            <div className="hidden shrink-0 sm:block">
              <p className="mb-1 text-center text-[10px] uppercase tracking-wider text-dim">
                Reference
              </p>
              <img
                src={state.imageDataUrl}
                alt="Reference"
                className="h-20 w-20 rounded-md border-2 border-amber-900/60 object-cover shadow-md"
              />
            </div>
          )}
          {state.selected && (
            <p className="rounded-full border border-neon2/40 bg-panel/80 px-4 py-1.5 text-sm text-neon2">
              Piece <strong className="text-txt">{state.selected}</strong> — click a slot (e.g. piece 7 → B2)
            </p>
          )}
        </div>
        <Board
          gridSize={state.gridSize}
          slots={board.slots}
          pieces={state.pieces}
          selected={state.selected}
          complete={board.complete}
          teamColor={team.color}
          onPickPiece={(letter) => dispatch({ type: 'PICK_PIECE', letter })}
          onPlace={(row, col) => dispatch({ type: 'PLACE', row, col })}
        />
      </div>

      <Tray
        tray={board.tray}
        pieces={state.pieces}
        gridSize={state.gridSize}
        selected={state.selected}
        complete={board.complete}
        teamColor={team.color}
        onPick={(letter) => dispatch({ type: 'PICK_PIECE', letter })}
      />
    </div>
  );
}

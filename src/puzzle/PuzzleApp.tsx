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

  useEffect(() => {
    if (state.phase !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'ROTATE' });
      if (e.key === 'c' || e.key === 'C') dispatch({ type: 'CHECK' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase]);

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

  const selectedOnBoard =
    !!state.selected &&
    board.slots.some((row) => row.includes(state.selected));
  const selectedMark = state.selected ? board.marks[state.selected] : undefined;

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

      <div className="puzzle-table flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:p-3">
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
          {state.selected ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="rounded-full border border-neon2/40 bg-panel/80 px-4 py-1.5 text-sm text-neon2">
                Piece <strong className="text-txt">{state.selected}</strong>
                {board.rotations[state.selected]
                  ? ` · ${board.rotations[state.selected]}°`
                  : ''}
                {selectedMark === 'ok' && (
                  <span className="ml-2 text-pgreen">correct</span>
                )}
                {selectedMark === 'bad' && (
                  <span className="ml-2 text-pred">wrong</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ROTATE' })}
                className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm font-medium text-txt hover:border-neon2"
                title="Rotate 90° (R)"
              >
                Rotate ↻
              </button>
              <button
                type="button"
                disabled={!selectedOnBoard}
                onClick={() => dispatch({ type: 'CHECK' })}
                className="rounded-lg border border-pgreen/50 bg-pgreen/15 px-3 py-1.5 text-sm font-medium text-pgreen hover:bg-pgreen/25 disabled:opacity-35"
                title="Check if selected piece is correct (C)"
              >
                Check
              </button>
            </div>
          ) : (
            <p className="text-sm text-dim">Select a piece to move, rotate, or check</p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
          {state.imageDataUrl && (
            <aside className="flex max-h-[34vh] min-h-0 min-w-0 flex-1 flex-col lg:max-h-none lg:max-w-[46%]">
              <p className="mb-1 shrink-0 text-center text-[10px] uppercase tracking-wider text-dim lg:text-left">
                Reference
              </p>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-amber-900/50 bg-black/30 p-2 shadow-lg">
                <img
                  src={state.imageDataUrl}
                  alt="Reference"
                  className="h-full w-full object-contain"
                />
              </div>
            </aside>
          )}

          <div className="flex min-h-0 min-w-0 flex-[1.15] items-center justify-center">
            <Board
              gridSize={state.gridSize}
              slots={board.slots}
              pieces={state.pieces}
              rotations={board.rotations}
              marks={board.marks}
              selected={state.selected}
              complete={board.complete}
              teamColor={team.color}
              onPickPiece={(letter) => dispatch({ type: 'PICK_PIECE', letter })}
              onPlace={(row, col) => dispatch({ type: 'PLACE', row, col })}
            />
          </div>
        </div>
      </div>

      <Tray
        tray={board.tray}
        pieces={state.pieces}
        rotations={board.rotations}
        gridSize={state.gridSize}
        selected={state.selected}
        complete={board.complete}
        teamColor={team.color}
        onPick={(letter) => dispatch({ type: 'PICK_PIECE', letter })}
      />
    </div>
  );
}

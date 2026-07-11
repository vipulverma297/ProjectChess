import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setBoardMode, setViewMoveIndex, resetGame } from '../store/slices/gameSlice';
import { resetRoom } from '../store/slices/roomSlice';
import { resetTimers } from '../store/slices/timerSlice';
import { resetPlayer } from '../store/slices/playerSlice';
import ChessBoard2D from '../components/ChessBoard2D';
import ChessBoard3D from '../components/ChessBoard3D';
import PlayerCard from '../components/PlayerCard';
import MoveHistory from '../components/MoveHistory';
import GameControls from '../components/GameControls';
import MemeCompanion from '../components/MemeCompanion';

const RESULT_LABEL: Record<string, string> = {
  white: '⬜ White wins!',
  black: '⬛ Black wins!',
  draw: '🤝 Draw!',
};

const REASON_LABEL: Record<string, string> = {
  checkmate: 'by checkmate',
  resignation: 'by resignation',
  timeout: 'on time',
  stalemate: '— stalemate',
  agreement: '— by agreement',
  disconnection: '— opponent disconnected',
  insufficient_material: '— insufficient material',
  threefold_repetition: '— threefold repetition',
};

interface GamePageProps {
  mode: '2d' | '3d';
}

const GamePage = ({ mode }: GamePageProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { status, result, reason, moves, boardMode, turn, viewMoveIndex } = useAppSelector((s) => s.game);
  const { playerName, color, opponentName } = useAppSelector((s) => s.player);
  const { roomId } = useAppSelector((s) => s.room);
  const { white: whiteTime, black: blackTime } = useAppSelector((s) => s.timer);

  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  // Sync Redux boardMode with route mode
  useEffect(() => {
    if (boardMode !== mode) {
      dispatch(setBoardMode(mode));
    }
  }, [boardMode, mode, dispatch]);

  // Redirect if no active game
  useEffect(() => {
    if (status === 'idle' && !roomId) navigate('/');
  }, [status, roomId, navigate]);

  const handleStepBack = useCallback(() => {
    const curIdx = viewMoveIndex === null ? moves.length : viewMoveIndex;
    if (curIdx > 0) {
      dispatch(setViewMoveIndex(curIdx - 1));
    }
  }, [moves.length, viewMoveIndex, dispatch]);

  const handleStepForward = useCallback(() => {
    if (viewMoveIndex !== null) {
      const nextIdx = viewMoveIndex + 1;
      if (nextIdx >= moves.length) {
        dispatch(setViewMoveIndex(null));
      } else {
        dispatch(setViewMoveIndex(nextIdx));
      }
    }
  }, [moves.length, viewMoveIndex, dispatch]);

  const handleStepStart = useCallback(() => {
    if (moves.length > 0) {
      dispatch(setViewMoveIndex(0));
    }
  }, [moves.length, dispatch]);

  const handleStepEnd = useCallback(() => {
    dispatch(setViewMoveIndex(null));
  }, [dispatch]);

  const handleBackToHome = () => {
    dispatch(resetGame());
    dispatch(resetRoom());
    dispatch(resetTimers());
    dispatch(resetPlayer());
    localStorage.removeItem('chess_game_state');
    navigate('/');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepBack, handleStepForward]);

  const myColor = color ?? 'w';
  const oppColor = myColor === 'w' ? 'b' : 'w';

  return (
    <div className="game-page">
      {/* Sidebar Left (Desktop only) */}
      <aside className="game-sidebar game-sidebar--left desktop-only">
        {/* Opponent at top */}
        <PlayerCard
          name={opponentName || 'Opponent'}
          color={oppColor}
          isActive={status === 'playing' && turn === oppColor}
          seconds={oppColor === 'w' ? whiteTime : blackTime}
        />

        <MoveHistory moves={moves} />
      </aside>

      {/* Center — Board */}
      <main className="game-main">
        {/* Mobile Opponent Card (Mobile only) */}
        <div className="mobile-player-card mobile-player-card--top mobile-only">
          <PlayerCard
            name={opponentName || 'Opponent'}
            color={oppColor}
            isActive={status === 'playing' && turn === oppColor}
            seconds={oppColor === 'w' ? whiteTime : blackTime}
          />
        </div>

        <div className="board-wrapper">
          {mode === '2d' ? <ChessBoard2D /> : <ChessBoard3D />}
        </div>

        {/* Mobile Player Card (Mobile only) */}
        <div className="mobile-player-card mobile-player-card--bottom mobile-only">
          <PlayerCard
            name={playerName || 'You'}
            color={myColor}
            isActive={status === 'playing' && turn === myColor}
            seconds={myColor === 'w' ? whiteTime : blackTime}
          />
        </div>

        {/* Game Over Overlay */}
        {status === 'over' && result && (
          <div className="game-over-overlay">
            <div className="game-over-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <h2 className="game-over__result" style={{ margin: 0 }}>{RESULT_LABEL[result]}</h2>
              <p className="game-over__reason" style={{ margin: 0 }}>{REASON_LABEL[reason ?? ''] ?? ''}</p>
              <button
                className="btn btn--primary"
                style={{ marginTop: '8px', minWidth: '160px' }}
                onClick={handleBackToHome}
              >
                🏠 Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Waiting overlay */}
        {status === 'waiting' && (
          <div className="waiting-overlay">
            <div className="spinner spinner--large" />
            <p>Waiting for opponent to join…</p>
            <p className="waiting-code">Room: <strong>{roomId}</strong></p>
          </div>
        )}
      </main>

      {/* Sidebar Right (Desktop only) */}
      <aside className="game-sidebar game-sidebar--right desktop-only">
        {/* Me at bottom */}
        <PlayerCard
          name={playerName || 'You'}
          color={myColor}
          isActive={status === 'playing' && turn === myColor}
          seconds={myColor === 'w' ? whiteTime : blackTime}
        />
        <GameControls showDrawControls />
      </aside>

      {/* Mobile Bottom Bar (Mobile only) */}
      <div className="mobile-bottom-bar mobile-only">
        <div className="mobile-nav-buttons">
          <button className="btn btn--secondary btn--sm" onClick={handleStepStart} disabled={moves.length === 0} title="First Move">⏮</button>
          <button className="btn btn--secondary btn--sm" onClick={handleStepBack} disabled={moves.length === 0} title="Previous Move">◀</button>
          <button className="btn btn--secondary btn--sm" onClick={handleStepForward} disabled={viewMoveIndex === null} title="Next Move">▶</button>
          <button className="btn btn--secondary btn--sm" onClick={handleStepEnd} disabled={viewMoveIndex === null} title="Current Position">⏭</button>
        </div>
        <div className="mobile-action-buttons">
          <button className="btn btn--primary btn--sm" onClick={() => { setShowMobileHistory(true); setShowMobileOptions(false); }}>📋 History</button>
          <button className="btn btn--secondary btn--sm" onClick={() => { setShowMobileOptions(!showMobileOptions); setShowMobileHistory(false); }}>⚙️ Options</button>
        </div>
      </div>

      {/* Mobile Options Modal/Overlay */}
      {showMobileOptions && (
        <div className="mobile-modal-overlay" onClick={() => setShowMobileOptions(false)}>
          <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-card__header">
              <h3>Game Options</h3>
              <button className="mobile-modal-card__close" onClick={() => setShowMobileOptions(false)}>✕</button>
            </div>
            <div className="mobile-modal-card__body" onClick={() => setShowMobileOptions(false)}>
              <GameControls showDrawControls />
            </div>
          </div>
        </div>
      )}

      {/* Mobile History Drawer/Overlay */}
      {showMobileHistory && (
        <div className="mobile-modal-overlay" onClick={() => setShowMobileHistory(false)}>
          <div className="mobile-modal-card mobile-modal-card--history" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-card__header">
              <h3>Move History</h3>
              <button className="mobile-modal-card__close" onClick={() => setShowMobileHistory(false)}>✕</button>
            </div>
            <div className="mobile-modal-card__body">
              <MoveHistory moves={moves} />
            </div>
          </div>
        </div>
      )}

      <MemeCompanion />
    </div>
  );
};

export default GamePage;

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setPlayerName, resetPlayer } from '../store/slices/playerSlice';
import { createAIGame, setAiLevel, setTimeControl, resetRoom } from '../store/slices/roomSlice';
import { setBoardMode, setViewMoveIndex, resetGame } from '../store/slices/gameSlice';
import { resetTimers } from '../store/slices/timerSlice';
import ChessBoard2D from '../components/ChessBoard2D';
import ChessBoard3D from '../components/ChessBoard3D';
import PlayerCard from '../components/PlayerCard';
import MoveHistory from '../components/MoveHistory';
import GameControls from '../components/GameControls';
import MemeCompanion from '../components/MemeCompanion';
import type { TimeControl } from '../types/chess';

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
  insufficient_material: '— insufficient material',
};

const LEVELS = [
  { range: [0, 3],   label: 'Beginner',     emoji: '🐣' },
  { range: [4, 8],   label: 'Intermediate', emoji: '🧑' },
  { range: [9, 14],  label: 'Advanced',     emoji: '🎓' },
  { range: [15, 18], label: 'Expert',       emoji: '🏆' },
  { range: [19, 20], label: 'Master',       emoji: '👑' },
];

function getLabel(level: number) {
  return LEVELS.find(({ range: [lo, hi] }) => level >= lo && level <= hi) ?? LEVELS[0];
}

const TIME_LABELS: Record<TimeControl, string> = {
  bullet: '🔴 1 min',
  blitz:  '🟡 5 min',
  rapid:  '🟢 10 min',
  unlimited: '⚪ ∞',
};

interface AIGamePageProps {
  mode: 'setup' | '2d' | '3d';
}

const AIGamePage = ({ mode }: AIGamePageProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, result, reason, moves, boardMode, turn, viewMoveIndex } = useAppSelector((s) => s.game);
  const { playerName, color, opponentName } = useAppSelector((s) => s.player);
  const { roomId, aiLevel, timeControl } = useAppSelector((s) => s.room);
  const { white: whiteTime, black: blackTime } = useAppSelector((s) => s.timer);

  const [localName, setLocalName] = useState(playerName || '');
  const [nameError, setNameError] = useState('');

  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const myColor = color ?? 'w';
  const oppColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';

  const levelInfo = getLabel(aiLevel);

  // Sync Redux boardMode with route mode
  useEffect(() => {
    if ((mode === '2d' || mode === '3d') && boardMode !== mode) {
      dispatch(setBoardMode(mode));
    }
  }, [boardMode, mode, dispatch]);

  // Redirect setup to active board if playing
  useEffect(() => {
    if (mode === 'setup' && status === 'playing') {
      navigate(`/ai/${boardMode}`);
    }
  }, [mode, status, boardMode, navigate]);

  // Redirect if no active game when on /ai/2d or /ai/3d
  useEffect(() => {
    if ((mode === '2d' || mode === '3d') && status === 'idle' && !roomId) {
      navigate('/');
    }
  }, [mode, status, roomId, navigate]);

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

  const handleStart = () => {
    const trimmed = localName.trim();
    if (!trimmed) {
      console.warn('[AIGamePage] handleStart blocked: name is empty');
      return setNameError('Enter your name to start.');
    }
    if (trimmed.length <= 3) {
      return setNameError('Name must be more than 3 characters.');
    }
    if (trimmed.length > 10) {
      return setNameError('Name must not be more than 10 characters.');
    }
    setNameError('');
    dispatch(setPlayerName(trimmed));
    dispatch(createAIGame({ playerName: trimmed, aiLevel, timeControl }));
  };

  // Setup screen
  if (mode === 'setup') {
    if (status === 'playing') {
      return (
        <div className="page page--ai-setup">
          <div className="ai-setup-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div className="spinner spinner--large" />
            <p style={{ marginTop: '16px' }}>Connecting to game...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="page page--ai-setup">
        <button className="btn btn--ghost back-btn" onClick={() => navigate('/')}>← Back</button>

        <div className="ai-setup-card">
          <h1 className="ai-setup__title">🤖 Play vs Stockfish</h1>

          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              id="input-ai-name"
              className="form-input"
              placeholder="Enter your name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              maxLength={10}
            />
            {nameError && <p className="form-error">{nameError}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              AI Difficulty — <span className="ai-level-badge">{levelInfo.emoji} {levelInfo.label} (Level {aiLevel})</span>
            </label>
            <input
              id="slider-ai-level"
              type="range" min={0} max={20}
              value={aiLevel}
              onChange={(e) => dispatch(setAiLevel(Number(e.target.value)))}
              className="ai-slider"
            />
            <div className="ai-slider-labels">
              <span>Beginner</span><span>Master</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Time Control</label>
            <div className="time-control-grid">
              {(Object.keys(TIME_LABELS) as TimeControl[]).map((tc) => (
                <button
                  key={tc}
                  id={`ai-tc-${tc}`}
                  className={`tc-btn ${timeControl === tc ? 'tc-btn--active' : ''}`}
                  onClick={() => dispatch(setTimeControl(tc))}
                >
                  {TIME_LABELS[tc]}
                </button>
              ))}
            </div>
          </div>

          <button id="btn-start-ai" className="btn btn--primary btn--full" onClick={handleStart}>
            ♟ Start Game
          </button>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="game-page">
      {/* Sidebar Left (Desktop only) */}
      <aside className="game-sidebar game-sidebar--left desktop-only">
        <PlayerCard
          name={opponentName || 'Stockfish'}
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
            name={opponentName || 'Stockfish'}
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
      </main>

      {/* Sidebar Right (Desktop only) */}
      <aside className="game-sidebar game-sidebar--right desktop-only">
        <PlayerCard
          name={playerName || 'You'}
          color={myColor}
          isActive={status === 'playing' && turn === myColor}
          seconds={myColor === 'w' ? whiteTime : blackTime}
        />
        <div className="ai-info-badge">
          {levelInfo.emoji} Stockfish — Level {aiLevel}
        </div>
        <GameControls showDrawControls={false} />
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
              <div className="ai-info-badge" style={{ marginBottom: '12px' }}>
                {levelInfo.emoji} Stockfish — Level {aiLevel}
              </div>
              <GameControls showDrawControls={false} />
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

export default AIGamePage;

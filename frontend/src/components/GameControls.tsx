import { type FC, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { resign, offerDraw, acceptDraw, declineDraw, setBoardMode } from '../store/slices/gameSlice';
import { useNavigate } from 'react-router-dom';


interface GameControlsProps {
  showDrawControls?: boolean;
}

const GameControls: FC<GameControlsProps> = ({ showDrawControls = true }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { roomId, isAI } = useAppSelector((s) => s.room);
  const { status, drawOffered, boardMode } = useAppSelector((s) => s.game);
  const isPlaying = status === 'playing';

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const handleResign = () => {
    setShowResignConfirm(true);
  };

  const handleOfferDraw = () => {
    if (roomId) dispatch(offerDraw({ roomId }));
  };

  const handleAcceptDraw = () => {
    if (roomId) dispatch(acceptDraw({ roomId }));
  };

  const handleDeclineDraw = () => {
    if (roomId) dispatch(declineDraw({ roomId }));
  };

  const toggle3D = () => {
    const nextMode = boardMode === '2d' ? '3d' : '2d';
    dispatch(setBoardMode(nextMode));
    if (isAI) {
      navigate(`/ai/${nextMode}`);
    } else {
      navigate(`/game/${nextMode}`);
    }
  };

  return (
    <div className="game-controls">
      <button
        id="btn-toggle-3d"
        className="btn btn--secondary"
        onClick={toggle3D}
        title="Toggle 2D/3D view"
      >
        {boardMode === '2d' ? '🎮 3D View' : '♟ 2D View'}
      </button>

      {isPlaying && (
        <>
          <button id="btn-resign" className="btn btn--danger" onClick={handleResign}>
            🏳 Resign
          </button>

          {showDrawControls && !isAI && (
            <button id="btn-offer-draw" className="btn btn--secondary" onClick={handleOfferDraw}>
              🤝 Offer Draw
            </button>
          )}
        </>
      )}

      {drawOffered && !isAI && (
        <div className="draw-offer">
          <p>Opponent offers a draw</p>
          <div className="draw-offer__btns">
            <button id="btn-accept-draw" className="btn btn--success" onClick={handleAcceptDraw}>
              Accept
            </button>
            <button id="btn-decline-draw" className="btn btn--danger" onClick={handleDeclineDraw}>
              Decline
            </button>
          </div>
        </div>
      )}

      {showResignConfirm && (
        <div className="mobile-modal-overlay" style={{ zIndex: 300 }} onClick={() => setShowResignConfirm(false)}>
          <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ color: 'var(--red)', fontSize: '1.25rem', margin: 0 }}>🏳 Confirm Resignation</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to resign this match?</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn--danger" style={{ flex: 1 }} onClick={() => {
                if (roomId) dispatch(resign({ roomId }));
                setShowResignConfirm(false);
              }}>Yes, Resign</button>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setShowResignConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameControls;

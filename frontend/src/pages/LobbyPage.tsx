import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Lobby from '../components/Lobby';
import { useAppSelector } from '../store/store';

const LobbyPage = () => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const navigate = useNavigate();
  const { status: gameStatus, boardMode } = useAppSelector((s) => s.game);

  // Wrap navigation inside useEffect to avoid updating Router during render phase
  useEffect(() => {
    if (gameStatus === 'playing') {
      navigate(`/game/${boardMode}`);
    }
  }, [gameStatus, boardMode, navigate]);

  return (
    <div className="page page--lobby">
      <button className="btn btn--ghost back-btn" onClick={() => navigate('/')}>
        ← Back
      </button>

      {/* Mode toggle */}
      <div className="lobby-tabs">
        <button
          id="tab-create"
          className={`lobby-tab ${mode === 'create' ? 'lobby-tab--active' : ''}`}
          onClick={() => setMode('create')}
        >
          Create Game
        </button>
        <button
          id="tab-join"
          className={`lobby-tab ${mode === 'join' ? 'lobby-tab--active' : ''}`}
          onClick={() => setMode('join')}
        >
          Join Game
        </button>
      </div>

      <Lobby mode={mode} />
    </div>
  );
};

export default LobbyPage;

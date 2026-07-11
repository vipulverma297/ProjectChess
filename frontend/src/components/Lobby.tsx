import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setPlayerName } from '../store/slices/playerSlice';
import { createGame, joinGame } from '../store/slices/roomSlice';
import type { TimeControl } from '../types/chess';

const TIME_LABELS: Record<TimeControl, string> = {
  bullet: '🔴 Bullet — 1 min',
  blitz:  '🟡 Blitz — 5 min',
  rapid:  '🟢 Rapid — 10 min',
  unlimited: '⚪ Unlimited',
};

interface LobbyProps {
  mode: 'create' | 'join';
}

const Lobby = ({ mode }: LobbyProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { playerName } = useAppSelector((s) => s.player);
  const { roomId: createdRoomId, isHost } = useAppSelector((s) => s.room);

  const [name, setName] = useState(playerName || '');
  const [roomCode, setRoomCode] = useState('');
  const [timeControl, setTimeControl] = useState<TimeControl>('blitz');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { status: gameStatus, boardMode } = useAppSelector((s) => s.game);

  // When game is ready (both players joined), navigate to game room
  useEffect(() => {
    if (gameStatus === 'playing') {
      navigate(`/game/${boardMode}`);
    }
  }, [gameStatus, boardMode, navigate]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter your name.');
    if (trimmed.length <= 3) return setError('Name must be more than 3 characters.');
    if (trimmed.length > 10) return setError('Name must not be more than 10 characters.');
    setError('');
    dispatch(setPlayerName(trimmed));
    dispatch(createGame({ playerName: trimmed, timeControl }));
  };

  const handleJoin = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter your name.');
    if (trimmed.length <= 3) return setError('Name must be more than 3 characters.');
    if (trimmed.length > 10) return setError('Name must not be more than 10 characters.');
    if (!roomCode.trim()) return setError('Please enter the room code.');
    setError('');
    dispatch(setPlayerName(trimmed));
    dispatch(joinGame({ roomId: roomCode.trim().toUpperCase(), playerName: trimmed }));
  };

  const copyCode = async () => {
    if (createdRoomId) {
      await navigator.clipboard.writeText(createdRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby__card">
        <h2 className="lobby__title">
          {mode === 'create' ? '🎮 Create Game' : '🚪 Join Game'}
        </h2>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Your Name</label>
          <input
            id="input-player-name"
            className="form-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={10}
          />
        </div>

        {/* Time control (create only) */}
        {mode === 'create' && (
          <div className="form-group">
            <label className="form-label">Time Control</label>
            <div className="time-control-grid">
              {(Object.keys(TIME_LABELS) as TimeControl[]).map((tc) => (
                <button
                  key={tc}
                  id={`tc-${tc}`}
                  className={`tc-btn ${timeControl === tc ? 'tc-btn--active' : ''}`}
                  onClick={() => setTimeControl(tc)}
                >
                  {TIME_LABELS[tc]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Room code input (join) */}
        {mode === 'join' && (
          <div className="form-group">
            <label className="form-label">Room Code</label>
            <input
              id="input-room-code"
              className="form-input form-input--mono"
              placeholder="E.g. AB12CD"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {/* Action button */}
        {!createdRoomId || !isHost ? (
          <button
            id={mode === 'create' ? 'btn-create-game' : 'btn-join-game'}
            className="btn btn--primary btn--full"
            onClick={mode === 'create' ? handleCreate : handleJoin}
          >
            {mode === 'create' ? 'Create Room' : 'Join Game'}
          </button>
        ) : (
          /* Room created — waiting for opponent */
          <div className="room-created">
            <p className="room-created__label">Share this code with your friend:</p>
            <div className="room-created__code" id="room-code-display">
              {createdRoomId}
            </div>
            <button id="btn-copy-code" className="btn btn--secondary" onClick={copyCode}>
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <div className="waiting-spinner">
              <div className="spinner" />
              <span>Waiting for opponent…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;

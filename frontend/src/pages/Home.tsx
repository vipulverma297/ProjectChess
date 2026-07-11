import { useNavigate } from 'react-router-dom';

const FLOATING_PIECES = ['♟', '♜', '♞', '♝', '♛', '♚', '♙', '♖', '♘', '♗', '♕', '♔'];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* Floating chess pieces background */}
      <div className="home__bg" aria-hidden>
        {FLOATING_PIECES.map((p, i) => (
          <span
            key={i}
            className="home__floating-piece"
            style={{
              left: `${(i * 8.3) % 100}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${6 + (i % 4)}s`,
              fontSize: `${2 + (i % 3)}rem`,
              opacity: 0.06 + (i % 4) * 0.015,
            }}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Hero */}
      <div className="home__hero">
        <div className="home__logo" aria-label="Chess King icon">♚</div>
        <h1 className="home__title">
          <span className="home__title-gradient">ProjectChess</span>
        </h1>
        <p className="home__subtitle">
          Play real-time chess with friends or challenge Stockfish AI.<br />
          2D & 3D boards. Bullet, Blitz, Rapid.
        </p>

        <div className="home__actions">
          <button
            id="btn-play-online"
            className="btn btn--primary btn--xl"
            onClick={() => navigate('/lobby')}
          >
            🌐 Play Online
            <span className="btn__sub">vs a friend</span>
          </button>

          <button
            id="btn-play-ai"
            className="btn btn--secondary btn--xl"
            onClick={() => navigate('/ai')}
          >
            🤖 Play vs AI
            <span className="btn__sub">Stockfish engine</span>
          </button>
        </div>

        <div className="home__features">
          <div className="home__feature">
            <span>⚡</span>
            <p>Real-time multiplayer via WebSockets</p>
          </div>
          <div className="home__feature">
            <span>🎮</span>
            <p>Switchable 2D &amp; 3D board</p>
          </div>
          <div className="home__feature">
            <span>🧠</span>
            <p>Stockfish AI — 20 difficulty levels</p>
          </div>
          <div className="home__feature">
            <span>⏱</span>
            <p>Bullet · Blitz · Rapid · Unlimited</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

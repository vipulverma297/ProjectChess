import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { clearMeme } from '../store/slices/gameSlice';
import { playMemeLaughSound } from '../utils/chessAudio';

const MemeCompanion = () => {
  const dispatch = useAppDispatch();
  const activeMeme = useAppSelector((s) => s.game.activeMeme);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!activeMeme || isHovered) return;

    const timer = setTimeout(() => {
      dispatch(clearMeme());
    }, 9000);

    return () => clearTimeout(timer);
  }, [activeMeme, isHovered, dispatch]);

  useEffect(() => {
    if (activeMeme) {
      const title = activeMeme.title.toLowerCase();
      // Play funny synthesized chuckle for standard jokes, facts, and opening theory popups
      if (
        title.includes('big brain') ||
        title.includes('plan') ||
        title.includes('tactics') ||
        title.includes('did you know') ||
        title.includes('sicilian') ||
        title.includes('french') ||
        title.includes('caro-kann') ||
        title.includes('ruy lopez') ||
        title.includes('queens gambit') ||
        title.includes('italian')
      ) {
        playMemeLaughSound();
      }
    }
  }, [activeMeme]);

  if (!activeMeme) return null;

  return (
    <div
      className="meme-companion"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="meme-companion__header">
        <span className="meme-companion__tag">🤖 Stockfish Reaction</span>
        <button className="meme-companion__close" onClick={() => dispatch(clearMeme())} title="Close">
          ✕
        </button>
      </div>
      <div className="meme-companion__body">
        <div className="meme-companion__media-wrapper">
          <img src={activeMeme.url} alt={activeMeme.title} className="meme-companion__image" />
        </div>
        <div className="meme-companion__info">
          <h4 className="meme-companion__title">{activeMeme.title}</h4>
          <p className="meme-companion__caption">{activeMeme.caption}</p>
        </div>
      </div>
    </div>
  );
};

export default MemeCompanion;

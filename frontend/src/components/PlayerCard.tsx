import type { FC } from 'react';
import Timer from './Timer';
import type { Color } from '../types/chess';

interface PlayerCardProps {
  name: string;
  color: Color;
  isActive: boolean;
  seconds: number | null;
}

const AVATARS: Record<Color, string> = {
  w: '♔',
  b: '♚',
};

const PlayerCard: FC<PlayerCardProps> = ({ name, color, isActive, seconds }) => (
  <div className={`player-card ${isActive ? 'player-card--active' : ''}`}>
    <div className={`player-card__avatar player-card__avatar--${color}`}>
      {AVATARS[color]}
    </div>
    <div className="player-card__info">
      <span className="player-card__name">{name || 'Waiting…'}</span>
      <span className={`player-card__color-label player-card__color-label--${color}`}>
        {color === 'w' ? 'White' : 'Black'}
      </span>
    </div>
    {isActive && <div className="player-card__pulse" />}
    <Timer seconds={seconds} active={isActive} color={color} />
  </div>
);

export default PlayerCard;

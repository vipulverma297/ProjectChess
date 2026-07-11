import type { FC } from 'react';
import type { Color } from '../types/chess';

interface TimerProps {
  seconds: number | null;
  active: boolean;
  color: Color;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const Timer: FC<TimerProps> = ({ seconds, active, color }) => {
  if (seconds === null) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 10;

  return (
    <div className={`timer ${active ? 'timer--active' : ''} ${isLow ? 'timer--low' : ''} timer--${color}`}>
      <span className="timer__digits">
        {pad(mins)}:{pad(secs)}
      </span>
    </div>
  );
};

export default Timer;

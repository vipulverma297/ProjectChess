import { type FC, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setViewMoveIndex } from '../store/slices/gameSlice';
import type { ChessMove } from '../types/chess';

interface MoveHistoryProps {
  moves: ChessMove[];
}

const MoveHistory: FC<MoveHistoryProps> = ({ moves }) => {
  const dispatch = useAppDispatch();
  const viewMoveIndex = useAppSelector((s) => s.game.viewMoveIndex);
  const listRef = useRef<HTMLDivElement>(null);

  const pairs: [ChessMove, ChessMove | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  // Auto-scroll to bottom when new moves are added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves]);

  const handleMoveClick = (index: number) => {
    dispatch(setViewMoveIndex(index));
  };

  return (
    <div className="move-history">
      <h3 className="move-history__title">Move History</h3>
      <div className="move-history__list" ref={listRef}>
        {pairs.length === 0 && (
          <p className="move-history__empty">No moves yet</p>
        )}
        {pairs.map(([white, black], idx) => {
          const whiteIndex = idx * 2 + 1;
          const blackIndex = idx * 2 + 2;
          const isWhiteActive = viewMoveIndex === whiteIndex;
          const isBlackActive = viewMoveIndex === blackIndex;

          return (
            <div key={idx} className="move-history__row">
              <span className="move-history__num">{idx + 1}.</span>
              <span
                className={`move-history__move move-history__move--white ${isWhiteActive ? 'move-history__move--active' : ''}`}
                onClick={() => handleMoveClick(whiteIndex)}
                title={`View board after move ${whiteIndex}`}
              >
                {white?.san ?? ''}
              </span>
              {black && (
                <span
                  className={`move-history__move move-history__move--black ${isBlackActive ? 'move-history__move--active' : ''}`}
                  onClick={() => handleMoveClick(blackIndex)}
                  title={`View board after move ${blackIndex}`}
                >
                  {black?.san ?? ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MoveHistory;

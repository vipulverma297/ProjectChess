import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useAppDispatch, useAppSelector } from '../store/store';
import { makeMove } from '../store/slices/gameSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

type SquareStr = string; // e.g. 'e2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HIGHLIGHT_MOVE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 32%)',
  borderRadius: '50%',
};
const HIGHLIGHT_CAPTURE: React.CSSProperties = {
  background:
    'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0.18) 75%, transparent 78%)',
};
const HIGHLIGHT_SELECTED: React.CSSProperties = {
  background: 'rgba(170,162,58,0.55)',
};

function pieceEmoji(p: string, color: string) {
  const map: Record<string, [string, string]> = {
    q: ['♛', '♕'], r: ['♜', '♖'], b: ['♝', '♗'], n: ['♞', '♘'],
  };
  return color === 'b' ? map[p]?.[0] : map[p]?.[1];
}

// ─── Component ────────────────────────────────────────────────────────────────

const ChessBoard2D = () => {
  const dispatch = useAppDispatch();
  const { fen, status, viewMoveIndex, moves } = useAppSelector((s) => s.game);
  const { color: playerColor } = useAppSelector((s) => s.player);
  const { roomId } = useAppSelector((s) => s.room);

  const [moveFrom, setMoveFrom] = useState<SquareStr>('');
  const [promotionFrom, setPromotionFrom] = useState<SquareStr>('');
  const [promotionTo, setPromotionTo]     = useState<SquareStr>('');
  const [showPromotion, setShowPromotion] = useState(false);
  const [optionSquares, setOptionSquares] = useState<Record<SquareStr, React.CSSProperties>>({});

  // Compute display FEN for past move if viewing history
  const displayFen = useMemo(() => {
    if (viewMoveIndex === null || viewMoveIndex >= moves.length) {
      return fen;
    }
    const tempGame = new Chess();
    for (let i = 0; i < viewMoveIndex; i++) {
      try {
        tempGame.move(moves[i]);
      } catch (e) {
        console.error('[ChessBoard2D] Error playing history move:', moves[i], e);
      }
    }
    return tempGame.fen();
  }, [fen, moves, viewMoveIndex]);

  // ── Always-fresh chess instance ───────────────────────────────────────────
  const game = useMemo(() => new Chess(displayFen), [displayFen]);

  const isPlaying = status === 'playing';
  const isLatestPosition = viewMoveIndex === null || viewMoveIndex >= moves.length;
  const myTurn = isPlaying && playerColor !== null && game.turn() === playerColor && isLatestPosition;


  // ── Stable Ref to avoid React Chessboard stale closures ───────────────────
  const stateRef = useRef({ moveFrom, playerColor, myTurn, fen: displayFen, roomId });
  
  // Sync state values on every render
  useEffect(() => {
    stateRef.current = { moveFrom, playerColor, myTurn, fen: displayFen, roomId };
  }, [moveFrom, playerColor, myTurn, displayFen, roomId]);

  // ── Build valid-move highlights for a square ──────────────────────────────
  const buildOptionSquares = useCallback((square: SquareStr) => {
    const currentFen = stateRef.current.fen;
    const currentGame = new Chess(currentFen);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moves = currentGame.moves({ square: square as any, verbose: true }) as any[];
      if (!moves.length) return {};

      const newSquares: Record<SquareStr, React.CSSProperties> = {
        [square]: HIGHLIGHT_SELECTED,
      };
      moves.forEach((m) => {
        newSquares[m.to] = currentGame.get(m.to) ? HIGHLIGHT_CAPTURE : HIGHLIGHT_MOVE;
      });
      return newSquares;
    } catch {
      return {};
    }
  }, []);

  // ── Attempt to dispatch a move; return true if legal ─────────────────────
  const tryMove = useCallback((from: SquareStr, to: SquareStr, promotion?: string) => {
    const { fen: currentFen, roomId: currentRoomId } = stateRef.current;
    if (!currentRoomId) {
      console.warn('[ChessBoard2D] tryMove failed: roomId is null or undefined');
      return false;
    }

    const testGame = new Chess(currentFen);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = testGame.move({ from, to, promotion } as any);
      if (!result) {
        console.warn('[ChessBoard2D] testGame.move returned false (illegal move)');
        return false;
      }
    } catch (err: any) {
      console.error('[ChessBoard2D] testGame.move threw error:', err.message || err);
      return false;
    }

    dispatch(makeMove({ roomId: currentRoomId, move: { from, to, promotion } }));
    return true;
  }, [dispatch]);

  // ── Check if a move is a promotion ────────────────────────────────────────
  const isPromotion = useCallback((from: SquareStr, to: SquareStr) => {
    const currentFen = stateRef.current.fen;
    const testGame = new Chess(currentFen);
    const piece = testGame.get(from as Parameters<typeof testGame.get>[0]);
    if (!piece || piece.type !== 'p') return false;
    const toRank = parseInt(to[1]);
    return (piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1);
  }, []);

  // ── Click handler ─────────────────────────────────────────────────────────
  const onSquareClick = useCallback((square: SquareStr) => {
    const { myTurn: currentMyTurn, moveFrom: currentMoveFrom, playerColor: currentPlayerColor, fen: currentFen } = stateRef.current;
    if (!currentMyTurn) {
      return;
    }

    const currentGame = new Chess(currentFen);

    // ── SECOND CLICK (destination) ──────────────────────────────────────
    if (currentMoveFrom) {
      // Clicked the same square → deselect
      if (square === currentMoveFrom) {
        setMoveFrom('');
        setOptionSquares({});
        return;
      }

      // Clicked another own piece → re-select it
      const clickedPiece = currentGame.get(square as Parameters<typeof currentGame.get>[0]);
      if (clickedPiece && clickedPiece.color === currentPlayerColor) {
        const opts = buildOptionSquares(square);
        if (Object.keys(opts).length > 1) {
          setMoveFrom(square);
          setOptionSquares(opts);
        } else {
          setMoveFrom('');
          setOptionSquares({});
        }
        return;
      }

      // Check if square is a legal destination
      const opts = buildOptionSquares(currentMoveFrom);
      const isLegalDest = square in opts && square !== currentMoveFrom;

      if (!isLegalDest) {
        setMoveFrom('');
        setOptionSquares({});
        return;
      }

      // Promotion?
      if (isPromotion(currentMoveFrom, square)) {
        setPromotionFrom(currentMoveFrom);
        setPromotionTo(square);
        setShowPromotion(true);
        setMoveFrom('');
        setOptionSquares({});
        return;
      }

      // Make the move
      tryMove(currentMoveFrom, square);
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    // ── FIRST CLICK (source) ────────────────────────────────────────────
    const piece = currentGame.get(square as Parameters<typeof currentGame.get>[0]);
    if (!piece || piece.color !== currentPlayerColor) {
      return;
    }

    const opts = buildOptionSquares(square);
    // Only select if the piece actually has legal moves
    if (Object.keys(opts).length > 1) {
      setMoveFrom(square);
      setOptionSquares(opts);
    }
  }, [buildOptionSquares, isPromotion, tryMove]);

  // ── Drag-and-drop handler ─────────────────────────────────────────────────
  const onPieceDrop = useCallback((sourceSquare: SquareStr, targetSquare: SquareStr, _piece: string): boolean => {
    const { myTurn: currentMyTurn } = stateRef.current;
    if (!currentMyTurn) return false;

    // Promotion via drag → auto-queen
    if (isPromotion(sourceSquare, targetSquare)) {
      return tryMove(sourceSquare, targetSquare, 'q');
    }
    const ok = tryMove(sourceSquare, targetSquare);
    return ok;
  }, [isPromotion, tryMove]);

  // ── Drag begin → show move options ────────────────────────────────────────
  const onPieceDragBegin = useCallback((_piece: string, square: SquareStr) => {
    const { myTurn: currentMyTurn } = stateRef.current;
    if (!currentMyTurn) return;
    const opts = buildOptionSquares(square);
    setMoveFrom(square);
    setOptionSquares(opts);
  }, [buildOptionSquares]);

  const onPieceDragEnd = useCallback(() => {
    setMoveFrom('');
    setOptionSquares({});
  }, []);

  // ── Promotion choice ──────────────────────────────────────────────────────
  const handlePromotion = (p: string) => {
    tryMove(promotionFrom, promotionTo, p);
    setShowPromotion(false);
    setPromotionFrom('');
    setPromotionTo('');
  };

  const boardOrientation = playerColor === 'b' ? 'black' : 'white';

  return (
    <div className="chessboard-2d" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Chessboard
        options={{
          position: displayFen,
          boardOrientation: boardOrientation,
          squareStyles: optionSquares,
          animationDurationInMs: 180,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          },
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
          allowDragging: myTurn,
          onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
            onPieceDragEnd();
            if (!targetSquare) return false;
            return onPieceDrop(sourceSquare, targetSquare, piece.pieceType);
          },
          onSquareClick: ({ square }) => {
            onSquareClick(square);
          },
          onPieceDrag: ({ piece, square }) => {
            if (square) {
              onPieceDragBegin(piece.pieceType, square);
            }
          }
        }}
      />

      {/* Promotion modal */}
      {showPromotion && (
        <div className="promotion-overlay">
          <div className="promotion-modal">
            <p>Promote pawn to:</p>
            <div className="promotion-pieces">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  id={`promote-${p}`}
                  className="promotion-btn"
                  onClick={() => handlePromotion(p)}
                >
                  {pieceEmoji(p, playerColor ?? 'w')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard2D;

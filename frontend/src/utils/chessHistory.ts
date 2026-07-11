import type { ChessMove, Color } from '../types/chess';

export interface StablePiece {
  id: string; // e.g. 'wP-a2', 'bR-h8'
  type: string; // 'p', 'r', 'n', 'b', 'q', 'k'
  color: Color;
  square: string; // e.g. 'e4'
}

export function getStablePieces(moves: ChessMove[]): StablePiece[] {
  const pieces: Record<string, StablePiece> = {};

  // 1. Initialize Pawns
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    pieces[`wP-${file}2`] = { id: `wP-${file}2`, type: 'p', color: 'w', square: `${file}2` };
    pieces[`bP-${file}7`] = { id: `bP-${file}7`, type: 'p', color: 'b', square: `${file}7` };
  }

  // 2. Initialize Major Pieces
  const setupOthers = (color: Color, rank: string) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const types = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    files.forEach((file, idx) => {
      const id = `${color}${types[idx].toUpperCase()}-${file}${rank}`;
      pieces[id] = { id, type: types[idx], color, square: `${file}${rank}` };
    });
  };
  setupOthers('w', '1');
  setupOthers('b', '8');

  // 3. Replay Moves to update positions
  moves.forEach((m) => {
    // Find the piece that moved
    const movingPiece = Object.values(pieces).find((p) => p.square === m.from);
    if (!movingPiece) return;

    // Remove any captured piece at the destination square
    const capturedPiece = Object.values(pieces).find((p) => p.square === m.to);
    if (capturedPiece) {
      delete pieces[capturedPiece.id];
    } else if (movingPiece.type === 'p' && m.from[0] !== m.to[0]) {
      // En Passant capture: diagonal pawn move to an empty square
      const epSquare = m.to[0] + m.from[1]; // same file as destination, same rank as origin
      const epPiece = Object.values(pieces).find((p) => p.square === epSquare);
      if (epPiece) {
        delete pieces[epPiece.id];
      }
    }

    // Move the piece
    movingPiece.square = m.to;

    // Handle Pawn promotion
    if (m.promotion) {
      movingPiece.type = m.promotion;
    }

    // Handle Castling (move the castling rook)
    if (movingPiece.type === 'k') {
      if (m.from === 'e1' && m.to === 'g1') {
        const rook = Object.values(pieces).find((p) => p.square === 'h1');
        if (rook) rook.square = 'f1';
      } else if (m.from === 'e1' && m.to === 'c1') {
        const rook = Object.values(pieces).find((p) => p.square === 'a1');
        if (rook) rook.square = 'd1';
      } else if (m.from === 'e8' && m.to === 'g8') {
        const rook = Object.values(pieces).find((p) => p.square === 'h8');
        if (rook) rook.square = 'f8';
      } else if (m.from === 'e8' && m.to === 'c8') {
        const rook = Object.values(pieces).find((p) => p.square === 'a8');
        if (rook) rook.square = 'd8';
      }
    }
  });

  return Object.values(pieces);
}

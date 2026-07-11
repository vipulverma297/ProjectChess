// ─── Game Types ───────────────────────────────────────────────────────────────
export type Color = 'w' | 'b';
export type GameStatus = 'idle' | 'waiting' | 'playing' | 'over';
export type BoardMode = '2d' | '3d';
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'unlimited';
export type GameResult = 'white' | 'black' | 'draw';
export type GameReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'agreement'
  | 'disconnection'
  | 'draw';

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san?: string;
  piece?: string;
  captured?: string;
  flags?: string;
  color?: Color;
}

// ─── State Types ──────────────────────────────────────────────────────────────
export interface GameState {
  fen: string;
  pgn: string;
  turn: Color;
  moves: ChessMove[];
  status: GameStatus;
  result: GameResult | null;
  reason: GameReason | null;
  boardMode: BoardMode;
  drawOffered: boolean;
  viewMoveIndex: number | null;
  activeMeme: { url: string; title: string; caption: string } | null;
}

export interface PlayerState {
  playerName: string;
  color: Color | null;
  opponentName: string;
}

export interface RoomState {
  roomId: string | null;
  isHost: boolean;
  isAI: boolean;
  aiLevel: number;
  timeControl: TimeControl;
}

export interface TimerState {
  white: number | null;
  black: number | null;
  running: boolean;
}

// ─── Socket Payload Types ─────────────────────────────────────────────────────
export interface GameCreatedPayload {
  roomId: string;
  color: Color;
  timeControl: TimeControl;
  timers: { white: number | null; black: number | null };
}

export interface GameReadyPayload {
  roomId: string;
  white: string;
  black: string;
  timeControl: TimeControl;
  timers: { white: number | null; black: number | null };
}

export interface AIGameReadyPayload {
  roomId: string;
  color: Color;
  opponentName: string;
  timeControl: TimeControl;
  timers: { white: number | null; black: number | null };
  aiLevel: number;
}

export interface MoveMadePayload {
  move: ChessMove;
  fen: string;
  pgn: string;
}

export interface GameOverPayload {
  result: GameResult;
  reason: GameReason;
}

export interface TimerUpdatePayload {
  white: number;
  black: number;
}

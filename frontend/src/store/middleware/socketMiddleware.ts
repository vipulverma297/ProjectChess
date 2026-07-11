import { io } from 'socket.io-client';
import type { Middleware } from '@reduxjs/toolkit';
import {
  moveMade,
  gameReady,
  setWaiting,
  gameOver,
  drawOfferedByOpponent,
  drawDeclined as drawDeclinedAction,
  gameSynced,
  resetGame,
} from '../slices/gameSlice';
import {
  roomCreated,
  roomJoined,
  aiRoomCreated,
  roomSynced,
  resetRoom,
} from '../slices/roomSlice';
import { setColor, setOpponentName, resetPlayer } from '../slices/playerSlice';
import { initTimers, updateTimers, stopTimers, resetTimers } from '../slices/timerSlice';
import type {
  GameCreatedPayload,
  GameReadyPayload,
  AIGameReadyPayload,
  MoveMadePayload,
  GameOverPayload,
  TimerUpdatePayload,
} from '../../types/chess';

import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playStartSound,
  playGameOverSound,
  playBrilliantSound,
  playBlunderSound,
  playPromotionSound,
  playCastleSound,
  playDrawSound,
} from '../../utils/chessAudio';

const socketUrl = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:3001');
export const socket = io(socketUrl, { autoConnect: false });

// ─── Socket → RTK dispatch bridge ────────────────────────────────────────────
// We attach these once after the store is configured (see store.ts)
let _dispatch: ((action: any) => void) | undefined = undefined;
let _getState: (() => { room: { isHost: boolean } }) | null = null;

export function setGetState(fn: () => { room: { isHost: boolean } }) {
  _getState = fn;
}

export function attachSocketListeners(dispatch: (action: unknown) => void) {
  if (_dispatch) return; // Already attached
  _dispatch = dispatch;
  socket.connect();

  socket.on('connect', () => {
    console.log('[socketMiddleware] Socket connected! ID:', socket.id);
    const state = _getState?.() as any;
    if (state?.room?.roomId && state?.player?.playerName && state?.game?.status !== 'idle' && state?.game?.status !== 'over') {
      console.log('[socketMiddleware] Reconnecting to active game...', state.room.roomId, state.player.playerName);
      socket.emit('reconnect_game', {
        roomId: state.room.roomId,
        playerName: state.player.playerName,
      });
    }
  });

  socket.on('reconnected', (data: {
    roomId: string;
    fen: string;
    pgn: string;
    turn: 'w' | 'b';
    timers: { white: number | null; black: number | null };
    color: 'w' | 'b';
    opponentName: string;
    isAI: boolean;
    aiLevel?: number;
    timeControl?: any;
    isHost: boolean;
    moves: any[];
  }) => {
    console.log('[socketMiddleware] Successfully reconnected to game:', data);
    dispatch(roomSynced({
      roomId: data.roomId,
      isHost: data.isHost,
      isAI: data.isAI,
      aiLevel: data.aiLevel ?? 10,
      timeControl: data.timeControl ?? 'blitz',
    }));
    dispatch(setColor(data.color));
    dispatch(setOpponentName(data.opponentName));
    dispatch(initTimers({ white: data.timers.white, black: data.timers.black }));
    dispatch(gameSynced({ fen: data.fen, pgn: data.pgn, moves: data.moves }));
  });

  socket.on('game_created', (data: GameCreatedPayload) => {
    console.log('[socketMiddleware] Received "game_created" event:', JSON.stringify(data));
    dispatch(roomCreated({ roomId: data.roomId, timeControl: data.timeControl }));
    dispatch(setColor('w'));
    dispatch(initTimers({ white: data.timers.white, black: data.timers.black }));
    dispatch(setWaiting());
  });

  socket.on('game_ready', (data: GameReadyPayload) => {
    console.log('[socketMiddleware] Received "game_ready" event:', JSON.stringify(data));
    // We need to know if we are host (white) or joiner (black).
    // The host already has their color set to 'w' from game_created.
    // The joiner has no color set yet — use that as the signal.
    //
    // This runs after _dispatch is set, so we can read from the store.
    // We pass getState via closure below (set after attachSocketListeners returns).
    const state = _getState?.();
    const isHost = state?.room?.isHost ?? false;

    if (!isHost) {
      // Joiner: I am black, opponent is white
      dispatch(setColor('b'));
      dispatch(setOpponentName(data.white));
      dispatch(roomJoined({ roomId: data.roomId, timeControl: data.timeControl }));
    } else {
      // Host: I am white (already set), opponent is black
      dispatch(setOpponentName(data.black));
    }

    dispatch(initTimers({ white: data.timers.white, black: data.timers.black }));
    dispatch(gameReady());
    playStartSound();
  });

  socket.on('ai_game_ready', (data: AIGameReadyPayload) => {
    console.log('[socketMiddleware] Received "ai_game_ready" event:', JSON.stringify(data));
    dispatch(aiRoomCreated({ roomId: data.roomId, aiLevel: data.aiLevel, timeControl: data.timeControl }));
    dispatch(setColor('w'));
    dispatch(setOpponentName(data.opponentName));
    dispatch(initTimers({ white: data.timers.white, black: data.timers.black }));
    dispatch(gameReady());
    playStartSound();
  });

  socket.on('move_made', (data: MoveMadePayload) => {
    console.log('[socketMiddleware] Received "move_made" event:', JSON.stringify(data));

    const state = _getState?.() as any;
    const myColor = state?.player?.color;
    dispatch(moveMade({
      ...data,
      isMyMove: data.move.color === myColor,
    }));

    // Play synthesized sound depending on the chess event
    if (data.move.captured === 'q') {
      if (data.move.color === myColor) {
        playBrilliantSound();
      } else {
        playBlunderSound();
      }
    } else if (data.move.promotion) {
      playPromotionSound();
    } else if (data.move.flags?.includes('k') || data.move.flags?.includes('q')) {
      playCastleSound();
    } else if (data.move.san?.includes('+') || data.move.san?.includes('#')) {
      playCheckSound();
    } else if (data.move.captured) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  });

  socket.on('timer_update', (data: TimerUpdatePayload) => {
    // Only log timer updates occasionally to prevent flooding
    if (data.white % 5 === 0 || data.black % 5 === 0) {
      console.log('[socketMiddleware] Received "timer_update" event:', JSON.stringify(data));
    }
    dispatch(updateTimers(data));
  });

  socket.on('game_over', (data: GameOverPayload) => {
    console.log('[socketMiddleware] Received "game_over" event:', JSON.stringify(data));
    dispatch(stopTimers());
    dispatch(gameOver(data));

    if (data.result === 'draw') {
      playDrawSound();
    } else {
      playGameOverSound();
    }
  });

  socket.on('draw_offered', () => {
    console.log('[socketMiddleware] Received "draw_offered" event');
    dispatch(drawOfferedByOpponent());
  });

  socket.on('draw_declined', () => {
    console.log('[socketMiddleware] Received "draw_declined" event');
    dispatch(drawDeclinedAction());
  });

  socket.on('opponent_disconnected', () => {
    // Shown in UI via game status — server will emit game_over after grace period
  });

  socket.on('invalid_move', (data: { error: string }) => {
    console.error('[Socket] Server rejected move:', data.error);
  });

  socket.on('join_error', (data: { message: string }) => {
    console.error('[Socket] Server join error:', data.message);
    const state = _getState?.() as any;
    if (state?.game?.status !== 'idle') {
      alert(`Connection lost: ${data.message}`);
      dispatch(resetRoom());
      dispatch(resetGame());
      dispatch(resetTimers());
      dispatch(resetPlayer());
      localStorage.removeItem('chess_game_state');
      window.location.href = '/';
    }
  });
}

// ─── RTK → Socket emit bridge ─────────────────────────────────────────────────
const EMIT_MAP: Record<string, string> = {
  'room/createGame':   'create_game',
  'room/joinGame':     'join_game',
  'room/createAIGame': 'create_ai_game',
  'game/makeMove':     'make_move',
  'game/resign':       'resign',
  'game/offerDraw':    'offer_draw',
  'game/acceptDraw':   'accept_draw',
  'game/declineDraw':  'decline_draw',
};

export const socketMiddleware: Middleware = () => (next) => (action) => {
  const a = action as { type: string; payload?: unknown };
  const event = EMIT_MAP[a.type];
  
  if (event) {
    console.log('[socketMiddleware] Intercepted action:', a.type, 'Event:', event, 'Socket connected:', socket.connected, 'Payload:', JSON.stringify(a.payload));
    if (socket.connected) {
      socket.emit(event, a.payload);
      console.log('[socketMiddleware] Emitted event:', event);
    } else {
      console.warn('[socketMiddleware] Failed to emit because socket is disconnected!');
    }
  }
  return next(action);
};

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import gameReducer from './slices/gameSlice';
import playerReducer from './slices/playerSlice';
import roomReducer from './slices/roomSlice';
import timerReducer from './slices/timerSlice';
import { socketMiddleware, attachSocketListeners, setGetState } from './middleware/socketMiddleware';

// ─── Load state from localStorage on init ─────────────────────────────────────
const getPreloadedState = () => {
  try {
    const serializedState = localStorage.getItem('chess_game_state');
    if (serializedState === null) return undefined;
    const parsed = JSON.parse(serializedState);
    if (parsed.timer) {
      parsed.timer.running = false; // pause timers until socket re-syncs
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const preloadedState = getPreloadedState();

export const store = configureStore({
  reducer: {
    game: gameReducer,
    player: playerReducer,
    room: roomReducer,
    timer: timerReducer,
  },
  preloadedState: preloadedState as any,
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware().concat(socketMiddleware as any),
} as any);

// ─── Save state to localStorage on state changes ──────────────────────────────
store.subscribe(() => {
  const state = store.getState();
  if (state.game.status !== 'idle' && state.room.roomId) {
    const stateToPersist = {
      game: state.game,
      player: state.player,
      room: state.room,
      timer: state.timer,
    };
    localStorage.setItem('chess_game_state', JSON.stringify(stateToPersist));
  } else {
    localStorage.removeItem('chess_game_state');
  }
});

// Attach socket → dispatch listeners after store is created
attachSocketListeners(store.dispatch);
// Give socket middleware read access to room state (needed for host/joiner detection)
setGetState(store.getState as any);

// ─── Typed hooks ──────────────────────────────────────────────────────────────
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

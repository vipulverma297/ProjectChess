import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TimerState } from '../../types/chess';

const initialState: TimerState = {
  white: null,
  black: null,
  running: false,
};

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    initTimers(state, action: PayloadAction<{ white: number | null; black: number | null }>) {
      state.white = action.payload.white;
      state.black = action.payload.black;
      state.running = false;
    },
    updateTimers(state, action: PayloadAction<{ white: number; black: number }>) {
      state.white = action.payload.white;
      state.black = action.payload.black;
      state.running = true;
    },
    stopTimers(state) {
      state.running = false;
    },
    resetTimers() {
      return { ...initialState };
    },
  },
});

export const { initTimers, updateTimers, stopTimers, resetTimers } = timerSlice.actions;
export default timerSlice.reducer;

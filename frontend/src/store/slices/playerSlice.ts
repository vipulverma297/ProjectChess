import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PlayerState, Color } from '../../types/chess';

const initialState: PlayerState = {
  playerName: '',
  color: null,
  opponentName: '',
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPlayerName(state, action: PayloadAction<string>) {
      state.playerName = action.payload;
    },
    setColor(state, action: PayloadAction<Color>) {
      state.color = action.payload;
    },
    setOpponentName(state, action: PayloadAction<string>) {
      state.opponentName = action.payload;
    },
    resetPlayer() {
      return { ...initialState };
    },
  },
});

export const { setPlayerName, setColor, setOpponentName, resetPlayer } = playerSlice.actions;
export default playerSlice.reducer;

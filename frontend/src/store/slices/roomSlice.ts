import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RoomState, TimeControl } from '../../types/chess';

const initialState: RoomState = {
  roomId: null,
  isHost: false,
  isAI: false,
  aiLevel: 10,
  timeControl: 'blitz',
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    roomCreated(
      state,
      action: PayloadAction<{ roomId: string; timeControl: TimeControl }>
    ) {
      state.roomId = action.payload.roomId;
      state.timeControl = action.payload.timeControl;
      state.isHost = true;
      state.isAI = false;
    },
    roomJoined(
      state,
      action: PayloadAction<{ roomId: string; timeControl: TimeControl }>
    ) {
      state.roomId = action.payload.roomId;
      state.timeControl = action.payload.timeControl;
      state.isHost = false;
      state.isAI = false;
    },
    aiRoomCreated(
      state,
      action: PayloadAction<{ roomId: string; aiLevel: number; timeControl: TimeControl }>
    ) {
      state.roomId = action.payload.roomId;
      state.aiLevel = action.payload.aiLevel;
      state.timeControl = action.payload.timeControl;
      state.isHost = true;
      state.isAI = true;
    },
    roomSynced(
      state,
      action: PayloadAction<{ roomId: string; isHost: boolean; isAI: boolean; aiLevel: number; timeControl: TimeControl }>
    ) {
      state.roomId = action.payload.roomId;
      state.isHost = action.payload.isHost;
      state.isAI = action.payload.isAI;
      state.aiLevel = action.payload.aiLevel;
      state.timeControl = action.payload.timeControl;
    },
    setAiLevel(state, action: PayloadAction<number>) {
      state.aiLevel = action.payload;
    },
    setTimeControl(state, action: PayloadAction<TimeControl>) {
      state.timeControl = action.payload;
    },

    // Socket-emitting actions (intercepted by middleware)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createGame(_state, _action: PayloadAction<{ playerName: string; timeControl: TimeControl }>) {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    joinGame(_state, _action: PayloadAction<{ roomId: string; playerName: string }>) {},
    createAIGame(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _state,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _action: PayloadAction<{ playerName: string; aiLevel: number; timeControl: TimeControl }>
    ) {},

    resetRoom() {
      return { ...initialState };
    },
  },
});

export const {
  roomCreated,
  roomJoined,
  aiRoomCreated,
  roomSynced,
  setAiLevel,
  setTimeControl,
  createGame,
  joinGame,
  createAIGame,
  resetRoom,
} = roomSlice.actions;

export default roomSlice.reducer;

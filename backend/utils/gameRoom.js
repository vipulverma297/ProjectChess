const { Chess } = require('chess.js');
const { randomUUID } = require('crypto');
const StockfishEngine = require('../engine/stockfish');

const rooms = new Map();

const TIME_SECONDS = {
  bullet: 60,
  blitz: 300,
  rapid: 600,
  unlimited: null,
};

function generateRoomId() {
  return randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function createRoom(playerName, socketId, timeControl = 'blitz') {
  const roomId = generateRoomId();
  const timeSecs = TIME_SECONDS[timeControl] ?? null;

  const room = {
    id: roomId,
    chess: new Chess(),
    players: {
      w: { name: playerName, socketId, connected: true },
      b: null,
    },
    timers: {
      w: timeSecs,
      b: timeSecs,
    },
    timeControl,
    timerInterval: null,
    status: 'waiting', // 'waiting' | 'playing' | 'over'
    isAI: false,
    aiEngine: null,
    aiLevel: 10,
  };

  rooms.set(roomId, room);
  return room;
}

function createAIRoom(playerName, socketId, aiLevel = 10, timeControl = 'blitz') {
  const roomId = 'AI' + generateRoomId();
  const timeSecs = TIME_SECONDS[timeControl] ?? null;

  const room = {
    id: roomId,
    chess: new Chess(),
    players: {
      w: { name: playerName, socketId, connected: true },
      b: { name: `Stockfish Lv${aiLevel}`, socketId: null, connected: true },
    },
    timers: {
      w: timeSecs,
      b: timeSecs,
    },
    timeControl,
    timerInterval: null,
    status: 'playing',
    isAI: true,
    aiEngine: new StockfishEngine(),
    aiLevel,
  };

  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.aiEngine) room.aiEngine.quit();
    rooms.delete(roomId);
  }
}

module.exports = { rooms, createRoom, createAIRoom, getRoom, deleteRoom };

const { Chess } = require('chess.js');
const { createRoom, createAIRoom, getRoom, deleteRoom, rooms } = require('../utils/gameRoom');

// ─── Timer ────────────────────────────────────────────────────────────────────

function startTimer(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.timeControl === 'unlimited') return;
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    const color = room.chess.turn();
    if (room.timers[color] === null) return;

    room.timers[color]--;

    io.to(roomId).emit('timer_update', {
      white: room.timers.w,
      black: room.timers.b,
    });

    if (room.timers[color] <= 0) {
      clearInterval(room.timerInterval);
      room.status = 'over';
      const winner = color === 'w' ? 'black' : 'white';
      io.to(roomId).emit('game_over', { result: winner, reason: 'timeout' });
      deleteRoom(roomId);
    }
  }, 1000);
}

// ─── AI move ─────────────────────────────────────────────────────────────────

async function handleAIMove(io, room) {
  if (!room.aiEngine || room.status !== 'playing') return;

  try {
    const fen = room.chess.fen();
    const moveTime = Math.max(400, room.aiLevel * 80);
    const aiMove = await room.aiEngine.getBestMove(fen, room.aiLevel, moveTime);

    if (!aiMove || room.status !== 'playing') return;

    const result = room.chess.move(aiMove);
    if (!result) return;

    io.to(room.id).emit('move_made', {
      move: result,
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
    });

    if (room.chess.isGameOver()) {
      room.status = 'over';
      if (room.timerInterval) clearInterval(room.timerInterval);
      const { result: res, reason } = resolveGameOver(room.chess);
      io.to(room.id).emit('game_over', { result: res, reason });
      deleteRoom(room.id);
    }
  } catch (err) {
    console.error('[AI] Move error:', err.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveGameOver(chess) {
  if (chess.isCheckmate())
    return { result: chess.turn() === 'w' ? 'black' : 'white', reason: 'checkmate' };
  if (chess.isStalemate()) return { result: 'draw', reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient_material' };
  if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'threefold_repetition' };
  return { result: 'draw', reason: 'draw' };
}

function isValidName(name) {
  if (!name) return false;
  const len = name.trim().length;
  return len >= 4 && len <= 10;
}

// ─── Handler setup ────────────────────────────────────────────────────────────

function setupGameHandlers(io, socket) {
  // ── Create online game ──────────────────────────────────────────────────────
  socket.on('create_game', ({ playerName, timeControl }) => {
    if (!isValidName(playerName)) {
      return socket.emit('join_error', { message: 'Player name must be 4 to 10 characters.' });
    }
    const room = createRoom(playerName, socket.id, timeControl || 'blitz');
    socket.join(room.id);
    socket.emit('game_created', {
      roomId: room.id,
      color: 'w',
      timeControl: room.timeControl,
      timers: { white: room.timers.w, black: room.timers.b },
    });
    console.log(`[+] Room ${room.id} created by ${playerName}`);
  });

  // ── Join online game ────────────────────────────────────────────────────────
  socket.on('join_game', ({ roomId, playerName }) => {
    if (!isValidName(playerName)) {
      return socket.emit('join_error', { message: 'Player name must be 4 to 10 characters.' });
    }
    const room = getRoom(roomId.toUpperCase());
    if (!room) return socket.emit('join_error', { message: 'Room not found. Check the code and try again.' });
    if (room.isAI) return socket.emit('join_error', { message: 'Cannot join an AI game.' });
    if (room.players.b) return socket.emit('join_error', { message: 'Room is already full.' });
    if (room.status !== 'waiting') return socket.emit('join_error', { message: 'Game has already started.' });

    room.players.b = { name: playerName, socketId: socket.id, connected: true };
    room.status = 'playing';
    socket.join(room.id);

    io.to(room.id).emit('game_ready', {
      roomId: room.id,
      white: room.players.w.name,
      black: room.players.b.name,
      timeControl: room.timeControl,
      timers: { white: room.timers.w, black: room.timers.b },
    });

    startTimer(io, room.id);
    console.log(`[+] ${playerName} joined room ${room.id}`);
  });

  // ── Create AI game ──────────────────────────────────────────────────────────
  socket.on('create_ai_game', ({ playerName, aiLevel, timeControl }) => {
    if (!isValidName(playerName)) {
      return socket.emit('join_error', { message: 'Player name must be 4 to 10 characters.' });
    }
    const level = Math.max(0, Math.min(20, aiLevel ?? 10));
    const room = createAIRoom(playerName, socket.id, level, timeControl || 'blitz');
    socket.join(room.id);
    socket.emit('ai_game_ready', {
      roomId: room.id,
      color: 'w',
      opponentName: room.players.b.name,
      timeControl: room.timeControl,
      timers: { white: room.timers.w, black: room.timers.b },
      aiLevel: level,
    });
    startTimer(io, room.id);
    console.log(`[+] AI room ${room.id} created (level ${level}) by ${playerName}`);
  });

  // ── Make move ───────────────────────────────────────────────────────────────
  socket.on('make_move', async ({ roomId, move }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;

    // Determine who is moving
    const isWhite = room.players.w.socketId === socket.id;
    const isBlack = room.players.b?.socketId === socket.id;
    if (!isWhite && !isBlack) return;

    const playerColor = isWhite ? 'w' : 'b';
    if (playerColor !== room.chess.turn())
      return socket.emit('invalid_move', { error: 'Not your turn' });

    try {
      const result = room.chess.move(move);
      if (!result) return socket.emit('invalid_move', { error: 'Illegal move' });

      io.to(roomId).emit('move_made', {
        move: result,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
      });

      // Check game over after human move
      if (room.chess.isGameOver()) {
        room.status = 'over';
        if (room.timerInterval) clearInterval(room.timerInterval);
        const { result: res, reason } = resolveGameOver(room.chess);
        io.to(roomId).emit('game_over', { result: res, reason });
        deleteRoom(roomId);
        return;
      }

      // AI response
      if (room.isAI) {
        setTimeout(() => handleAIMove(io, room), 400);
      }
    } catch (_) {
      socket.emit('invalid_move', { error: 'Illegal move' });
    }
  });

  // ── Resign ──────────────────────────────────────────────────────────────────
  socket.on('resign', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;

    const isWhite = room.players.w.socketId === socket.id;
    const winner = isWhite ? 'black' : 'white';
    room.status = 'over';

    io.to(roomId).emit('game_over', { result: winner, reason: 'resignation' });
    deleteRoom(roomId);
  });

  // ── Draw offer ──────────────────────────────────────────────────────────────
  socket.on('offer_draw', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.isAI || room.status !== 'playing') return;
    socket.to(roomId).emit('draw_offered');
  });

  socket.on('accept_draw', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    room.status = 'over';
    io.to(roomId).emit('game_over', { result: 'draw', reason: 'agreement' });
    deleteRoom(roomId);
  });

  socket.on('decline_draw', ({ roomId }) => {
    socket.to(roomId).emit('draw_declined');
  });

  // ── Reconnect game ──────────────────────────────────────────────────────────
  socket.on('reconnect_game', ({ roomId, playerName }) => {
    const room = getRoom(roomId.toUpperCase());
    if (!room) return socket.emit('join_error', { message: 'Room not found.' });

    const isWhite = room.players.w.name.trim().toLowerCase() === (playerName || '').trim().toLowerCase();
    const isBlack = room.players.b?.name.trim().toLowerCase() === (playerName || '').trim().toLowerCase();

    if (isWhite) {
      room.players.w.socketId = socket.id;
      room.players.w.connected = true;
      socket.join(room.id);
      
      // Let other players know the opponent reconnected
      socket.to(room.id).emit('opponent_reconnected');

      socket.emit('reconnected', {
        roomId: room.id,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: room.chess.turn(),
        timers: { white: room.timers.w, black: room.timers.b },
        color: 'w',
        opponentName: room.players.b ? room.players.b.name : 'Stockfish',
        isAI: room.isAI,
        aiLevel: room.aiLevel,
        timeControl: room.timeControl,
        isHost: true,
        moves: room.chess.history({ verbose: true }),
      });
      console.log(`[+] ${playerName} reconnected to room ${room.id} as White`);
    } else if (isBlack) {
      room.players.b.socketId = socket.id;
      room.players.b.connected = true;
      socket.join(room.id);
      
      // Let other players know the opponent reconnected
      socket.to(room.id).emit('opponent_reconnected');

      socket.emit('reconnected', {
        roomId: room.id,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: room.chess.turn(),
        timers: { white: room.timers.w, black: room.timers.b },
        color: 'b',
        opponentName: room.players.w.name,
        isAI: room.isAI,
        aiLevel: room.aiLevel,
        timeControl: room.timeControl,
        isHost: false,
        moves: room.chess.history({ verbose: true }),
      });
      console.log(`[+] ${playerName} reconnected to room ${room.id} as Black`);
    } else {
      socket.emit('join_error', { message: 'Player name does not match room records.' });
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const isWhite = room.players.w?.socketId === socket.id;
      const isBlack = room.players.b?.socketId === socket.id;

      if (!isWhite && !isBlack) return;

      if (room.status === 'waiting') {
        deleteRoom(roomId);
        return;
      }

      if (room.status === 'playing' && !room.isAI) {
        const winner = isWhite ? 'black' : 'white';
        const disconnectedPlayer = isWhite ? room.players.w : room.players.b;
        
        if (disconnectedPlayer) {
          disconnectedPlayer.connected = false;
        }

        socket.to(roomId).emit('opponent_disconnected');

        // 30-second grace period
        setTimeout(() => {
          const r = getRoom(roomId);
          if (r && r.status === 'playing') {
            const checkPlayer = isWhite ? r.players.w : r.players.b;
            if (checkPlayer && !checkPlayer.connected) {
              io.to(roomId).emit('game_over', { result: winner, reason: 'disconnection' });
              deleteRoom(roomId);
            }
          }
        }, 30_000);
      }
    });
  });
}

module.exports = { setupGameHandlers };

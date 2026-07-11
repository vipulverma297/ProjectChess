import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameState, ChessMove, GameResult, GameReason, BoardMode } from '../../types/chess';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface MemeItem {
  url: string;
  title: string;
  caption: string;
}

function detectOpening(moves: ChessMove[]): string | null {
  if (moves.length === 0) return null;
  const sans = moves.map((m) => m.san || '');

  // 1. e4 c5 -> Sicilian
  if (sans[0] === 'e4' && sans[1] === 'c5') return 'sicilian';
  // 1. e4 e6 -> French
  if (sans[0] === 'e4' && sans[1] === 'e6') return 'french';
  // 1. e4 c6 -> Caro-Kann
  if (sans[0] === 'e4' && sans[1] === 'c6') return 'carokann';
  // 1. d4 d5 2. c4 -> Queens Gambit
  if (sans[0] === 'd4' && sans[1] === 'd5' && sans[2] === 'c4') return 'queensgambit';
  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 -> Ruy Lopez
  if (sans[0] === 'e4' && sans[1] === 'e5' && sans[2] === 'Nf3' && sans[3] === 'Nc6' && sans[4] === 'Bb5') return 'ruylopez';
  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 -> Italian Game
  if (sans[0] === 'e4' && sans[1] === 'e5' && sans[2] === 'Nf3' && sans[3] === 'Nc6' && sans[4] === 'Bc4') return 'italian';

  return null;
}

const MEME_DATABASE: Record<string, MemeItem[]> = {
  checkmate: [
    {
      url: 'https://i.imgflip.com/39t1o0.jpg',
      title: 'Outstanding Move!',
      caption: 'When you calculate mate in 8 and your opponent actually plays into it.'
    },
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h0Y3JrbzhxZGl6djBqMXM4a2Q3bXdzbmRxZWlwaTZmaWR5bXV2cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ornk57KwDXf81rjWM/giphy.gif',
      title: 'Flawless Victory',
      caption: 'The plan came together. GGs only.'
    }
  ],
  check: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGFjc2Z0bXRhNGVqMzh5aTF2cDRuNnV3ZjFzMXA5Mzdid2ZldzF6ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/55itGuoX22ZUs/giphy.gif',
      title: "I'm in danger",
      caption: "Every chess player when the opponent's queen suddenly invades the back rank."
    },
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm5nMXVnbmRmM244aXhhYzM5ajZhcjM4OHphdzBkdXh4dmY3cTgydCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/32mC2kXY5GYIPwXYHP/giphy.gif',
      title: 'Sweating bullets',
      caption: 'When the king is under fire and you only have 5 seconds left on your clock.'
    }
  ],
  capture: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnA2dmtzazIybTZxY2I1dmM3dmc3bzJ2a2NkcWlscTNuMG9mNjJ3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yqXJ1KVE3nS03jLI1h/giphy.gif',
      title: 'Gotcha!',
      caption: 'Free real estate! Thank you for the piece.'
    },
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTV4aDJjYnExbmVhcndwZmVpdDczNHpyazhrNDNuZmxleDJ4amw4byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ry1s5KBawWMUI/giphy.gif',
      title: 'A small price to pay',
      caption: 'Perfectly balanced, as all captures should be.'
    }
  ],
  castle: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h1dmVydjV0ZTZkcXZyNzg2bDVzN2t3aXo5azA2NHJ4azRyMDd4NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/COYGe9rQbqiJ2/giphy.gif',
      title: 'Hiding in the bunker',
      caption: 'King: "I will now disappear into safety while the rest of the pieces fight to the death."'
    }
  ],
  promotion: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzB0YnRnbmZtbnVycm53dzBhMXh6M3h2bzIwdW9yZnh4d3l4azE0NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2tzon8OCC7BqmY/giphy.gif',
      title: 'Level Up!',
      caption: 'From a humble pawn to the most powerful queen on the board. Witness greatness.'
    }
  ],
  brilliant: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIwdjhkZGlkaGdxY3NqN21ia3A4eHd6Ynpza3pxMWVrc3FqNnpkYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L3X9Gv1zBnGCCVUQP0/giphy.gif',
      title: 'Brilliant Move! 💎',
      caption: "You just captured their queen! Giga-brain calculations have successfully concluded."
    }
  ],
  blunder: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzM5bXpjaDZ5d2J4d2Q2bnkwd3lxbDdtNHI5aGNhMDhndDR1ejg5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/98zF3hVuf1A8p2KofR/giphy.gif',
      title: 'Major Blunder! 🚨',
      caption: 'Oops, you just lost your queen! Time to look for the resign button.'
    }
  ],
  sicilian: [
    {
      url: 'https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?w=400&q=80',
      title: 'The Sicilian Defense ♟️',
      caption: '1... c5. Fun Fact: Named after Sicily, where chess arguments were historically resolved with duels! Arbab once challenged Vipul to a duel after losing to c5, but Manish ate all the snacks.'
    }
  ],
  french: [
    {
      url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80',
      title: 'The French Defense 🇫🇷',
      caption: '1... e6. Block your light-squared bishop. Zeeshan claims it is a deep positional masterclass, but Ghulam knows it is just a blunder in disguise.'
    }
  ],
  carokann: [
    {
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80',
      title: 'The Caro-Kann 🛡️',
      caption: '1... c6. A solid defense! Shahid plays this because he loves slow games, while Pazeer has already fallen asleep waiting for the next move.'
    }
  ],
  ruylopez: [
    {
      url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80',
      title: 'The Ruy Lopez 🇪🇸',
      caption: '1. e4 e5 2. Nf3 Nc6 3. Bb5. Fun Fact: The President officially declared Zeeshan\'s Ruy Lopez theory to be "100% made up on the spot".'
    }
  ],
  queensgambit: [
    {
      url: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=400&q=80',
      title: "Queen's Gambit 👑",
      caption: 'Offering the c-pawn. Manish thinks he is Beth Harmon, but Vipul is ready to capture all his pieces anyway.'
    }
  ],
  italian: [
    {
      url: 'https://images.unsplash.com/photo-1533088270947-624c3a490d0b?w=400&q=80',
      title: 'The Italian Game 🇮🇹',
      caption: '1. e4 e5 2. Nf3 Nc6 3. Bc4. Shahid is preparing the Fried Liver Attack! Arbab is sweating bullets on the back rank.'
    }
  ],
  normal: [
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmQ0NXl6OGc2eDRscjR4a3k4aDNpdnZodHRvczRhcXRjOHJ2MGp1eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d3mlE7uhX8KFgEmY/giphy.gif',
      title: 'Backseat Masterclass 📣',
      caption: 'Ghulam has officially entered spectator mode. He is now checkmating both players from 3 tables away with his backseat commentary!'
    },
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjNqZnJtbGhtazMxdGFhdzU0MDRxczE3eDU0NHNmdHBmZHpsenJ2dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9058qbauzhc7qgfvfJ/giphy.gif',
      title: 'Pawn Pusher Manish ♟️',
      caption: 'Manish\'s grand strategy: when you have absolutely no idea what to move next, just push a random pawn forward and hope Vipul doesn\'t notice.'
    },
    {
      url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&q=80',
      title: 'Undefeated Legacy 🏆',
      caption: 'Zeeshan was a legendary school chess champion back in the day, but now he only watches because he\'s terrified of losing to Pazeer.'
    },
    {
      url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80',
      title: 'Failed Calculations 🧠',
      caption: 'Vipul claims he calculated mate in 12, but his engine crashed after 2 moves because his computer overheated. Calculations successfully failed.'
    },
    {
      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIwdjhkZGlkaGdxY3NqN21ia3A4eHd6Ynpza3pxMWVrc3FqNnpkYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L3X9Gv1zBnGCCVUQP0/giphy.gif',
      title: 'The Ghulam Directive 🕵️‍♂️',
      caption: 'Why did Ghulam never finish his own chess game? Because he was too busy telling Vipul, Manish, and Shahid how to play theirs.'
    },
    {
      url: 'https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?w=400&q=80',
      title: 'Dev vs Stockfish 💻',
      caption: 'Did you know? Vipul spent 4 hours coding this chess app to practice his openings, only to blunder his queen in the first 5 moves against Stockfish Level 1.'
    }
  ]
};

const initialState: GameState = {
  fen: START_FEN,
  pgn: '',
  turn: 'w',
  moves: [],
  status: 'idle',
  result: null,
  reason: null,
  boardMode: '2d',
  drawOffered: false,
  viewMoveIndex: null,
  activeMeme: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // ── Server-driven updates ─────────────────────────────────────────────────
    moveMade(state, action: PayloadAction<{ move: ChessMove; fen: string; pgn: string; isMyMove?: boolean }>) {
      const { move, fen, pgn, isMyMove } = action.payload;
      state.fen = fen;
      state.pgn = pgn;
      state.turn = (fen.split(' ')[1] ?? 'w') as 'w' | 'b';
      state.moves.push(move);
      state.drawOffered = false;
      state.viewMoveIndex = null;

      // Select meme based on situation
      let category = 'normal';
      const san = move.san || '';
      const flags = move.flags || '';

      const opening = detectOpening(state.moves);

      if (san.includes('#')) {
        category = 'checkmate';
      } else if (move.captured === 'q') {
        category = isMyMove ? 'brilliant' : 'blunder';
      } else if (san.includes('+')) {
        category = 'check';
      } else if (opening && state.moves.length <= 6) {
        category = opening;
      } else if (move.captured) {
        category = 'capture';
      } else if (move.promotion) {
        category = 'promotion';
      } else if (flags.includes('k') || flags.includes('q')) {
        category = 'castle';
      }

      const list = MEME_DATABASE[category];
      if (list && list.length > 0) {
        state.activeMeme = list[Math.floor(Math.random() * list.length)];
      }
    },
    gameReady(state) {
      state.status = 'playing';
    },
    setWaiting(state) {
      state.status = 'waiting';
    },
    gameOver(state, action: PayloadAction<{ result: GameResult; reason: GameReason }>) {
      state.status = 'over';
      state.result = action.payload.result;
      state.reason = action.payload.reason;
    },
    drawOfferedByOpponent(state) {
      state.drawOffered = true;
    },
    drawDeclined(state) {
      state.drawOffered = false;
    },

    // ── Client actions (intercepted by socket middleware) ─────────────────────
    // These are no-op in the reducer; side effects happen in socketMiddleware.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    makeMove(_state, _action: PayloadAction<{ roomId: string; move: ChessMove }>) {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resign(_state, _action: PayloadAction<{ roomId: string }>) {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offerDraw(_state, _action: PayloadAction<{ roomId: string }>) {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acceptDraw(_state, _action: PayloadAction<{ roomId: string }>) {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    declineDraw(_state, _action: PayloadAction<{ roomId: string }>) {},

    // ── Board mode toggle ─────────────────────────────────────────────────────
    setBoardMode(state, action: PayloadAction<BoardMode>) {
      state.boardMode = action.payload;
    },

    // ── View history index ────────────────────────────────────────────────────
    setViewMoveIndex(state, action: PayloadAction<number | null>) {
      state.viewMoveIndex = action.payload;
    },

    // ── Game reconnection sync ────────────────────────────────────────────────
    gameSynced(state, action: PayloadAction<{ fen: string; pgn: string; moves: ChessMove[] }>) {
      const { fen, pgn, moves } = action.payload;
      state.fen = fen;
      state.pgn = pgn;
      state.moves = moves;
      state.turn = (fen.split(' ')[1] ?? 'w') as 'w' | 'b';
      state.viewMoveIndex = null;
      state.status = 'playing';
    },

    // ── Clear active meme ────────────────────────────────────────────────────
    clearMeme(state) {
      state.activeMeme = null;
    },

    // ── Reset ─────────────────────────────────────────────────────────────────
    resetGame() {
      return initialState;
    },
  },
});

export const {
  moveMade,
  gameReady,
  setWaiting,
  gameOver,
  drawOfferedByOpponent,
  drawDeclined,
  makeMove,
  resign,
  offerDraw,
  acceptDraw,
  declineDraw,
  setBoardMode,
  setViewMoveIndex,
  gameSynced,
  clearMeme,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;

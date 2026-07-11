const { Stockfish } = require('@se-oss/stockfish');
const { Chess } = require('chess.js');

class StockfishEngine {
  constructor() {
    this.engine = null;
    this.ready = false;
    this._init();
  }

  async _init() {
    try {
      this.engine = new Stockfish();
      await this.engine.waitReady();
      this.ready = true;
      console.log('[Stockfish] Engine initialized successfully via @se-oss/stockfish WASM');
    } catch (err) {
      console.error('[Stockfish] Failed to initialize WASM engine:', err.message);
    }
  }

  /**
   * Get best move for a given FEN position.
   * @param {string} fen
   * @param {number} skillLevel 0-20
   * @param {number} moveTime ms (unused with fixed depth, but kept for signature)
   * @returns {Promise<{from: string, to: string, promotion?: string} | null>}
   */
  async getBestMove(fen, skillLevel = 10, moveTime = 1500) {
    // Fallback if engine is not ready or failed to load
    if (!this.engine || !this.ready) {
      console.warn('[Stockfish] Engine not ready, using random move fallback');
      return this._randomMove(fen);
    }

    try {
      // Set the skill level on the engine
      await this.engine.setOptions({ 'Skill Level': skillLevel });

      // Determine appropriate search depth based on skill level (beginner vs master)
      // Level 0-5: depth 1-3 (very fast/easy)
      // Level 6-12: depth 4-8
      // Level 13-20: depth 9-14
      const depth = Math.max(1, Math.min(15, Math.floor(skillLevel / 1.5) + 1));

      const analysis = await this.engine.analyze(fen, depth);
      const raw = analysis.bestmove; // e.g. 'e2e4' or 'g8f6' or 'e7e8q'

      if (!raw || raw === '(none)') {
        return this._randomMove(fen);
      }

      return {
        from: raw.slice(0, 2),
        to: raw.slice(2, 4),
        promotion: raw.length > 4 ? raw[4] : undefined,
      };
    } catch (err) {
      console.error('[Stockfish] Analysis error, using random move fallback:', err.message);
      return this._randomMove(fen);
    }
  }

  /** Weighted random move fallback if engine fails or returns invalid move */
  _randomMove(fen) {
    try {
      const game = new Chess(fen);
      const moves = game.moves({ verbose: true });
      if (!moves.length) return null;

      // Prefer captures and checks to make the fallback slightly active
      const weighted = moves.flatMap((m) => {
        const copies = m.captured ? 3 : m.san.includes('+') ? 4 : 1;
        return Array(copies).fill(m);
      });
      const m = weighted[Math.floor(Math.random() * weighted.length)];
      return {
        from: m.from,
        to: m.to,
        promotion: m.promotion || undefined,
      };
    } catch (err) {
      console.error('[Stockfish Fallback] Error generating random move:', err.message);
      return null;
    }
  }

  quit() {
    if (this.engine) {
      try {
        this.engine.terminate();
      } catch (_) {}
    }
  }
}

module.exports = StockfishEngine;

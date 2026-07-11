import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Chess } from 'chess.js';
import { useAppDispatch, useAppSelector } from '../store/store';
import { makeMove } from '../store/slices/gameSlice';
import type { ChessMove, Color } from '../types/chess';
import { getStablePieces } from '../utils/chessHistory';

// ─── Piece Profiles (LatheGeometry) ──────────────────────────────────────────

function buildLathe(pts: [number, number][], segs = 20) {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    segs
  );
}

const PIECE_GEOM = {
  p: buildLathe([[0,.0],[.32,.06],[.21,.18],[.14,.3],[.12,.44],[.19,.58],[.2,.65],[.16,.72],[.1,.76]]),
  r: buildLathe([[0,.0],[.34,.07],[.23,.16],[.18,.2],[.18,.75],[.24,.75],[.24,.88],[.18,.88],[.18,.95],[.26,.95],[.26,1],[0,1]]),
  n: buildLathe([[0,.0],[.33,.07],[.22,.17],[.16,.28],[.14,.5],[.18,.65],[.22,.75],[.19,.85],[.13,.92],[.08,.98]]),
  b: buildLathe([[0,.0],[.33,.07],[.22,.17],[.16,.28],[.11,.5],[.16,.7],[.14,.82],[.08,.96],[.04,1.04],[0,1.1]]),
  q: buildLathe([[0,.0],[.35,.07],[.24,.17],[.16,.3],[.12,.55],[.19,.75],[.22,.9],[.18,1],[.23,1.1],[.2,1.18],[.12,1.25]]),
  k: buildLathe([[0,.0],[.35,.07],[.24,.17],[.16,.3],[.12,.55],[.19,.75],[.22,.9],[.18,1],[.14,1.08],[.12,1.16]]),
};

// ─── Materials ────────────────────────────────────────────────────────────────

const WHITE_MAT = new THREE.MeshStandardMaterial({ color: '#ede0c8', roughness: 0.25, metalness: 0.15 });
const BLACK_MAT = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.35, metalness: 0.2 });
const WHITE_SEL = new THREE.MeshStandardMaterial({ color: '#ede0c8', roughness: 0.1, metalness: 0.3, emissive: '#aaa020', emissiveIntensity: 0.6 });
const BLACK_SEL = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.2, metalness: 0.3, emissive: '#aaa020', emissiveIntensity: 0.6 });

// ─── Board Tile ───────────────────────────────────────────────────────────────

const TILE_DARK  = new THREE.MeshStandardMaterial({ color: '#b58863', roughness: 0.6 });
const TILE_LIGHT = new THREE.MeshStandardMaterial({ color: '#f0d9b5', roughness: 0.5 });
const TILE_VALID = new THREE.MeshStandardMaterial({ color: '#829769', roughness: 0.5, emissive: '#829769', emissiveIntensity: 0.4 });
const TILE_SEL   = new THREE.MeshStandardMaterial({ color: '#aaa23a', roughness: 0.4, emissive: '#aaa23a', emissiveIntensity: 0.5 });

interface TileProps {
  file: number; rank: number; selected: boolean; valid: boolean;
  onClick: () => void;
}

const Tile = ({ file, rank, selected, valid, onClick }: TileProps) => {
  const isLight = (file + rank) % 2 === 0;
  let mat = isLight ? TILE_LIGHT : TILE_DARK;
  if (selected) mat = TILE_SEL;
  else if (valid) mat = TILE_VALID;

  return (
    <mesh
      position={[file - 3.5, -0.05, rank - 3.5]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

// ─── Chess Piece ──────────────────────────────────────────────────────────────

interface PieceProps {
  type: string;
  color: Color;
  square: string;
  selected: boolean;
  playerColor: Color | null;
  onClick: () => void;
}

const ChessPiece3D = ({ type, color, square, selected, playerColor, onClick }: PieceProps) => {
  const ref = useRef<THREE.Mesh>(null!);
  const geom = PIECE_GEOM[type as keyof typeof PIECE_GEOM] ?? PIECE_GEOM.p;
  const mat  = color === 'w' ? (selected ? WHITE_SEL : WHITE_MAT) : (selected ? BLACK_SEL : BLACK_MAT);

  const [file, rank] = useMemo(() => {
    const fileIdx = square.charCodeAt(0) - 97; // a=0
    const rankIdx = parseInt(square[1]) - 1;   // 1=0
    const f = playerColor === 'b' ? 7 - fileIdx : fileIdx;
    const r = playerColor === 'b' ? rankIdx : 7 - rankIdx;
    return [f, r];
  }, [square, playerColor]);

  // Set initial position on mount
  useEffect(() => {
    ref.current.position.x = file - 3.5;
    ref.current.position.y = selected ? 0.4 : 0;
    ref.current.position.z = rank - 3.5;
  }, []);

  // Smooth lerp animations for hover and moves
  useFrame((_, delta) => {
    const targetY = selected ? 0.4 : 0;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, delta * 8);

    const targetX = file - 3.5;
    const targetZ = rank - 3.5;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, delta * 12);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetZ, delta * 12);
  });

  return (
    <mesh
      ref={ref}
      geometry={geom}
      material={mat}
      castShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    />
  );
};

// ─── Board Border ─────────────────────────────────────────────────────────────

const BoardBorder = () => (
  <mesh position={[0, -0.12, 0]} receiveShadow>
    <boxGeometry args={[9.2, 0.15, 9.2]} />
    <meshStandardMaterial color="#5c3d1e" roughness={0.7} />
  </mesh>
);

// ─── King Cross (3D decoration) ───────────────────────────────────────────────

// ─── Main 3D Board Component ──────────────────────────────────────────────────

const Board3DScene = () => {
  const dispatch = useAppDispatch();
  const { fen, status, viewMoveIndex, moves } = useAppSelector((s) => s.game);
  const { color: playerColor } = useAppSelector((s) => s.player);
  const { roomId } = useAppSelector((s) => s.room);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  // Compute display moves for past move if viewing history
  const displayMoves = useMemo(() => {
    return moves.slice(0, viewMoveIndex ?? moves.length);
  }, [moves, viewMoveIndex]);

  // Compute display FEN for past move if viewing history
  const displayFen = useMemo(() => {
    if (viewMoveIndex === null || viewMoveIndex >= moves.length) {
      return fen;
    }
    const tempGame = new Chess();
    for (let i = 0; i < viewMoveIndex; i++) {
      try {
        tempGame.move(moves[i]);
      } catch (e) {
        console.error('[ChessBoard3D] Error playing history move:', moves[i], e);
      }
    }
    return tempGame.fen();
  }, [fen, moves, viewMoveIndex]);

  const game = useMemo(() => new Chess(displayFen), [displayFen]);
  const isPlaying = status === 'playing';
  const isLatestPosition = viewMoveIndex === null || viewMoveIndex >= moves.length;
  const myTurn = isPlaying && game.turn() === playerColor && isLatestPosition;

  // Generate stable pieces list using the history helper
  const pieces = useMemo(() => {
    return getStablePieces(displayMoves);
  }, [displayMoves]);

  const coordsToSquare = useCallback(
    (file: number, rank: number): string => {
      const f = playerColor === 'b' ? 7 - file : file;
      const r = playerColor === 'b' ? rank : 7 - rank;
      return String.fromCharCode(97 + f) + (r + 1);
    },
    [playerColor]
  );

  const handlePieceClick = useCallback(
    (sq: string) => {
      if (!myTurn || !roomId) return;
      const piece = game.get(sq as Parameters<typeof game.get>[0]);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(sq);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moves = game.moves({ square: sq as any, verbose: true }) as any[];
        setValidMoves(moves.map((m) => m.to));
      }
    },
    [myTurn, roomId, displayFen, playerColor]
  );

  const handleTileClick = useCallback(
    (sq: string) => {
      if (!myTurn || !roomId || !selectedSquare) return;
      if (!validMoves.includes(sq)) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
      const move: ChessMove = { from: selectedSquare, to: sq };
      // Auto-promote to queen in 3D
      const piece = game.get(selectedSquare as Parameters<typeof game.get>[0]);
      if (piece?.type === 'p') {
        const toRank = parseInt(sq[1]);
        if ((piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1)) {
          move.promotion = 'q';
        }
      }
      dispatch(makeMove({ roomId, move }));
      setSelectedSquare(null);
      setValidMoves([]);
    },
    [myTurn, roomId, selectedSquare, validMoves, displayFen, dispatch]
  );

  const tiles = useMemo(() => {
    const result = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = coordsToSquare(f, r);
        result.push({ file: f, rank: r, sq });
      }
    }
    return result;
  }, [coordsToSquare]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-5, 8, -5]} intensity={0.4} color="#ffd4a0" />

      <Environment preset="city" />

      <BoardBorder />

      {/* Tiles */}
      {tiles.map(({ file, rank, sq }) => (
        <Tile
          key={sq}
          file={file}
          rank={rank}
          selected={selectedSquare === sq}
          valid={validMoves.includes(sq)}
          onClick={() => {
            const piece = game.get(sq as Parameters<typeof game.get>[0]);
            if (piece && piece.color === playerColor && myTurn) {
              handlePieceClick(sq);
            } else {
              handleTileClick(sq);
            }
          }}
        />
      ))}

      {/* Pieces */}
      {pieces.map((p) => {
        return (
          <ChessPiece3D
            key={p.id}
            type={p.type}
            color={p.color}
            square={p.square}
            selected={selectedSquare === p.square}
            playerColor={playerColor}
            onClick={() => handlePieceClick(p.square)}
          />
        );
      })}
    </>
  );
};

const ChessBoard3D = () => (
  <div className="chessboard-3d">
    <Canvas
      shadows
      camera={{ position: [0, 9, 9], fov: 42 }}
      gl={{ antialias: true }}
    >
      <Board3DScene />
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={6}
        maxDistance={20}
        makeDefault
      />
    </Canvas>
    <p className="chessboard-3d__hint">🖱 Drag to rotate · Scroll to zoom</p>
  </div>
);

export default ChessBoard3D;

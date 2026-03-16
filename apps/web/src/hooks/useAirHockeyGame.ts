import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { screenToWorld, WORLD_WIDTH, WORLD_HEIGHT } from "../utils/projection";

type Vec2 = { x: number; y: number };
type Winner = "PLAYER" | "CPU" | null;
export type CpuDifficulty = "easy" | "normal" | "hard";

type DifficultyConfig = {
  reaction: number;
  maxSpeed: number;
  attackBias: number;
  defendBias: number;
  error: number;
  puckTrackStrength: number;
  interceptStrength: number;
};

const PUCK_RADIUS = 22;
const MALLET_RADIUS = 58;
const BOARD_PADDING = 70;
const GOAL_WIDTH = 320;
const WIN_SCORE = 5;
const MAX_PUCK_SPEED = 21;
const FRICTION = 0.9975;

const INITIAL_PLAYER: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 230 };
const INITIAL_CPU: Vec2 = { x: WORLD_WIDTH / 2, y: 230 };
const INITIAL_PUCK: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

const DIFFICULTY_CONFIG: Record<CpuDifficulty, DifficultyConfig> = {
  easy: {
    reaction: 0.085,
    maxSpeed: 8.2,
    attackBias: 0.42,
    defendBias: 0.82,
    error: 30,
    puckTrackStrength: 0.9,
    interceptStrength: 0.52,
  },
  normal: {
    reaction: 0.125,
    maxSpeed: 10.8,
    attackBias: 0.68,
    defendBias: 0.92,
    error: 14,
    puckTrackStrength: 1.08,
    interceptStrength: 0.82,
  },
  hard: {
    reaction: 0.185,
    maxSpeed: 14.2,
    attackBias: 0.95,
    defendBias: 1.0,
    error: 6,
    puckTrackStrength: 1.28,
    interceptStrength: 1.05,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
const length = (v: Vec2) => Math.hypot(v.x, v.y);

const normalize = (v: Vec2): Vec2 => {
  const len = length(v) || 1;
  return { x: v.x / len, y: v.y / len };
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clampPlayerWorld(pos: Vec2): Vec2 {
  return {
    x: clamp(
      pos.x,
      BOARD_PADDING + MALLET_RADIUS,
      WORLD_WIDTH - BOARD_PADDING - MALLET_RADIUS
    ),
    y: clamp(
      pos.y,
      WORLD_HEIGHT * 0.52,
      WORLD_HEIGHT - BOARD_PADDING - MALLET_RADIUS
    ),
  };
}

function clampCpuWorld(pos: Vec2): Vec2 {
  return {
    x: clamp(
      pos.x,
      BOARD_PADDING + MALLET_RADIUS,
      WORLD_WIDTH - BOARD_PADDING - MALLET_RADIUS
    ),
    y: clamp(pos.y, BOARD_PADDING + MALLET_RADIUS, WORLD_HEIGHT * 0.48),
  };
}

function resetPuckDirection(towardPlayer: boolean) {
  return {
    x: (Math.random() - 0.5) * 8,
    y: towardPlayer ? 8.6 : -8.6,
  };
}

function capSpeed(v: Vec2, max: number) {
  const speed = length(v);
  if (speed <= max || speed === 0) return v;
  return mul(normalize(v), max);
}

function resolveMalletCollision(
  puck: Vec2,
  puckVelocity: Vec2,
  mallet: Vec2,
  malletVelocity: Vec2
): { puck: Vec2; velocity: Vec2 } {
  const diff = sub(puck, mallet);
  const dist = length(diff);
  const minDist = PUCK_RADIUS + MALLET_RADIUS;

  if (dist >= minDist) {
    return { puck, velocity: puckVelocity };
  }

  const normal =
    dist > 0.0001 ? normalize(diff) : normalize({ x: 0, y: 1 });

  const pushedPuck = add(mallet, mul(normal, minDist + 1));

  let nextVelocity = add(puckVelocity, mul(malletVelocity, 0.55));

  const alongNormal = nextVelocity.x * normal.x + nextVelocity.y * normal.y;
  if (alongNormal < 5.5) {
    nextVelocity = add(nextVelocity, mul(normal, 5.5 - alongNormal));
  }

  nextVelocity = add(nextVelocity, mul(normal, 1.8));
  nextVelocity = capSpeed(nextVelocity, MAX_PUCK_SPEED);

  return { puck: pushedPuck, velocity: nextVelocity };
}

export function useAirHockeyGame(difficulty: CpuDifficulty = "normal") {
  const [player, setPlayer] = useState<Vec2>(INITIAL_PLAYER);
  const [cpu, setCpu] = useState<Vec2>(INITIAL_CPU);
  const [puck, setPuck] = useState<Vec2>(INITIAL_PUCK);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [winner, setWinner] = useState<Winner>(null);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("READY");

  const playerRef = useRef<Vec2>(INITIAL_PLAYER);
  const prevPlayerRef = useRef<Vec2>(INITIAL_PLAYER);
  const cpuRef = useRef<Vec2>(INITIAL_CPU);
  const prevCpuRef = useRef<Vec2>(INITIAL_CPU);
  const puckRef = useRef<Vec2>(INITIAL_PUCK);
  const puckVelocityRef = useRef<Vec2>(resetPuckDirection(true));

  const animationRef = useRef<number | null>(null);
  const difficultyRef = useRef<DifficultyConfig>(DIFFICULTY_CONFIG[difficulty]);

  useEffect(() => {
    difficultyRef.current = DIFFICULTY_CONFIG[difficulty];
  }, [difficulty]);

  const syncPlayer = useCallback((next: Vec2) => {
    playerRef.current = next;
    setPlayer(next);
  }, []);

  const syncCpu = useCallback((next: Vec2) => {
    cpuRef.current = next;
    setCpu(next);
  }, []);

  const syncPuck = useCallback((next: Vec2) => {
    puckRef.current = next;
    setPuck(next);
  }, []);

  const resetPositionsOnly = useCallback(
    (towardPlayer: boolean) => {
      prevPlayerRef.current = INITIAL_PLAYER;
      prevCpuRef.current = INITIAL_CPU;
      syncPlayer(INITIAL_PLAYER);
      syncCpu(INITIAL_CPU);
      syncPuck(INITIAL_PUCK);
      puckVelocityRef.current = resetPuckDirection(towardPlayer);
    },
    [syncCpu, syncPlayer, syncPuck]
  );

  const startGame = useCallback(() => {
    setStarted(true);
    setWinner(null);
    setStatus(`CPU: ${difficulty.toUpperCase()}`);
    resetPositionsOnly(true);
  }, [difficulty, resetPositionsOnly]);

  const restart = useCallback(() => {
    setPlayerScore(0);
    setCpuScore(0);
    setWinner(null);
    setStarted(true);
    setStatus(`CPU: ${difficulty.toUpperCase()}`);
    resetPositionsOnly(true);
  }, [difficulty, resetPositionsOnly]);

  const backToTitle = useCallback(() => {
    setStarted(false);
    setWinner(null);
    setStatus("READY");
    setPlayerScore(0);
    setCpuScore(0);
    prevPlayerRef.current = INITIAL_PLAYER;
    prevCpuRef.current = INITIAL_CPU;
    syncPlayer(INITIAL_PLAYER);
    syncCpu(INITIAL_CPU);
    syncPuck(INITIAL_PUCK);
    puckVelocityRef.current = resetPuckDirection(true);
  }, [syncCpu, syncPlayer, syncPuck]);

  const updatePlayerFromWorld = useCallback(
    (worldX: number, worldY: number) => {
      const next = clampPlayerWorld({ x: worldX, y: worldY });
      syncPlayer(next);
    },
    [syncPlayer]
  );

  const movePlayer = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const { worldX, worldY } = screenToWorld(clientX, clientY, rect);
      updatePlayerFromWorld(worldX, worldY);
    },
    [updatePlayerFromWorld]
  );

  useEffect(() => {
    const loop = () => {
      if (!started || winner) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const cfg = difficultyRef.current;

      const currentPlayer = playerRef.current;
      const currentCpu = cpuRef.current;
      const currentPuck = puckRef.current;

      const playerVelocity = sub(currentPlayer, prevPlayerRef.current);

      let nextPuck = add(currentPuck, puckVelocityRef.current);
      let nextVelocity = { ...puckVelocityRef.current };

      if (nextPuck.x <= BOARD_PADDING + PUCK_RADIUS) {
        nextPuck.x = BOARD_PADDING + PUCK_RADIUS;
        nextVelocity.x = Math.abs(nextVelocity.x);
      }
      if (nextPuck.x >= WORLD_WIDTH - BOARD_PADDING - PUCK_RADIUS) {
        nextPuck.x = WORLD_WIDTH - BOARD_PADDING - PUCK_RADIUS;
        nextVelocity.x = -Math.abs(nextVelocity.x);
      }

      const inGoalX =
        nextPuck.x >= WORLD_WIDTH / 2 - GOAL_WIDTH / 2 &&
        nextPuck.x <= WORLD_WIDTH / 2 + GOAL_WIDTH / 2;

      if (nextPuck.y <= BOARD_PADDING + PUCK_RADIUS) {
        if (inGoalX) {
          setPlayerScore((score) => {
            const next = score + 1;
            if (next >= WIN_SCORE) {
              setWinner("PLAYER");
              setStatus("あなたの勝ち！");
            } else {
              setStatus(`CPU: ${difficulty.toUpperCase()}`);
            }
            return next;
          });
          resetPositionsOnly(false);
          animationRef.current = requestAnimationFrame(loop);
          return;
        }

        nextPuck.y = BOARD_PADDING + PUCK_RADIUS;
        nextVelocity.y = Math.abs(nextVelocity.y);
      }

      if (nextPuck.y >= WORLD_HEIGHT - BOARD_PADDING - PUCK_RADIUS) {
        if (inGoalX) {
          setCpuScore((score) => {
            const next = score + 1;
            if (next >= WIN_SCORE) {
              setWinner("CPU");
              setStatus("CPUの勝ち！");
            } else {
              setStatus(`CPU: ${difficulty.toUpperCase()}`);
            }
            return next;
          });
          resetPositionsOnly(true);
          animationRef.current = requestAnimationFrame(loop);
          return;
        }

        nextPuck.y = WORLD_HEIGHT - BOARD_PADDING - PUCK_RADIUS;
        nextVelocity.y = -Math.abs(nextVelocity.y);
      }

      const defendCenter = { x: WORLD_WIDTH / 2, y: 250 };
      const attackAnchor = { x: WORLD_WIDTH / 2, y: 430 };
      const puckComingUp = nextVelocity.y < 1.2;
      const puckInCpuHalf = nextPuck.y < WORLD_HEIGHT * 0.72;

      let target = defendCenter;

      if (puckComingUp && nextPuck.y < WORLD_HEIGHT * 0.58) {
        const projectedX = clamp(
          nextPuck.x + nextVelocity.x * 10 * cfg.interceptStrength,
          BOARD_PADDING + MALLET_RADIUS,
          WORLD_WIDTH - BOARD_PADDING - MALLET_RADIUS
        );

        target = {
          x: projectedX,
          y: clamp(
            nextPuck.y - 90 * cfg.defendBias,
            BOARD_PADDING + MALLET_RADIUS,
            WORLD_HEIGHT * 0.42
          ),
        };
      } else if (puckInCpuHalf) {
        target = {
          x: lerp(
            attackAnchor.x,
            nextPuck.x,
            Math.min(1, cfg.attackBias * cfg.puckTrackStrength)
          ),
          y: lerp(
            attackAnchor.y,
            nextPuck.y - 40,
            Math.min(1, cfg.attackBias)
          ),
        };
      } else {
        target = {
          x: lerp(defendCenter.x, WORLD_WIDTH / 2, 0.5),
          y: lerp(defendCenter.y, 300, 0.6),
        };
      }

      const noisyTarget = {
        x: target.x + (Math.random() - 0.5) * cfg.error,
        y: target.y + (Math.random() - 0.5) * cfg.error * 0.4,
      };

      const cpuDelta = sub(noisyTarget, currentCpu);
      const cpuDist = length(cpuDelta);

      let nextCpu = currentCpu;
      if (cpuDist >= 1) {
        const aggressionBoost =
          difficulty === "hard" ? 1.18 : difficulty === "normal" ? 1.08 : 1;
        const step = Math.min(
          cfg.maxSpeed * aggressionBoost,
          cpuDist * cfg.reaction * aggressionBoost
        );
        nextCpu = clampCpuWorld(add(currentCpu, mul(normalize(cpuDelta), step)));
      } else {
        nextCpu = clampCpuWorld(currentCpu);
      }

      const cpuVelocity = sub(nextCpu, currentCpu);

      let collision = resolveMalletCollision(
        nextPuck,
        nextVelocity,
        currentPlayer,
        playerVelocity
      );
      nextPuck = collision.puck;
      nextVelocity = collision.velocity;

      collision = resolveMalletCollision(
        nextPuck,
        nextVelocity,
        nextCpu,
        cpuVelocity
      );
      nextPuck = collision.puck;
      nextVelocity = collision.velocity;

      nextVelocity.x *= FRICTION;
      nextVelocity.y *= FRICTION;

      if (Math.abs(nextVelocity.x) < 0.03) nextVelocity.x = 0;
      if (Math.abs(nextVelocity.y) < 0.03) nextVelocity.y = 0;

      prevPlayerRef.current = currentPlayer;
      prevCpuRef.current = currentCpu;

      syncCpu(nextCpu);
      syncPuck(nextPuck);
      puckVelocityRef.current = nextVelocity;

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [started, winner, difficulty, resetPositionsOnly, syncCpu, syncPuck]);

  const statusText = useMemo(() => {
    if (winner === "PLAYER") return "あなたの勝ち！";
    if (winner === "CPU") return "CPUの勝ち！";
    return `CPU: ${difficulty.toUpperCase()}`;
  }, [winner, difficulty]);

  return {
    player,
    cpu,
    puck,
    playerScore,
    cpuScore,
    winner,
    started,
    status,
    statusText,
    winScore: WIN_SCORE,
    difficulty,
    startGame,
    restart,
    backToTitle,
    updatePlayerFromWorld,
    movePlayer,
  };
}

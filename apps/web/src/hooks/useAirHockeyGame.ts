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

const INITIAL_PLAYER: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 230 };
const INITIAL_CPU: Vec2 = { x: WORLD_WIDTH / 2, y: 230 };
const INITIAL_PUCK: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

const DIFFICULTY_CONFIG: Record<CpuDifficulty, DifficultyConfig> = {
  easy: {
    reaction: 0.075,
    maxSpeed: 7.2,
    attackBias: 0.24,
    defendBias: 0.9,
    error: 34,
    puckTrackStrength: 0.72,
    interceptStrength: 0.42,
  },
  normal: {
    reaction: 0.11,
    maxSpeed: 9.8,
    attackBias: 0.42,
    defendBias: 1.0,
    error: 18,
    puckTrackStrength: 0.95,
    interceptStrength: 0.7,
  },
  hard: {
    reaction: 0.17,
    maxSpeed: 13.2,
    attackBias: 0.68,
    defendBias: 1.14,
    error: 8,
    puckTrackStrength: 1.14,
    interceptStrength: 0.95,
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
    x: clamp(pos.x, BOARD_PADDING + MALLET_RADIUS, WORLD_WIDTH - BOARD_PADDING - MALLET_RADIUS),
    y: clamp(pos.y, WORLD_HEIGHT * 0.52, WORLD_HEIGHT - BOARD_PADDING - MALLET_RADIUS),
  };
}

function clampCpuWorld(pos: Vec2): Vec2 {
  return {
    x: clamp(pos.x, BOARD_PADDING + MALLET_RADIUS, WORLD_WIDTH - BOARD_PADDING - MALLET_RADIUS),
    y: clamp(pos.y, BOARD_PADDING + MALLET_RADIUS, WORLD_HEIGHT * 0.48),
  };
}

function resetPuckDirection(towardPlayer: boolean) {
  return {
    x: (Math.random() - 0.5) * 6,
    y: towardPlayer ? 6.4 : -6.4,
  };
}

function resolveCollision(
  puck: Vec2,
  puckVelocity: Vec2,
  mallet: Vec2
): { puck: Vec2; velocity: Vec2 } {
  const diff = sub(puck, mallet);
  const dist = length(diff);
  const minDist = PUCK_RADIUS + MALLET_RADIUS;

  if (dist >= minDist || dist === 0) {
    return { puck, velocity: puckVelocity };
  }

  const normal = normalize(diff);
  const pushedPuck = add(mallet, mul(normal, minDist + 1));

  const incomingAlongNormal =
    puckVelocity.x * normal.x + puckVelocity.y * normal.y;
  const reflect = sub(puckVelocity, mul(normal, 2 * incomingAlongNormal));

  let nextVelocity = add(reflect, mul(normal, 1.8));
  const speed = Math.max(8, length(nextVelocity));
  const capped = Math.min(speed, 15);

  nextVelocity = mul(normalize(nextVelocity), capped);

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

  const puckVelocityRef = useRef<Vec2>(resetPuckDirection(true));
  const animationRef = useRef<number | null>(null);
  const difficultyRef = useRef<DifficultyConfig>(DIFFICULTY_CONFIG[difficulty]);

  useEffect(() => {
    difficultyRef.current = DIFFICULTY_CONFIG[difficulty];
  }, [difficulty]);

  const resetPositionsOnly = useCallback((towardPlayer: boolean) => {
    setPlayer(INITIAL_PLAYER);
    setCpu(INITIAL_CPU);
    setPuck(INITIAL_PUCK);
    puckVelocityRef.current = resetPuckDirection(towardPlayer);
  }, []);

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
    setPlayer(INITIAL_PLAYER);
    setCpu(INITIAL_CPU);
    setPuck(INITIAL_PUCK);
    puckVelocityRef.current = resetPuckDirection(true);
  }, []);

  const updatePlayerFromWorld = useCallback((worldX: number, worldY: number) => {
    setPlayer(clampPlayerWorld({ x: worldX, y: worldY }));
  }, []);

  const movePlayer = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const { worldX, worldY } = screenToWorld(clientX, clientY, rect);
    updatePlayerFromWorld(worldX, worldY);
  }, [updatePlayerFromWorld]);

  useEffect(() => {
    const loop = () => {
      if (!started || winner) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      setPuck((currentPuck) => {
        const cfg = difficultyRef.current;

        let nextPuck = add(currentPuck, puckVelocityRef.current);
        let nextVelocity = { ...puckVelocityRef.current };

        if (nextPuck.x <= BOARD_PADDING + PUCK_RADIUS) {
          nextPuck.x = BOARD_PADDING + PUCK_RADIUS;
          nextVelocity.x *= -1;
        }
        if (nextPuck.x >= WORLD_WIDTH - BOARD_PADDING - PUCK_RADIUS) {
          nextPuck.x = WORLD_WIDTH - BOARD_PADDING - PUCK_RADIUS;
          nextVelocity.x *= -1;
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
            return INITIAL_PUCK;
          }

          nextPuck.y = BOARD_PADDING + PUCK_RADIUS;
          nextVelocity.y *= -1;
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
            return INITIAL_PUCK;
          }

          nextPuck.y = WORLD_HEIGHT - BOARD_PADDING - PUCK_RADIUS;
          nextVelocity.y *= -1;
        }

        setCpu((currentCpu) => {
          const defendCenter = { x: WORLD_WIDTH / 2, y: 210 };
          const attackAnchor = { x: WORLD_WIDTH / 2, y: 320 };
          const puckComingUp = nextVelocity.y < 0;
          const puckInCpuHalf = nextPuck.y < WORLD_HEIGHT * 0.62;

          let target = defendCenter;

          if (puckComingUp && puckInCpuHalf) {
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
          } else {
            target = {
              x: lerp(attackAnchor.x, nextPuck.x, cfg.attackBias * cfg.puckTrackStrength),
              y: lerp(attackAnchor.y, nextPuck.y - 120, cfg.attackBias),
            };
          }

          const noisyTarget = {
            x: target.x + (Math.random() - 0.5) * cfg.error,
            y: target.y + (Math.random() - 0.5) * cfg.error * 0.4,
          };

          const delta = sub(noisyTarget, currentCpu);
          const dist = length(delta);

          if (dist < 1) return clampCpuWorld(currentCpu);

          const step = Math.min(cfg.maxSpeed, dist * cfg.reaction);
          const moved = add(currentCpu, mul(normalize(delta), step));
          return clampCpuWorld(moved);
        });

        setPlayer((currentPlayer) => {
          const result = resolveCollision(nextPuck, nextVelocity, currentPlayer);
          nextPuck = result.puck;
          nextVelocity = result.velocity;
          return currentPlayer;
        });

        setCpu((currentCpu) => {
          const result = resolveCollision(nextPuck, nextVelocity, currentCpu);
          nextPuck = result.puck;
          nextVelocity = result.velocity;
          return currentCpu;
        });

        nextVelocity.x *= 0.995;
        nextVelocity.y *= 0.995;

        if (Math.abs(nextVelocity.x) < 0.03) nextVelocity.x = 0;
        if (Math.abs(nextVelocity.y) < 0.03) nextVelocity.y = 0;

        puckVelocityRef.current = nextVelocity;
        return nextPuck;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [started, winner, difficulty, resetPositionsOnly]);

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

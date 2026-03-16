import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_PADDING,
  GOAL_WIDTH,
  MALLET_RADIUS,
  PUCK_RADIUS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WIN_SCORE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clampToBottomHalf,
  clampToTopHalf,
  toWorld,
} from "../utils/projection";

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

const DIFFICULTY_CONFIG: Record<CpuDifficulty, DifficultyConfig> = {
  easy: {
    reaction: 0.08,
    maxSpeed: 7.5,
    attackBias: 0.25,
    defendBias: 0.9,
    error: 36,
    puckTrackStrength: 0.7,
    interceptStrength: 0.45,
  },
  normal: {
    reaction: 0.12,
    maxSpeed: 10,
    attackBias: 0.45,
    defendBias: 1.0,
    error: 18,
    puckTrackStrength: 0.95,
    interceptStrength: 0.7,
  },
  hard: {
    reaction: 0.18,
    maxSpeed: 13.5,
    attackBias: 0.7,
    defendBias: 1.15,
    error: 8,
    puckTrackStrength: 1.15,
    interceptStrength: 0.95,
  },
};

const INITIAL_PLAYER: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 230 };
const INITIAL_CPU: Vec2 = { x: WORLD_WIDTH / 2, y: 230 };
const INITIAL_PUCK: Vec2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const length = (v: Vec2) => Math.hypot(v.x, v.y);

const normalize = (v: Vec2): Vec2 => {
  const len = length(v) || 1;
  return { x: v.x / len, y: v.y / len };
};

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });

function resetPuckDirection(towardPlayer: boolean) {
  const x = (Math.random() - 0.5) * 6;
  const y = towardPlayer ? 6.5 : -6.5;
  return { x, y };
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
  const nextPuck = add(mallet, mul(normal, minDist + 1));
  const speed = Math.max(8, length(puckVelocity));
  const nextVelocity = mul(normal, speed);

  return { puck: nextPuck, velocity: nextVelocity };
}

export function useAirHockeyGame(difficulty: CpuDifficulty = "normal") {
  const [player, setPlayer] = useState<Vec2>(INITIAL_PLAYER);
  const [cpu, setCpu] = useState<Vec2>(INITIAL_CPU);
  const [puck, setPuck] = useState<Vec2>(INITIAL_PUCK);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [winner, setWinner] = useState<Winner>(null);

  const puckVelocityRef = useRef<Vec2>(resetPuckDirection(true));
  const animationRef = useRef<number | null>(null);
  const difficultyRef = useRef<DifficultyConfig>(DIFFICULTY_CONFIG[difficulty]);

  useEffect(() => {
    difficultyRef.current = DIFFICULTY_CONFIG[difficulty];
  }, [difficulty]);

  const restart = useCallback(() => {
    setPlayer(INITIAL_PLAYER);
    setCpu(INITIAL_CPU);
    setPuck(INITIAL_PUCK);
    setPlayerScore(0);
    setCpuScore(0);
    setWinner(null);
    puckVelocityRef.current = resetPuckDirection(true);
  }, []);

  const movePlayer = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const next = toWorld(clientX, clientY, rect);
    setPlayer(clampToBottomHalf(next));
  }, []);

  useEffect(() => {
    const loop = () => {
      setPuck((currentPuck) => {
        if (winner) return currentPuck;

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
              if (next >= WIN_SCORE) setWinner("PLAYER");
              return next;
            });
            setPlayer(INITIAL_PLAYER);
            setCpu(INITIAL_CPU);
            puckVelocityRef.current = resetPuckDirection(false);
            return INITIAL_PUCK;
          }

          nextPuck.y = BOARD_PADDING + PUCK_RADIUS;
          nextVelocity.y *= -1;
        }

        if (nextPuck.y >= WORLD_HEIGHT - BOARD_PADDING - PUCK_RADIUS) {
          if (inGoalX) {
            setCpuScore((score) => {
              const next = score + 1;
              if (next >= WIN_SCORE) setWinner("CPU");
              return next;
            });
            setPlayer(INITIAL_PLAYER);
            setCpu(INITIAL_CPU);
            puckVelocityRef.current = resetPuckDirection(true);
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

          if (dist < 1) return clampToTopHalf(currentCpu);

          const step = Math.min(cfg.maxSpeed, dist * cfg.reaction);
          const nextCpu = add(currentCpu, mul(normalize(delta), step));
          return clampToTopHalf(nextCpu);
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
  }, [winner]);

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
    statusText,
    movePlayer,
    restart,
    difficulty,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

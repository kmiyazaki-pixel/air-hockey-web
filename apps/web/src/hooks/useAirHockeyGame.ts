import { useEffect, useRef, useState } from "react";
import {
  clamp,
  CPU_MAX_Y,
  CPU_MIN_Y,
  PLAYER_MAX_Y,
  PLAYER_MIN_Y,
  TABLE_MAX_X,
  TABLE_MIN_X,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../utils/projection";

const GOAL_WIDTH = 320;
const PUCK_RADIUS = 22;
const MALLET_RADIUS = 58;
const WIN_SCORE = 5;

export type Winner = "PLAYER" | "CPU" | null;
export type Vec2 = { x: number; y: number };

export function useAirHockeyGame() {
  const [started, setStarted] = useState(false);

  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [status, setStatus] = useState("準備完了");
  const [winner, setWinner] = useState<Winner>(null);

  const [puck, setPuck] = useState<Vec2>({ x: 500, y: 900 });
  const [player, setPlayer] = useState<Vec2>({ x: 500, y: 1350 });
  const [cpu, setCpu] = useState<Vec2>({ x: 500, y: 210 });

  const playerRef = useRef(player);
  const cpuRef = useRef(cpu);
  const puckRef = useRef(puck);

  const playerVelocityRef = useRef<Vec2>({ x: 0, y: 0 });
  const lastPlayerRef = useRef(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    cpuRef.current = cpu;
  }, [cpu]);

  useEffect(() => {
    puckRef.current = puck;
  }, [puck]);

  const startGame = () => {
    const nextPlayer = { x: 500, y: 1350 };
    const nextCpu = { x: 500, y: 210 };
    const nextPuck = { x: 500, y: 900 };

    setPlayerScore(0);
    setCpuScore(0);
    setWinner(null);
    setStatus("プレイ中");

    setPlayer(nextPlayer);
    setCpu(nextCpu);
    setPuck(nextPuck);

    playerRef.current = nextPlayer;
    cpuRef.current = nextCpu;
    puckRef.current = nextPuck;
    playerVelocityRef.current = { x: 0, y: 0 };
    lastPlayerRef.current = nextPlayer;

    setStarted(true);
  };

  const backToTitle = () => {
    setStarted(false);
  };

  const updatePlayerFromWorld = (worldX: number, worldY: number) => {
    if (!started || winner) return;

    const nextPlayer = {
      x: clamp(worldX, TABLE_MIN_X, TABLE_MAX_X),
      y: clamp(worldY, PLAYER_MIN_Y, PLAYER_MAX_Y),
    };

    const prevPlayer = lastPlayerRef.current;
    playerVelocityRef.current = {
      x: nextPlayer.x - prevPlayer.x,
      y: nextPlayer.y - prevPlayer.y,
    };
    lastPlayerRef.current = nextPlayer;

    playerRef.current = nextPlayer;
    setPlayer(nextPlayer);
  };

  useEffect(() => {
    if (!started || winner) return;

    let puckX = puckRef.current.x;
    let puckY = puckRef.current.y;
    let velX = 3.8;
    let velY = 5.4;

    let cpuX = cpuRef.current.x;
    let cpuY = cpuRef.current.y;

    const resetPuck = (toward: "player" | "cpu") => {
      puckX = 500;
      puckY = 900;
      velX = toward === "player" ? 2.4 : -2.4;
      velY = toward === "player" ? 4.6 : -4.6;
      const nextPuck = { x: puckX, y: puckY };
      puckRef.current = nextPuck;
      setPuck(nextPuck);
    };

    const timer = window.setInterval(() => {
      const currentPlayer = playerRef.current;
      const playerVelocity = playerVelocityRef.current;

      puckX += velX;
      puckY += velY;

      if (puckX <= PUCK_RADIUS) {
        puckX = PUCK_RADIUS;
        velX = Math.abs(velX);
      }

      if (puckX >= WORLD_WIDTH - PUCK_RADIUS) {
        puckX = WORLD_WIDTH - PUCK_RADIUS;
        velX = -Math.abs(velX);
      }

      const topGoal =
        puckY <= PUCK_RADIUS &&
        Math.abs(puckX - WORLD_WIDTH / 2) <= GOAL_WIDTH / 2;

      const bottomGoal =
        puckY >= WORLD_HEIGHT - PUCK_RADIUS &&
        Math.abs(puckX - WORLD_WIDTH / 2) <= GOAL_WIDTH / 2;

      if (topGoal) {
        setPlayerScore((prev) => {
          const next = prev + 1;
          if (next >= WIN_SCORE) {
            setWinner("PLAYER");
            setStatus("プレイヤー勝利");
          } else {
            setStatus("プレイヤーゴール");
            resetPuck("player");
          }
          return next;
        });
      } else if (bottomGoal) {
        setCpuScore((prev) => {
          const next = prev + 1;
          if (next >= WIN_SCORE) {
            setWinner("CPU");
            setStatus("CPU勝利");
          } else {
            setStatus("CPUゴール");
            resetPuck("cpu");
          }
          return next;
        });
      } else {
        if (puckY <= PUCK_RADIUS) {
          puckY = PUCK_RADIUS;
          velY = Math.abs(velY);
        }

        if (puckY >= WORLD_HEIGHT - PUCK_RADIUS) {
          puckY = WORLD_HEIGHT - PUCK_RADIUS;
          velY = -Math.abs(velY);
        }
      }

      const puckInTopLeftCorner = puckX < 150 && puckY < 220;
      const puckInTopRightCorner = puckX > WORLD_WIDTH - 150 && puckY < 220;
      const puckInTopCorner = puckInTopLeftCorner || puckInTopRightCorner;

      const puckNearLeftWall = puckX < 135;
      const puckNearRightWall = puckX > WORLD_WIDTH - 135;
      const puckNearTopWall = puckY < 180;

      let cpuTargetX = puckX;
      let cpuTargetY = puckY - 220;

      if (puckInTopLeftCorner || puckInTopRightCorner) {
        cpuTargetX = 680;
        cpuTargetY = 220;
      } else {
        if (puckNearLeftWall) cpuTargetX += 150;
        if (puckNearRightWall) cpuTargetX -= 150;
        if (puckNearTopWall) cpuTargetY += 140;
      }

      cpuTargetX = clamp(cpuTargetX, TABLE_MIN_X, TABLE_MAX_X);
      cpuTargetY = clamp(cpuTargetY, CPU_MIN_Y, CPU_MAX_Y);

      const cpuLerp = puckInTopCorner ? 0.045 : 0.06;
      cpuX += (cpuTargetX - cpuX) * cpuLerp;
      cpuY += (cpuTargetY - cpuY) * cpuLerp;

      const collidePlayer = () => {
        const dx = puckX - currentPlayer.x;
        const dy = puckY - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = PUCK_RADIUS + MALLET_RADIUS;

        if (distance < minDistance) {
          const nx = dx / (distance || 1);
          const ny = dy / (distance || 1);

          const currentSpeed = Math.sqrt(velX * velX + velY * velY);
          const swingSpeed = Math.sqrt(
            playerVelocity.x * playerVelocity.x +
              playerVelocity.y * playerVelocity.y
          );

          const smashBoost = Math.min(4.5, swingSpeed * 0.9);
          const nextSpeed = Math.min(13, currentSpeed + 0.4 + smashBoost);

          const hitX = nx * nextSpeed + playerVelocity.x * 0.35;
          const hitY = ny * nextSpeed + playerVelocity.y * 0.35;

          velX = hitX;
          velY = hitY;

          puckX = currentPlayer.x + nx * (minDistance + 2);
          puckY = currentPlayer.y + ny * (minDistance + 2);

          if (smashBoost > 1.8) {
            setStatus("スマッシュ");
          } else {
            setStatus("プレイヤーヒット");
          }
        }
      };

      const collideCpu = () => {
        const dx = puckX - cpuX;
        const dy = puckY - cpuY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const puckInTopLeftCornerNow = puckX < 150 && puckY < 220;
        const puckInTopRightCornerNow = puckX > WORLD_WIDTH - 150 && puckY < 220;
        const puckInTopCornerNow = puckInTopLeftCornerNow || puckInTopRightCornerNow;

        const cpuHitRadius = puckInTopCornerNow
          ? PUCK_RADIUS + MALLET_RADIUS - 12
          : PUCK_RADIUS + MALLET_RADIUS - 4;

        if (distance < cpuHitRadius) {
          if (puckInTopCornerNow) {
            const escapeX = puckInTopLeftCornerNow ? 2.8 : -2.8;
            const escapeY = 6.8;

            velX = escapeX;
            velY = escapeY;

            puckX += escapeX * 2.2;
            puckY += 18;

            setStatus("CPUヒット");
            return;
          }

          const nx = dx / (distance || 1);
          const ny = dy / (distance || 1);
          const speed = Math.min(
            7.2,
            Math.sqrt(velX * velX + velY * velY) + 0.12
          );

          velX = nx * speed;
          velY = ny * speed;

          puckX = cpuX + nx * (cpuHitRadius + 10);
          puckY = cpuY + ny * (cpuHitRadius + 10);

          setStatus("CPUヒット");
        }
      };

      collidePlayer();
      collideCpu();

      if (puckY < 135 && (puckX < 120 || puckX > WORLD_WIDTH - 120)) {
        velY = Math.max(velY, 5.8);
      }

      const nextPuck = { x: puckX, y: puckY };
      const nextCpu = { x: cpuX, y: cpuY };

      puckRef.current = nextPuck;
      cpuRef.current = nextCpu;

      setPuck(nextPuck);
      setCpu(nextCpu);
    }, 16);

    return () => window.clearInterval(timer);
  }, [started, winner]);

  return {
    started,
    playerScore,
    cpuScore,
    status,
    winner,
    puck,
    player,
    cpu,
    startGame,
    backToTitle,
    updatePlayerFromWorld,
    winScore: WIN_SCORE,
  };
}

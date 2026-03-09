import { useEffect, useRef, useState } from "react";
import TitleScreen from "./components/TitleScreen";
import {
  BOTTOM_WIDTH,
  BOTTOM_Y,
  CENTER_X,
  clamp,
  CPU_MAX_Y,
  CPU_MIN_Y,
  PLAYER_MAX_Y,
  PLAYER_MIN_Y,
  screenToWorld,
  TABLE_FRONT_Y,
  TABLE_MAX_X,
  TABLE_MIN_X,
  TOP_WIDTH,
  TOP_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  worldToScreen,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./utils/projection";

const GOAL_WIDTH = 320;
const PUCK_RADIUS = 22;
const MALLET_RADIUS = 58;
const WIN_SCORE = 5;

function App() {
  const [started, setStarted] = useState(false);

  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [status, setStatus] = useState("準備完了");
  const [winner, setWinner] = useState<"PLAYER" | "CPU" | null>(null);

  const [puck, setPuck] = useState({ x: 500, y: 900 });
  const [player, setPlayer] = useState({ x: 500, y: 1350 });
  const [cpu, setCpu] = useState({ x: 500, y: 210 });

  const playerRef = useRef(player);
  const cpuRef = useRef(cpu);
  const puckRef = useRef(puck);

  const playerVelocityRef = useRef({ x: 0, y: 0 });
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

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!started || winner) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const { worldX, worldY } = screenToWorld(event.clientX, event.clientY, rect);

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

  const puckScreen = worldToScreen(puck.x, puck.y);
  const playerScreen = worldToScreen(player.x, player.y);
  const cpuScreen = worldToScreen(cpu.x, cpu.y);

  const renderMallet = (
    x: number,
    y: number,
    scale: number,
    color: string,
    glow: string
  ) => {
    const topW = 72 * scale;
    const topH = 25 * scale;
    const sideH = 16 * scale;
    const knobW = 23 * scale;
    const knobH = 17 * scale;
    const stemW = 11 * scale;
    const stemH = 9 * scale;
    const shadowW = 74 * scale;
    const shadowH = 16 * scale;

    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: topW,
          height: topH + sideH + knobH,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -2 * scale,
            width: shadowW,
            height: shadowH,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.2)",
            filter: "blur(6px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: knobH * 0.2,
            width: topW,
            height: sideH,
            transform: "translateX(-50%)",
            borderRadius: `${topW}px / ${sideH}px`,
            background: color === "#7df9ff" ? "#42c8cf" : "#d342a4",
            boxShadow: glow,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: knobH * 0.2 + sideH * 0.65,
            width: topW,
            height: topH,
            transform: "translateX(-50%)",
            borderRadius: `${topW}px / ${topH}px`,
            background: `linear-gradient(180deg, rgba(255,255,255,0.7) 0%, ${color} 28%, ${color} 72%, rgba(0,0,0,0.14) 100%)`,
            border: "1px solid rgba(255,255,255,0.24)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "42%",
            bottom: knobH * 0.2 + sideH * 0.65 + topH * 0.52,
            width: topW * 0.35,
            height: topH * 0.2,
            transform: "translateX(-50%) rotate(-8deg)",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.3)",
            filter: "blur(2px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: knobH * 0.2 + sideH * 0.75 + topH * 0.25,
            width: knobW,
            height: knobH,
            transform: "translateX(-50%)",
            borderRadius: `${knobW}px / ${knobH}px`,
            background: "linear-gradient(180deg, #ffffff, #dfe8ef 68%, #c7d0d8)",
            boxShadow: "inset 0 -3px 5px rgba(0,0,0,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "42%",
            bottom: knobH * 0.2 + sideH * 0.75 + topH * 0.4,
            width: knobW * 0.42,
            height: knobH * 0.22,
            transform: "translateX(-50%) rotate(-8deg)",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            filter: "blur(1px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: knobH * 0.2 + sideH * 0.75 + topH * 0.6,
            width: stemW,
            height: stemH,
            transform: "translateX(-50%)",
            borderRadius: `${stemW}px / ${stemH}px`,
            background: "#f7fafc",
          }}
        />
      </div>
    );
  };

  const renderPuck = (x: number, y: number, scale: number) => {
    const topW = 32 * scale;
    const topH = 11 * scale;
    const sideH = 7 * scale;
    const shadowW = 32 * scale;
    const shadowH = 9 * scale;

    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: topW,
          height: topH + sideH,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -1 * scale,
            width: shadowW,
            height: shadowH,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.2)",
            filter: "blur(4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: topW,
            height: sideH,
            transform: "translateX(-50%)",
            borderRadius: `${topW}px / ${sideH}px`,
            background: "#b7c0c8",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: sideH * 0.55,
            width: topW,
            height: topH,
            transform: "translateX(-50%)",
            borderRadius: `${topW}px / ${topH}px`,
            background:
              "linear-gradient(180deg, #ffffff 0%, #eef1f4 48%, #d5dbe1 100%)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 0 8px rgba(255,255,255,0.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "40%",
            bottom: sideH * 0.55 + topH * 0.45,
            width: topW * 0.34,
            height: topH * 0.2,
            transform: "translateX(-50%) rotate(-10deg)",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.5)",
            filter: "blur(1px)",
          }}
        />
      </div>
    );
  };

  const renderArenaBackground = () => {
    return (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 18%, rgba(125,249,255,0.16), rgba(125,249,255,0.02) 24%, rgba(0,0,0,0) 48%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 22%, rgba(255,95,210,0.13), rgba(255,95,210,0) 26%), radial-gradient(circle at 82% 26%, rgba(125,249,255,0.12), rgba(125,249,255,0) 28%), radial-gradient(circle at 50% 86%, rgba(255,185,0,0.08), rgba(255,185,0,0) 32%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed",
            left: "-10%",
            right: "-10%",
            bottom: "-6%",
            height: "36vh",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), radial-gradient(ellipse at center, rgba(255,255,255,0.05), rgba(255,255,255,0) 68%)",
            transform: "perspective(700px) rotateX(72deg)",
            transformOrigin: "center bottom",
            opacity: 0.26,
            pointerEvents: "none",
          }}
        />
      </>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1b2742 0%, #0b1020 48%, #04070f 100%)",
        color: "white",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {renderArenaBackground()}

      <div style={{ position: "relative", zIndex: 1 }}>
        <h1
          style={{
            textAlign: "center",
            color: "#7df9ff",
            marginTop: 0,
            marginBottom: 14,
            textShadow: "0 0 16px rgba(125,249,255,0.45)",
            fontSize: 40,
          }}
        >
          エアホッケーWeb
        </h1>

        {!started ? (
          <TitleScreen
            onStart={startGame}
            renderMallet={renderMallet}
            renderPuck={renderPuck}
          />
        ) : (
          <div
            style={{
              maxWidth: "1120px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "160px 1fr 160px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(125,249,255,0.2)",
                borderRadius: 22,
                padding: 16,
                background:
                  "linear-gradient(180deg, rgba(125,249,255,0.08), rgba(255,255,255,0.03))",
                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                プレイヤー
              </div>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#7df9ff" }}>
                {playerScore}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>
                {WIN_SCORE}点先取
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    fontWeight: "bold",
                    color:
                      status === "スマッシュ" ||
                      status === "プレイヤーヒット" ||
                      status === "プレイヤーゴール" ||
                      status === "プレイヤー勝利"
                        ? "#7df9ff"
                        : status === "CPUヒット" ||
                          status === "CPUゴール" ||
                          status === "CPU勝利"
                        ? "#ff5fd2"
                        : "white",
                  }}
                >
                  {status}
                </div>

                <div
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 13,
                    opacity: 0.85,
                  }}
                >
                  {WIN_SCORE}点先取
                </div>
              </div>

              <div
                onMouseMove={handleMove}
                style={{
                  width: VIEW_WIDTH,
                  height: VIEW_HEIGHT,
                  margin: "0 auto",
                  position: "relative",
                  cursor: winner ? "default" : "crosshair",
                  userSelect: "none",
                  transform: "scale(0.92)",
                  transformOrigin: "top center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: CENTER_X - BOTTOM_WIDTH / 2 + 35,
                    top: TABLE_FRONT_Y + 24,
                    width: BOTTOM_WIDTH - 70,
                    height: 40,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.3)",
                    filter: "blur(18px)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 30,
                    border: "1px solid rgba(125,249,255,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008))",
                  }}
                />

                <svg width={VIEW_WIDTH} height={VIEW_HEIGHT} style={{ position: "absolute" }}>
                  <defs>
                    <linearGradient id="tableFillMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff2a6" />
                      <stop offset="18%" stopColor="#f9d96e" />
                      <stop offset="46%" stopColor="#f3c53c" />
                      <stop offset="72%" stopColor="#efbb28" />
                      <stop offset="100%" stopColor="#dd9f12" />
                    </linearGradient>
                    <radialGradient id="tableLightMain" cx="34%" cy="26%" r="58%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                      <stop offset="38%" stopColor="rgba(255,255,255,0.18)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                    <radialGradient id="tableShadeMain" cx="75%" cy="78%" r="55%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.16)" />
                      <stop offset="55%" stopColor="rgba(0,0,0,0.05)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </radialGradient>
                  </defs>

                  <polygon
                    points={`${CENTER_X - TOP_WIDTH / 2},${TOP_Y} ${CENTER_X - BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X - BOTTOM_WIDTH / 2 - 28},${TABLE_FRONT_Y} ${CENTER_X - TOP_WIDTH / 2 - 12},${TOP_Y + 12}`}
                    fill="#d7d7d7"
                  />
                  <polygon
                    points={`${CENTER_X + TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X + BOTTOM_WIDTH / 2 + 28},${TABLE_FRONT_Y} ${CENTER_X + TOP_WIDTH / 2 + 12},${TOP_Y + 12}`}
                    fill="#dcdcdc"
                  />
                  <polygon
                    points={`${CENTER_X - BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X + BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X + BOTTOM_WIDTH / 2 + 28},${TABLE_FRONT_Y} ${CENTER_X - BOTTOM_WIDTH / 2 - 28},${TABLE_FRONT_Y}`}
                    fill="#f2f2f2"
                  />
                  <polygon
                    points={`${CENTER_X - TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X - BOTTOM_WIDTH / 2},${BOTTOM_Y}`}
                    fill="url(#tableFillMain)"
                    stroke="#ececec"
                    strokeWidth="12"
                  />
                  <polygon
                    points={`${CENTER_X - TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X - BOTTOM_WIDTH / 2},${BOTTOM_Y}`}
                    fill="url(#tableLightMain)"
                    opacity="0.95"
                  />
                  <polygon
                    points={`${CENTER_X - TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + TOP_WIDTH / 2},${TOP_Y} ${CENTER_X + BOTTOM_WIDTH / 2},${BOTTOM_Y} ${CENTER_X - BOTTOM_WIDTH / 2},${BOTTOM_Y}`}
                    fill="url(#tableShadeMain)"
                    opacity="0.9"
                  />
                </svg>

                <div
                  style={{
                    position: "absolute",
                    left: CENTER_X,
                    top: TOP_Y,
                    width: TOP_WIDTH,
                    height: BOTTOM_Y - TOP_Y,
                    transform: "translateX(-50%)",
                    clipPath: "polygon(0% 0%, 100% 0%, 123% 100%, -23% 100%)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      width: 2,
                      height: "100%",
                      transform: "translateX(-50%)",
                      background: "rgba(255,255,255,0.55)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: "64%",
                      height: "0.9%",
                      transform: "translate(-50%, -50%)",
                      background: "rgba(255,255,255,0.72)",
                      boxShadow: "0 0 8px rgba(255,255,255,0.18)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: "64%",
                      height: "2.8%",
                      transform: "translate(-50%, -50%)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "0.4%",
                      width: "29%",
                      height: "8.5%",
                      transform: "translateX(-50%)",
                      borderBottom: "3px solid rgba(255,255,255,0.98)",
                      borderLeft: "3px solid rgba(255,255,255,0.98)",
                      borderRight: "3px solid rgba(255,255,255,0.98)",
                      borderRadius: "0 0 50% 50% / 0 0 70% 70%",
                      background: "rgba(255,140,0,0.11)",
                      boxShadow: "0 0 10px rgba(255,255,255,0.12)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: "0.2%",
                      width: "40%",
                      height: "12.6%",
                      transform: "translateX(-50%)",
                      borderTop: "5px solid rgba(255,255,255,0.98)",
                      borderLeft: "5px solid rgba(255,255,255,0.98)",
                      borderRight: "5px solid rgba(255,255,255,0.98)",
                      borderRadius: "50% 50% 0 0 / 70% 70% 0 0",
                      background: "rgba(255,140,0,0.16)",
                      boxShadow: "0 0 12px rgba(255,255,255,0.12)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: 0,
                      width: "45%",
                      height: "7%",
                      transform: "translateX(-50%)",
                      background: "#1532ff",
                      boxShadow: "0 0 16px rgba(21,50,255,0.45)",
                    }}
                  />
                </div>

                {renderMallet(
                  cpuScreen.x,
                  cpuScreen.y,
                  cpuScreen.scale,
                  "#ff5fd2",
                  "0 0 14px rgba(255,95,210,0.38)"
                )}
                {renderMallet(
                  playerScreen.x,
                  playerScreen.y,
                  playerScreen.scale,
                  "#7df9ff",
                  "0 0 14px rgba(125,249,255,0.4)"
                )}
                {renderPuck(puckScreen.x, puckScreen.y, puckScreen.scale)}
              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setStarted(false)}
                  style={{
                    padding: "11px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: "transparent",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  戻る
                </button>

                {winner && (
                  <button
                    onClick={startGame}
                    style={{
                      padding: "11px 18px",
                      borderRadius: 999,
                      border: "none",
                      background: "#7df9ff",
                      color: "#08101f",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    もう一度
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>CPU</div>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#ff5fd2" }}>
                {cpuScore}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>
                {WIN_SCORE}点先取
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
import Mallet from "./Mallet";
import Puck from "./Puck";
import {
  BOTTOM_WIDTH,
  BOTTOM_Y,
  CENTER_X,
  TABLE_FRONT_Y,
  TOP_WIDTH,
  TOP_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../utils/projection";

type ScreenObject = {
  x: number;
  y: number;
  scale: number;
};

type GameBoardProps = {
  winner: "PLAYER" | "CPU" | null;
  status: string;
  winScore: number;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onBack: () => void;
  onRestart: () => void;
  cpuScreen: ScreenObject;
  playerScreen: ScreenObject;
  puckScreen: ScreenObject;
};

function GameBoard({
  winner,
  status,
  winScore,
  onMouseMove,
  onBack,
  onRestart,
  cpuScreen,
  playerScreen,
  puckScreen,
}: GameBoardProps) {
  const topLeftX = CENTER_X - TOP_WIDTH / 2;
  const topRightX = CENTER_X + TOP_WIDTH / 2;
  const bottomLeftX = CENTER_X - BOTTOM_WIDTH / 2;
  const bottomRightX = CENTER_X + BOTTOM_WIDTH / 2;

  return (
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
          {winScore}点先取
        </div>
      </div>

      <div
        onMouseMove={onMouseMove}
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
            points={`${topLeftX},${TOP_Y} ${bottomLeftX},${BOTTOM_Y} ${bottomLeftX - 28},${TABLE_FRONT_Y} ${topLeftX - 12},${TOP_Y + 12}`}
            fill="#d7d7d7"
          />
          <polygon
            points={`${topRightX},${TOP_Y} ${bottomRightX},${BOTTOM_Y} ${bottomRightX + 28},${TABLE_FRONT_Y} ${topRightX + 12},${TOP_Y + 12}`}
            fill="#dcdcdc"
          />
          <polygon
            points={`${bottomLeftX},${BOTTOM_Y} ${bottomRightX},${BOTTOM_Y} ${bottomRightX + 28},${TABLE_FRONT_Y} ${bottomLeftX - 28},${TABLE_FRONT_Y}`}
            fill="#f2f2f2"
          />
          <polygon
            points={`${topLeftX},${TOP_Y} ${topRightX},${TOP_Y} ${bottomRightX},${BOTTOM_Y} ${bottomLeftX},${BOTTOM_Y}`}
            fill="url(#tableFillMain)"
            stroke="#ececec"
            strokeWidth="12"
          />
          <polygon
            points={`${topLeftX},${TOP_Y} ${topRightX},${TOP_Y} ${bottomRightX},${BOTTOM_Y} ${bottomLeftX},${BOTTOM_Y}`}
            fill="url(#tableLightMain)"
            opacity="0.95"
          />
          <polygon
            points={`${topLeftX},${TOP_Y} ${topRightX},${TOP_Y} ${bottomRightX},${BOTTOM_Y} ${bottomLeftX},${BOTTOM_Y}`}
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

        <Mallet
          x={cpuScreen.x}
          y={cpuScreen.y}
          scale={cpuScreen.scale}
          color="#ff5fd2"
          glow="0 0 14px rgba(255,95,210,0.38)"
        />
        <Mallet
          x={playerScreen.x}
          y={playerScreen.y}
          scale={playerScreen.scale}
          color="#7df9ff"
          glow="0 0 14px rgba(125,249,255,0.4)"
        />
        <Puck x={puckScreen.x} y={puckScreen.y} scale={puckScreen.scale} />
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
          onClick={onBack}
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
            onClick={onRestart}
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
  );
}

export default GameBoard;
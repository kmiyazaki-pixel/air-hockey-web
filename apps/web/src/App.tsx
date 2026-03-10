import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import GameBoard from "./components/GameBoard";
import ScorePanel from "./components/ScorePanel";
import TitleScreen from "./components/TitleScreen";
import Mallet from "./components/Mallet";
import Puck from "./components/Puck";
import { screenToWorld, worldToScreen } from "./utils/projection";
import { useAirHockeyGame } from "./hooks/useAirHockeyGame";
import { useOnlineGame } from "./hooks/useOnlineGame";

type Mode = "title" | "cpu" | "online";

function App() {
  const [mode, setMode] = useState<Mode>("title");

  const cpuGame = useAirHockeyGame();
  const onlineGame = useOnlineGame();

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

  const handleCpuMove = (event: MouseEvent<HTMLDivElement>) => {
    if (cpuGame.winner) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const { worldX, worldY } = screenToWorld(
      event.clientX,
      event.clientY,
      rect
    );

    cpuGame.updatePlayerFromWorld(worldX, worldY);
  };

  const handleOnlineMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!onlineGame.playerNumber) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const { worldX, worldY } = screenToWorld(
      event.clientX,
      event.clientY,
      rect
    );

    onlineGame.sendMove(worldX, worldY);
  };

  const cpuPuckScreen = worldToScreen(cpuGame.puck.x, cpuGame.puck.y);
  const cpuPlayerScreen = worldToScreen(cpuGame.player.x, cpuGame.player.y);
  const cpuOpponentScreen = worldToScreen(cpuGame.cpu.x, cpuGame.cpu.y);

  const onlinePuckScreen = worldToScreen(
    onlineGame.viewState.puck.x,
    onlineGame.viewState.puck.y
  );
  const onlinePlayerScreen = worldToScreen(
    onlineGame.viewState.me.x,
    onlineGame.viewState.me.y
  );
  const onlineOpponentScreen = worldToScreen(
    onlineGame.viewState.opponent.x,
    onlineGame.viewState.opponent.y
  );

  const backToTitle = () => setMode("title");

  const renderTitle = () => (
    <>
      <TitleScreen
        onStart={() => {
          cpuGame.startGame();
          setMode("cpu");
        }}
        renderMallet={(x, y, scale, color, glow) => (
          <Mallet x={x} y={y} scale={scale} color={color} glow={glow} />
        )}
        renderPuck={(x, y, scale) => <Puck x={x} y={y} scale={scale} />}
      />

      <div
        style={{
          maxWidth: 1160,
          margin: "18px auto 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <button
          onClick={() => {
            cpuGame.startGame();
            setMode("cpu");
          }}
          style={modeButtonStyle("#7df9ff")}
        >
          CPU対戦を始める
        </button>

        <button
          onClick={() => setMode("online")}
          style={modeButtonStyle("#ff5fd2")}
        >
          オンライン対戦 β
        </button>
      </div>
    </>
  );

  const renderCpu = () => (
    <div style={boardShellStyle}>
      <ScorePanel
        label="プレイヤー"
        score={cpuGame.playerScore}
        color="#7df9ff"
        winScore={cpuGame.winScore}
      />

      <GameBoard
        winner={cpuGame.winner}
        status={cpuGame.status}
        winScore={cpuGame.winScore}
        onMouseMove={handleCpuMove}
        onBack={() => {
          cpuGame.backToTitle();
          backToTitle();
        }}
        onRestart={cpuGame.startGame}
        cpuScreen={cpuOpponentScreen}
        playerScreen={cpuPlayerScreen}
        puckScreen={cpuPuckScreen}
      />

      <ScorePanel
        label="CPU"
        score={cpuGame.cpuScore}
        color="#ff5fd2"
        winScore={cpuGame.winScore}
      />
    </div>
  );

  const renderOnline = () => (
    <>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto 16px",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 16,
        }}
      >
        <div style={panelStyle}>
          <div
            style={{
              fontWeight: "bold",
              color: "#7df9ff",
              marginBottom: 10,
            }}
          >
            オンライン対戦 β
          </div>

          <div style={{ opacity: 0.86, lineHeight: 1.7, marginBottom: 14 }}>
            1人がルームを作成、もう1人がコードを入力して参加します。
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <button
              onClick={onlineGame.createRoom}
              style={modeButtonStyle("#7df9ff")}
            >
              ルーム作成
            </button>

            <input
              value={onlineGame.joinInput}
              onChange={(event) =>
                onlineGame.setJoinInput(event.target.value.toUpperCase())
              }
              placeholder="ルームコード"
              style={inputStyle}
            />

            <button
              onClick={onlineGame.joinRoom}
              style={modeButtonStyle("#ff5fd2")}
            >
              参加
            </button>
          </div>

          <div style={{ display: "grid", gap: 6, fontSize: 14, opacity: 0.92 }}>
            <div>接続: {onlineGame.connected ? "接続中" : "未接続"}</div>
            <div>ルーム: {onlineGame.roomId || "未参加"}</div>
            <div>
              あなたの番号:{" "}
              {onlineGame.playerNumber
                ? `P${onlineGame.playerNumber}`
                : "未確定"}
            </div>
            <div>
              相手: {onlineGame.viewState.opponentConnected ? "参加済み" : "待機中"}
            </div>
            {onlineGame.error ? (
              <div style={{ color: "#ff9ab5" }}>{onlineGame.error}</div>
            ) : null}
          </div>
        </div>

        <div style={panelStyle}>
          <div
            style={{
              fontWeight: "bold",
              color: "#ffdd88",
              marginBottom: 10,
            }}
          >
            Render 設定
          </div>

          <div style={{ lineHeight: 1.8, opacity: 0.9, fontSize: 14 }}>
            Web に <code>VITE_WS_URL</code> を設定。値は API の{" "}
            <code>wss://.../ws</code>。
            API は Web Service で起動してください。
          </div>
        </div>
      </div>

      <div style={boardShellStyle}>
        <ScorePanel
          label="あなた"
          score={onlineGame.viewState.myScore}
          color="#7df9ff"
          winScore={5}
        />

        <GameBoard
          winner={onlineGame.viewState.winner}
          status={onlineGame.roomState.status}
          winScore={5}
          onMouseMove={handleOnlineMove}
          onBack={backToTitle}
          onRestart={onlineGame.restart}
          cpuScreen={onlineOpponentScreen}
          playerScreen={onlinePlayerScreen}
          puckScreen={onlinePuckScreen}
        />

        <ScorePanel
          label="相手"
          score={onlineGame.viewState.opponentScore}
          color="#ff5fd2"
          winScore={5}
        />
      </div>
    </>
  );

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

        {mode === "title"
          ? renderTitle()
          : mode === "cpu"
            ? renderCpu()
            : renderOnline()}
      </div>
    </div>
  );
}

const boardShellStyle: CSSProperties = {
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "160px 1fr 160px",
  gap: 16,
  alignItems: "start",
};

const panelStyle: CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  padding: 18,
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 180,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "12px 14px",
  fontSize: 16,
  letterSpacing: 2,
};

function modeButtonStyle(color: string): CSSProperties {
  return {
    border: `1px solid ${color}`,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    color,
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  };
}

export default App;

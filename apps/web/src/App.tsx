import GameBoard from "./components/GameBoard";
import ScorePanel from "./components/ScorePanel";
import TitleScreen from "./components/TitleScreen";
import Mallet from "./components/Mallet";
import Puck from "./components/Puck";
import { screenToWorld, worldToScreen } from "./utils/projection";
import { useAirHockeyGame } from "./hooks/useAirHockeyGame";

function App() {
  const {
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
    winScore,
  } = useAirHockeyGame();

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (winner) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const { worldX, worldY } = screenToWorld(event.clientX, event.clientY, rect);
    updatePlayerFromWorld(worldX, worldY);
  };

  const puckScreen = worldToScreen(puck.x, puck.y);
  const playerScreen = worldToScreen(player.x, player.y);
  const cpuScreen = worldToScreen(cpu.x, cpu.y);

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
            renderMallet={(x, y, scale, color, glow) => (
              <Mallet x={x} y={y} scale={scale} color={color} glow={glow} />
            )}
            renderPuck={(x, y, scale) => <Puck x={x} y={y} scale={scale} />}
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
            <ScorePanel
              label="プレイヤー"
              score={playerScore}
              color="#7df9ff"
              winScore={winScore}
            />

            <GameBoard
              winner={winner}
              status={status}
              winScore={winScore}
              onMouseMove={handleMove}
              onBack={backToTitle}
              onRestart={startGame}
              cpuScreen={cpuScreen}
              playerScreen={playerScreen}
              puckScreen={puckScreen}
            />

            <ScorePanel
              label="CPU"
              score={cpuScore}
              color="#ff5fd2"
              winScore={winScore}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
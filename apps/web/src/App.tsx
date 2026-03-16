import { useState } from "react";
import { useAirHockeyGame, type CpuDifficulty } from "./hooks/useAirHockeyGame";
import { TitleScreen } from "./components/TitleScreen";
import GameBoard from "./components/GameBoard";
import ScorePanel from "./components/ScorePanel";

type Mode = "title" | "cpu" | "online";

export default function App() {
  const [mode, setMode] = useState<Mode>("title");
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");

  const cpuGame = useAirHockeyGame(difficulty);

  if (mode === "title") {
    return (
      <TitleScreen
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onStartCpu={() => setMode("cpu")}
        onStartOnline={() => setMode("online")}
      />
    );
  }

  if (mode === "cpu") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          background: "#0b1020",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1100 }}>
          <ScorePanel
            playerScore={cpuGame.playerScore}
            opponentScore={cpuGame.cpuScore}
            label={cpuGame.statusText}
            onBack={() => setMode("title")}
            onRestart={cpuGame.restart}
          />
          <GameBoard
            mode="cpu"
            player={cpuGame.player}
            opponent={cpuGame.cpu}
            puck={cpuGame.puck}
            winner={cpuGame.winner}
            onMove={cpuGame.movePlayer}
          />
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b1020",
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: 16 }}>オンライン画面は既存の実装を使ってください</p>
        <button onClick={() => setMode("title")}>戻る</button>
      </div>
    </main>
  );
}

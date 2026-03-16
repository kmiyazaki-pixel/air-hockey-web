import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import GameBoard from "./components/GameBoard";
import ScorePanel from "./components/ScorePanel";
import { TitleScreen } from "./components/TitleScreen";
import { screenToWorld, worldToScreen } from "./utils/projection";
import { useAirHockeyGame, type CpuDifficulty } from "./hooks/useAirHockeyGame";
import { useOnlineGame } from "./hooks/useOnlineGame";
import {
  fetchCpuRanking,
  submitCpuRanking,
  formatTimeMs,
  type CpuRankingEntry,
} from "./utils/cpuRanking";

type Mode = "title" | "cpu" | "online";

const WIN_SCORE = 5;

function App() {
  const [mode, setMode] = useState<Mode>("title");
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");

  const cpuGame = useAirHockeyGame(difficulty);
  const onlineGame = useOnlineGame();

  const [rankingStore, setRankingStore] = useState<
    Record<CpuDifficulty, CpuRankingEntry[]>
  >({
    easy: [],
    normal: [],
    hard: [],
  });
  const [rankingSubmitted, setRankingSubmitted] = useState(false);

  const pendingOnlineMoveRef = useRef<{ x: number; y: number } | null>(null);
  const onlineMoveRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (onlineMoveRafRef.current !== null) {
        cancelAnimationFrame(onlineMoveRafRef.current);
        onlineMoveRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const items = await fetchCpuRanking(difficulty);
        if (cancelled) return;

        setRankingStore((prev) => ({
          ...prev,
          [difficulty]: items,
        }));
      } catch (error) {
        console.error(error);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  useEffect(() => {
    if (mode !== "cpu") return;
    if (cpuGame.winner !== "PLAYER") return;
    if (cpuGame.clearTimeMs == null) return;
    if (rankingSubmitted) return;

    const run = async () => {
      const defaultName = "NO NAME";
      const inputName = window.prompt(
        `クリアタイム: ${formatTimeMs(
          cpuGame.clearTimeMs
        )}\nランキングに登録する名前を入力してください`,
        defaultName
      );

      if (inputName === null) {
        setRankingSubmitted(true);
        return;
      }

      try {
        const items = await submitCpuRanking(
          cpuGame.difficulty,
          inputName,
          cpuGame.clearTimeMs
        );

        setRankingStore((prev) => ({
          ...prev,
          [cpuGame.difficulty]: items,
        }));
      } catch (error) {
        console.error(error);
        window.alert("ランキング送信に失敗しました。");
      } finally {
        setRankingSubmitted(true);
      }
    };

    run();
  }, [
    mode,
    cpuGame.winner,
    cpuGame.clearTimeMs,
    cpuGame.difficulty,
    rankingSubmitted,
  ]);

  const flushOnlineMove = () => {
    onlineMoveRafRef.current = null;
    const move = pendingOnlineMoveRef.current;
    pendingOnlineMoveRef.current = null;
    if (!move) return;
    if (!onlineGame.playerNumber) return;
    onlineGame.sendMove(move.x, move.y);
  };

  const scheduleOnlineMove = (worldX: number, worldY: number) => {
    pendingOnlineMoveRef.current = { x: worldX, y: worldY };
    if (onlineMoveRafRef.current !== null) return;
    onlineMoveRafRef.current = requestAnimationFrame(flushOnlineMove);
  };

  const renderArenaBackground = () => (
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
    </>
  );

  const handleCpuMove = (event: MouseEvent<HTMLDivElement>) => {
    if (cpuGame.winner) return;
    const rect = event.currentTarget.getBoundingClientRect();
    cpuGame.movePlayer(event.clientX, event.clientY, rect);
  };

  const handleOnlineMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!onlineGame.playerNumber) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const { worldX, worldY } = screenToWorld(event.clientX, event.clientY, rect);
    scheduleOnlineMove(worldX, worldY);
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
    <TitleScreen
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      onStartCpu={() => {
        setRankingSubmitted(false);
        cpuGame.restart();
        setMode("cpu");
      }}
      onStartOnline={() => setMode("online")}
    />
  );

  const renderCpu = () => (
    <>
      <div style={boardShellStyle}>
        <ScorePanel
          label="プレイヤー"
          score={cpuGame.playerScore}
          color="#7df9ff"
          winScore={WIN_SCORE}
        />

        <GameBoard
          winner={cpuGame.winner}
          status={cpuGame.statusText}
          winScore={WIN_SCORE}
          onMouseMove={handleCpuMove}
          onBack={backToTitle}
          onRestart={() => {
            setRankingSubmitted(false);
            cpuGame.restart();
          }}
          cpuScreen={cpuOpponentScreen}
          playerScreen={cpuPlayerScreen}
          puckScreen={cpuPuckScreen}
        />

        <ScorePanel
          label="CPU"
          score={cpuGame.cpuScore}
          color="#ff5fd2"
          winScore={WIN_SCORE}
        />
      </div>

      <div
        style={{
          maxWidth: 1160,
          margin: "16px auto 0",
          padding: 18,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 12 }}>
          {cpuGame.difficulty.toUpperCase()} 最短クリアランキング
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {rankingStore[cpuGame.difficulty].length === 0 ? (
            <div style={{ opacity: 0.7 }}>まだ記録がありません</div>
          ) : (
            rankingStore[cpuGame.difficulty].map(
              (entry: CpuRankingEntry, index: number) => (
                <div
                  key={`${entry.id}-${entry.createdAt}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr 120px",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div>#{index + 1}</div>
                  <div>{entry.name}</div>
                  <div style={{ textAlign: "right" }}>
                    {formatTimeMs(entry.timeMs)}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
    </>
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
          <div style={{ fontWeight: "bold", color: "#7df9ff", marginBottom: 10 }}>
            オンライン対戦 β
          </div>

          <div style={{ opacity: 0.86, lineHeight: 1.7, marginBottom: 14 }}>
            同じ4桁の数字を入力すると同じ部屋に入ります。
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <input
              value={onlineGame.joinInput}
              onChange={(event) =>
                onlineGame.setJoinInput(
                  event.target.value.replace(/\D/g, "").slice(0, 4)
                )
              }
              placeholder="4桁の数字"
              style={inputStyle}
            />

            <button onClick={onlineGame.createRoom} style={modeButtonStyle("#7df9ff")}>
              作成
            </button>

            <button onClick={onlineGame.joinRoom} style={modeButtonStyle("#ff5fd2")}>
              入室
            </button>
          </div>

          <div style={{ fontSize: 14, opacity: 0.82, lineHeight: 1.8 }}>
            <div>接続状態: {onlineGame.connected ? "接続中" : "未接続"}</div>
            <div>ルーム: {onlineGame.roomId || "未参加"}</div>
            <div>
              プレイヤー番号:{" "}
              {onlineGame.playerNumber ? `P${onlineGame.playerNumber}` : "-"}
            </div>
            <div>状態: {onlineGame.roomState.status}</div>
            {onlineGame.error && (
              <div style={{ color: "#ff9fbf" }}>エラー: {onlineGame.error}</div>
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontWeight: "bold", marginBottom: 10 }}>対戦情報</div>
          <div style={{ lineHeight: 1.9, opacity: 0.86 }}>
            <div>自分: {onlineGame.viewState.myScore}</div>
            <div>相手: {onlineGame.viewState.opponentScore}</div>
            <div>
              相手の接続: {onlineGame.viewState.opponentConnected ? "接続中" : "未接続"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={onlineGame.restart} style={modeButtonStyle("#7df9ff")}>
              再戦
            </button>
            <button onClick={backToTitle} style={modeButtonStyle("#ffffff")}>
              戻る
            </button>
          </div>
        </div>
      </div>

      <div style={boardShellStyle}>
        <ScorePanel
          label="相手"
          score={onlineGame.viewState.opponentScore}
          color="#ff5fd2"
          winScore={WIN_SCORE}
        />

        <GameBoard
          winner={onlineGame.viewState.winner}
          status={onlineGame.roomState.status}
          winScore={WIN_SCORE}
          onMouseMove={handleOnlineMove}
          onBack={backToTitle}
          onRestart={onlineGame.restart}
          cpuScreen={onlineOpponentScreen}
          playerScreen={onlinePlayerScreen}
          puckScreen={onlinePuckScreen}
        />

        <ScorePanel
          label="あなた"
          score={onlineGame.viewState.myScore}
          color="#7df9ff"
          winScore={WIN_SCORE}
        />
      </div>
    </>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        background:
          "radial-gradient(circle at top, rgba(30,41,59,1) 0%, rgba(2,6,23,1) 38%, rgba(2,6,23,1) 100%)",
        padding: "28px 18px 44px",
        fontFamily:
          "'Inter', 'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {renderArenaBackground()}
      <div style={{ position: "relative", zIndex: 1 }}>
        {mode === "title" && renderTitle()}
        {mode === "cpu" && renderCpu()}
        {mode === "online" && renderOnline()}
      </div>
    </div>
  );
}

const boardShellStyle: CSSProperties = {
  maxWidth: 1160,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "150px 1fr 150px",
  gap: 18,
  alignItems: "start",
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: 18,
  background: "rgba(255,255,255,0.04)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 180,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  color: "white",
  padding: "12px 14px",
  fontSize: 16,
  outline: "none",
};

const modeButtonStyle = (accent: string): CSSProperties => ({
  appearance: "none",
  border: `1px solid ${accent}44`,
  borderRadius: 16,
  padding: "12px 16px",
  background:
    accent === "#ffffff"
      ? "rgba(255,255,255,0.08)"
      : `linear-gradient(180deg, ${accent}22, ${accent}10)`,
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
  letterSpacing: 0.3,
  cursor: "pointer",
  boxShadow:
    accent === "#ffffff"
      ? "0 10px 24px rgba(0,0,0,0.16)"
      : `0 0 0 1px ${accent}22 inset, 0 10px 24px rgba(0,0,0,0.18)`,
});

export default App;

import type { CpuDifficulty } from "../hooks/useAirHockeyGame";

type Props = {
  difficulty: CpuDifficulty;
  onDifficultyChange: (difficulty: CpuDifficulty) => void;
  onStartCpu: () => void;
  onStartOnline: () => void;
};

const difficulties: CpuDifficulty[] = ["easy", "normal", "hard"];

export function TitleScreen({
  difficulty,
  onDifficultyChange,
  onStartCpu,
  onStartOnline,
}: Props) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(circle at top, #1f3b73 0%, #0b1020 55%, #05070f 100%)",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          padding: 24,
          borderRadius: 24,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginBottom: 12 }}>
          Air Hockey
        </h1>
        <p style={{ opacity: 0.85, marginBottom: 28 }}>
          CPU対戦かオンライン対戦を選んでください
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>CPU難易度</h2>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {difficulties.map((level) => {
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  onClick={() => onDifficultyChange(level)}
                  style={{
                    minWidth: 110,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: active ? "2px solid #7dd3fc" : "1px solid rgba(255,255,255,0.2)",
                    background: active ? "rgba(125,211,252,0.18)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 700,
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 14,
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          <button
            onClick={onStartCpu}
            style={{
              padding: "16px 20px",
              borderRadius: 16,
              border: "none",
              background: "#38bdf8",
              color: "#062033",
              fontWeight: 800,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            CPU対戦を始める
          </button>

          <button
            onClick={onStartOnline}
            style={{
              padding: "16px 20px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            オンライン対戦
          </button>
        </div>
      </div>
    </main>
  );
}

import type { CpuDifficulty } from "../hooks/useAirHockeyGame";

type TitleScreenProps = {
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
}: TitleScreenProps) {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "48px 24px 24px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2.8rem, 7vw, 5rem)",
          margin: "0 0 12px",
          letterSpacing: 1.5,
          color: "#fff",
          textShadow: "0 0 28px rgba(125,249,255,0.22)",
        }}
      >
        AIR HOCKEY
      </h1>

      <p
        style={{
          margin: "0 auto 28px",
          maxWidth: 640,
          lineHeight: 1.8,
          opacity: 0.88,
          fontSize: 16,
        }}
      >
        CPU対戦またはオンライン対戦を選べます。CPU対戦では難易度を選択できます。
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        {difficulties.map((level) => {
          const active = difficulty === level;

          return (
            <button
              key={level}
              onClick={() => onDifficultyChange(level)}
              style={{
                appearance: "none",
                border: active
                  ? "1px solid rgba(125,249,255,0.7)"
                  : "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "12px 18px",
                background: active
                  ? "linear-gradient(180deg, rgba(125,249,255,0.22), rgba(125,249,255,0.08))"
                  : "rgba(255,255,255,0.05)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "capitalize",
                boxShadow: active ? "0 0 0 1px rgba(125,249,255,0.16) inset" : "none",
              }}
            >
              {level}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <button
          onClick={onStartCpu}
          style={{
            appearance: "none",
            border: "1px solid rgba(125,249,255,0.32)",
            borderRadius: 20,
            padding: "18px 20px",
            background:
              "linear-gradient(180deg, rgba(125,249,255,0.18), rgba(125,249,255,0.06))",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 800,
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
          }}
        >
          CPU対戦を始める
        </button>

        <button
          onClick={onStartOnline}
          style={{
            appearance: "none",
            border: "1px solid rgba(255,95,210,0.28)",
            borderRadius: 20,
            padding: "18px 20px",
            background:
              "linear-gradient(180deg, rgba(255,95,210,0.16), rgba(255,95,210,0.05))",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 800,
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
          }}
        >
          オンライン対戦
        </button>
      </div>
    </div>
  );
}

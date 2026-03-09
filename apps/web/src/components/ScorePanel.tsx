type ScorePanelProps = {
  label: string;
  score: number;
  color: string;
  winScore: number;
};

function ScorePanel({ label, score, color, winScore }: ScorePanelProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: "bold", color }}>{score}</div>
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>
        {winScore}点先取
      </div>
    </div>
  );
}

export default ScorePanel;
type PuckProps = {
  x: number;
  y: number;
  scale: number;
};

function Puck({ x, y, scale }: PuckProps) {
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
}

export default Puck;
type MalletProps = {
  x: number;
  y: number;
  scale: number;
  color: string;
  glow: string;
};

function Mallet({ x, y, scale, color, glow }: MalletProps) {
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
}

export default Mallet;
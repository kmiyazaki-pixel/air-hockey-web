type TitleScreenProps = {
  onStart: () => void;
  renderMallet: (
    x: number,
    y: number,
    scale: number,
    color: string,
    glow: string
  ) => React.ReactNode;
  renderPuck: (x: number, y: number, scale: number) => React.ReactNode;
};

function TitleScreen({ onStart, renderMallet, renderPuck }: TitleScreenProps) {
  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        border: "1px solid rgba(125,249,255,0.16)",
        borderRadius: 30,
        padding: "28px 28px 34px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
        boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div
          style={{
            letterSpacing: 4,
            fontSize: 11,
            opacity: 0.72,
            marginBottom: 10,
          }}
        >
          FUTURISTIC ARCADE RINK
        </div>

        <div
          style={{
            fontSize: 58,
            fontWeight: "bold",
            color: "#7df9ff",
            textShadow: "0 0 24px rgba(125,249,255,0.46)",
            marginBottom: 14,
          }}
        >
          エアホッケーWeb
        </div>

        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            fontSize: 17,
            lineHeight: 1.8,
            opacity: 0.9,
          }}
        >
          奥行きのあるテーブル表現、立体感のあるマレットとパック、
          CPU対戦、スコア、5点先取まで入ったエアホッケー風のWebアプリです。
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderRadius: 26,
            border: "1px solid rgba(125,249,255,0.18)",
            background:
              "linear-gradient(180deg, rgba(12,20,38,0.92), rgba(9,14,28,0.96))",
            padding: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 10%, rgba(125,249,255,0.12), rgba(125,249,255,0) 40%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              width: 700,
              height: 500,
              margin: "0 auto",
              position: "relative",
              transform: "scale(0.94)",
              transformOrigin: "top center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 120,
                right: 120,
                bottom: 18,
                height: 34,
                borderRadius: 999,
                background: "rgba(0,0,0,0.28)",
                filter: "blur(18px)",
              }}
            />

            <svg width="700" height="500" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="heroTableFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff2a6" />
                  <stop offset="18%" stopColor="#f9d96e" />
                  <stop offset="46%" stopColor="#f3c53c" />
                  <stop offset="72%" stopColor="#efbb28" />
                  <stop offset="100%" stopColor="#dd9f12" />
                </linearGradient>
              </defs>

              <polygon points="270,66 200,360 172,410 254,82" fill="#d7d7d7" />
              <polygon points="430,66 500,360 528,410 446,82" fill="#dcdcdc" />
              <polygon points="200,360 500,360 528,410 172,410" fill="#f2f2f2" />
              <polygon
                points="270,66 430,66 500,360 200,360"
                fill="url(#heroTableFill)"
                stroke="#ececec"
                strokeWidth="12"
              />
            </svg>

            <div
              style={{
                position: "absolute",
                left: 350,
                top: 66,
                width: 160,
                height: 294,
                transform: "translateX(-50%)",
                clipPath: "polygon(0% 0%, 100% 0%, 145% 100%, -45% 100%)",
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
                  height: "1%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(255,255,255,0.72)",
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
                }}
              />
            </div>

            {renderMallet(348, 315, 0.94, "#7df9ff", "0 0 16px rgba(125,249,255,0.42)")}
            {renderMallet(350, 142, 0.56, "#ff5fd2", "0 0 14px rgba(255,95,210,0.38)")}
            {renderPuck(350, 230, 0.7)}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: 18,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 10, color: "#7df9ff" }}>
              主な機能
            </div>
            <div style={{ opacity: 0.88, lineHeight: 1.9 }}>
              ・マウスでマレット操作
              <br />
              ・CPU対戦
              <br />
              ・立体感のある盤面
              <br />
              ・スコア表示
              <br />
              ・5点先取
            </div>
          </div>

          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: 18,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 10, color: "#ff5fd2" }}>
              プレイの流れ
            </div>
            <div style={{ opacity: 0.88, lineHeight: 1.9 }}>
              ゲーム開始後はプレイヤー側のマレットを動かしてパックを打ち返します。
              先に5点取った側が勝利です。
            </div>
          </div>

          <button
            onClick={onStart}
            style={{
              padding: "16px 24px",
              borderRadius: 999,
              border: "none",
              background: "#7df9ff",
              color: "#08101f",
              fontWeight: "bold",
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "0 0 24px rgba(125,249,255,0.35)",
            }}
          >
            ゲーム開始
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitleScreen;
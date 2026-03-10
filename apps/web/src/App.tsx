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
            同じ4桁の数字を入力すると同じ部屋に入ります。
            存在しなければ自動で作成されます。
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

            <button
              onClick={onlineGame.joinRoom}
              style={modeButtonStyle("#ff5fd2")}
            >
              入室
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
            メモ
          </div>

          <div style={{ lineHeight: 1.8, opacity: 0.9, fontSize: 14 }}>
            例: 1234 を両方で入力すると同じ部屋に入れます。
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

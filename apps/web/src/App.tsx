function App() {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #182848 0%%, #0b1020 45%%, #050814 100%%)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", padding: "24px" }}> 
      <div style={{ width: "100%%", maxWidth: "960px", border: "1px solid rgba(0,255,255,0.25)", borderRadius: "24px", padding: "48px", boxShadow: "0 0 30px rgba(0,255,255,0.12), inset 0 0 30px rgba(255,255,255,0.03)", background: "rgba(10,16,32,0.72)", backdropFilter: "blur(6px)", textAlign: "center" }}> 
        <p style={{ margin: "0 0 12px 0", letterSpacing: "4px", fontSize: "12px", opacity: 0.7 }}>FUTURISTIC ARCADE EXPERIENCE</p> 
        <h1 style={{ fontSize: "64px", margin: "0 0 12px 0", color: "#7df9ff", textShadow: "0 0 12px rgba(125,249,255,0.8), 0 0 30px rgba(0,191,255,0.45)" }}>Air Hockey Web</h1> 
        <p style={{ margin: "0 auto", maxWidth: "640px", fontSize: "20px", opacity: 0.85, lineHeight: 1.6 }}>Arcade-style futuristic air hockey with smooth controls, neon visuals, and competitive play.</p> 
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "32px", flexWrap: "wrap" }}> 
          <button style={{ padding: "14px 24px", fontSize: "16px", cursor: "pointer", borderRadius: "999px", border: "1px solid #7df9ff", background: "#7df9ff", color: "#08101f", fontWeight: "bold", boxShadow: "0 0 20px rgba(125,249,255,0.45)" }}>1 Player</button> 
          <button style={{ padding: "14px 24px", fontSize: "16px", cursor: "pointer", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)", background: "transparent", color: "white" }}>2 Players</button> 
          <button style={{ padding: "14px 24px", fontSize: "16px", cursor: "pointer", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)", background: "transparent", color: "white" }}>Settings</button> 
        </div> 
        <p style={{ marginTop: "24px", fontSize: "14px", opacity: 0.65 }}>Choose a mode and enter the neon arena.</p> 
      </div> 
    </div> 
  );
}

export default App;

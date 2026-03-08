function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0b1020", color: "white", gap: "16px" }}> 
      <h1 style={{ fontSize: "56px", margin: 0 }}>Air Hockey Web</h1> 
      <p style={{ margin: 0, fontSize: "20px", opacity: 0.8 }}>Arcade-style futuristic air hockey</p> 
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}> 
        <button style={{ padding: "12px 20px", fontSize: "16px", cursor: "pointer" }}>Start Game</button> 
        <button style={{ padding: "12px 20px", fontSize: "16px", cursor: "pointer" }}>Settings</button> 
      </div> 
    </div> 
  );
}

export default App;

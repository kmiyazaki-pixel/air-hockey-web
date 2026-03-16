import { useEffect, useRef, useState } from "react";
import type { GameState } from "../types/game";

function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  return `${protocol}//${host}:4000/ws`;
}

export function useOnlineGame(roomCode: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("接続中...");
  const [state, setState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setStatus("接続済み。参加要求を送信中...");
      socket.send(JSON.stringify({ type: "join_room", roomCode }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "joined") {
        setPlayerNumber(msg.playerNumber);
        setStatus(`ルーム ${msg.roomCode} に参加。プレイヤー${msg.playerNumber}`);
      } else if (msg.type === "waiting") {
        setStatus("対戦相手を待っています...");
      } else if (msg.type === "start") {
        setStarted(true);
        setStatus("対戦開始！");
      } else if (msg.type === "state") {
        setState(msg.state);
      } else if (msg.type === "room_full") {
        setStatus("このルームは満員です");
      } else if (msg.type === "player_left") {
        setStarted(false);
        setStatus("相手が退出しました");
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setStatus("切断されました");
    };

    socket.onerror = () => {
      setStatus("接続エラー");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const sendPaddle = (x: number, y: number) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "paddle", x, y }));
  };

  const sendRestart = () => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "restart" }));
  };

  return {
    connected,
    status,
    state,
    playerNumber,
    started,
    sendPaddle,
    sendRestart,
  };
}

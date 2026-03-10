import { useEffect, useMemo, useRef, useState } from "react";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../utils/projection";

export type OnlineWinner = "PLAYER1" | "PLAYER2" | null;

type Vec2 = { x: number; y: number };
type PlayerNumber = 1 | 2;

type RoomState = {
  roomId: string;
  status: string;
  winner: OnlineWinner;
  player1Score: number;
  player2Score: number;
  puck: Vec2;
  player1: Vec2;
  player2: Vec2;
  player1Connected: boolean;
  player2Connected: boolean;
};

type ServerMessage =
  | { type: "joined"; roomId: string; playerNumber: PlayerNumber }
  | { type: "room_state"; state: RoomState }
  | { type: "error"; message: string };

const EMPTY_ROOM: RoomState = {
  roomId: "",
  status: "未接続",
  winner: null,
  player1Score: 0,
  player2Score: 0,
  puck: { x: 500, y: 900 },
  player1: { x: 500, y: 210 },
  player2: { x: 500, y: 1350 },
  player1Connected: false,
  player2Connected: false,
};

function getWsUrl() {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (envUrl) return envUrl;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  return `${protocol}//${host}:4000/ws`;
}

function rotate180(vec: Vec2): Vec2 {
  return {
    x: WORLD_WIDTH - vec.x,
    y: WORLD_HEIGHT - vec.y,
  };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function lerpVec(current: Vec2, target: Vec2, amount: number): Vec2 {
  return {
    x: lerp(current.x, target.x, amount),
    y: lerp(current.y, target.y, amount),
  };
}

function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useOnlineGame() {
  const socketRef = useRef<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);
  const targetStateRef = useRef<RoomState>(EMPTY_ROOM);
  const localDisplayMalletRef = useRef<Vec2 | null>(null);
  const lastSentAtRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [joinInput, setJoinInput] = useState("1234");
  const [playerNumber, setPlayerNumber] = useState<PlayerNumber | null>(null);
  const [roomState, setRoomState] = useState<RoomState>(EMPTY_ROOM);
  const [displayState, setDisplayState] = useState<RoomState>(EMPTY_ROOM);
  const [localDisplayMallet, setLocalDisplayMallet] = useState<Vec2 | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setError("");
    });

    socket.addEventListener("close", () => {
      setConnected(false);
      setPlayerNumber(null);
      setLocalDisplayMallet(null);
      localDisplayMalletRef.current = null;
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      if (message.type === "joined") {
        setRoomId(message.roomId);
        setJoinInput(message.roomId);
        setPlayerNumber(message.playerNumber);
        setError("");
        return;
      }

      if (message.type === "room_state") {
        targetStateRef.current = message.state;
        setRoomState(message.state);

        if (playerNumber === 1) {
          const serverMe = rotate180(message.state.player1);
          if (
            !localDisplayMalletRef.current ||
            distance(localDisplayMalletRef.current, serverMe) > 180
          ) {
            localDisplayMalletRef.current = serverMe;
            setLocalDisplayMallet(serverMe);
          }
        } else if (playerNumber === 2) {
          const serverMe = message.state.player2;
          if (
            !localDisplayMalletRef.current ||
            distance(localDisplayMalletRef.current, serverMe) > 180
          ) {
            localDisplayMalletRef.current = serverMe;
            setLocalDisplayMallet(serverMe);
          }
        }

        return;
      }

      if (message.type === "error") {
        setError(message.message);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [playerNumber]);

  useEffect(() => {
    const tick = () => {
      const target = targetStateRef.current;

      setDisplayState((current) => ({
        ...target,
        puck: lerpVec(current.puck, target.puck, 0.5),
        player1: lerpVec(current.player1, target.player1, 0.22),
        player2: lerpVec(current.player2, target.player2, 0.22),
      }));

      setLocalDisplayMallet((current) => {
        if (!current || !playerNumber) return current;

        const serverMe =
          playerNumber === 1
            ? rotate180(target.player1)
            : target.player2;

        const gap = distance(current, serverMe);

        if (gap < 18) {
          localDisplayMalletRef.current = current;
          return current;
        }

        const next = lerpVec(current, serverMe, 0.08);
        localDisplayMalletRef.current = next;
        return next;
      });

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playerNumber]);

  const send = (payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  };

  const joinRoom = () => {
    const normalized = joinInput.replace(/\D/g, "").slice(0, 4);

    if (normalized.length !== 4) {
      setError("4桁の数字を入力してください。");
      return;
    }

    setJoinInput(normalized);
    setError("");
    send({ type: "join_room", roomId: normalized });
  };

  const restart = () => {
    send({ type: "restart" });
  };

  const sendMove = (displayX: number, displayY: number) => {
    if (!playerNumber) return;

    const local = { x: displayX, y: displayY };
    setLocalDisplayMallet(local);
    localDisplayMalletRef.current = local;

    const world =
      playerNumber === 1
        ? rotate180(local)
        : local;

    const now = performance.now();
    if (now - lastSentAtRef.current < 12) return;
    lastSentAtRef.current = now;

    send({ type: "move", x: world.x, y: world.y });
  };

  const viewState = useMemo(() => {
    if (playerNumber === 1) {
      return {
        me: localDisplayMallet ?? rotate180(displayState.player1),
        opponent: rotate180(displayState.player2),
        puck: rotate180(displayState.puck),
        myScore: roomState.player1Score,
        opponentScore: roomState.player2Score,
        opponentConnected: roomState.player2Connected,
        winner:
          roomState.winner === "PLAYER1"
            ? "PLAYER"
            : roomState.winner === "PLAYER2"
              ? "CPU"
              : null,
      } as const;
    }

    return {
      me: localDisplayMallet ?? displayState.player2,
      opponent: displayState.player1,
      puck: displayState.puck,
      myScore: roomState.player2Score,
      opponentScore: roomState.player1Score,
      opponentConnected: roomState.player1Connected,
      winner:
        roomState.winner === "PLAYER2"
          ? "PLAYER"
          : roomState.winner === "PLAYER1"
            ? "CPU"
            : null,
    } as const;
  }, [playerNumber, localDisplayMallet, displayState, roomState]);

  return {
    connected,
    roomId,
    joinInput,
    setJoinInput,
    playerNumber,
    roomState,
    error,
    joinRoom,
    restart,
    sendMove,
    viewState,
  };
}

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
  serverTime?: number;
  tick?: number;
};

type ServerMessage =
  | { type: "joined"; roomId: string; playerNumber: PlayerNumber }
  | { type: "room_state"; state: RoomState }
  | { type: "error"; message: string };

type TimedSnapshot = {
  receivedAt: number;
  state: RoomState;
};

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
  serverTime: 0,
  tick: 0,
};

const INTERPOLATION_DELAY_MS = 95;
const MAX_BUFFER_SIZE = 8;

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

function interpolateRoomState(a: RoomState, b: RoomState, t: number): RoomState {
  return {
    ...b,
    puck: lerpVec(a.puck, b.puck, t),
    player1: lerpVec(a.player1, b.player1, t),
    player2: lerpVec(a.player2, b.player2, t),
  };
}

function shouldSnapImmediately(current: RoomState, next: RoomState) {
  return (
    current.roomId !== next.roomId ||
    current.player1Score !== next.player1Score ||
    current.player2Score !== next.player2Score ||
    current.winner !== next.winner ||
    current.status !== next.status
  );
}

export function useOnlineGame() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const snapshotsRef = useRef<TimedSnapshot[]>([]);
  const latestServerStateRef = useRef<RoomState>(EMPTY_ROOM);
  const renderStateRef = useRef<RoomState>(EMPTY_ROOM);
  const playerNumberRef = useRef<PlayerNumber | null>(null);
  const desiredRoomIdRef = useRef("");
  const lastActionRef = useRef<"create" | "join" | null>(null);
  const lastLocalInputAtRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [joinInput, setJoinInput] = useState("1234");
  const [playerNumber, setPlayerNumber] = useState<PlayerNumber | null>(null);
  const [roomState, setRoomState] = useState<RoomState>(EMPTY_ROOM);
  const [displayState, setDisplayState] = useState<RoomState>(EMPTY_ROOM);
  const [localDisplayMallet, setLocalDisplayMallet] = useState<Vec2 | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    playerNumberRef.current = playerNumber;
  }, [playerNumber]);

  useEffect(() => {
    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnect();

      const socket = new WebSocket(getWsUrl());
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setConnected(true);
        setError("");

        const desiredRoomId = desiredRoomIdRef.current;
        const action = lastActionRef.current;
        if (desiredRoomId && action === "create") {
          socket.send(JSON.stringify({ type: "create_room", roomId: desiredRoomId }));
        } else if (desiredRoomId && action === "join") {
          socket.send(JSON.stringify({ type: "join_room", roomId: desiredRoomId }));
        }
      });

      socket.addEventListener("close", () => {
        setConnected(false);
        setPlayerNumber(null);
        playerNumberRef.current = null;

        clearReconnect();
        reconnectTimerRef.current = window.setTimeout(connect, 1000);
      });

      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data) as ServerMessage;

        if (message.type === "joined") {
          setRoomId(message.roomId);
          desiredRoomIdRef.current = message.roomId;
          setJoinInput(message.roomId);
          setPlayerNumber(message.playerNumber);
          playerNumberRef.current = message.playerNumber;
          setError("");
          return;
        }

        if (message.type === "room_state") {
          const nextState = message.state;
          const previousServer = latestServerStateRef.current;

          latestServerStateRef.current = nextState;
          setRoomState(nextState);

          const now = performance.now();
          if (shouldSnapImmediately(previousServer, nextState)) {
            snapshotsRef.current = [{ receivedAt: now, state: nextState }];
            renderStateRef.current = nextState;
            setDisplayState(nextState);
          } else {
            snapshotsRef.current = [...snapshotsRef.current, { receivedAt: now, state: nextState }].slice(-MAX_BUFFER_SIZE);
          }

          const currentPlayerNumber = playerNumberRef.current;
          if (!currentPlayerNumber) return;

          const serverMe = currentPlayerNumber === 1 ? rotate180(nextState.player1) : nextState.player2;

          setLocalDisplayMallet((current) => {
            if (!current) return serverMe;

            const sinceInput = performance.now() - lastLocalInputAtRef.current;
            const gap = distance(current, serverMe);

            if (sinceInput < 120) {
              return gap > 180 ? lerpVec(current, serverMe, 0.2) : current;
            }

            if (gap > 120) return lerpVec(current, serverMe, 0.35);
            if (gap > 24) return lerpVec(current, serverMe, 0.22);
            return gap > 4 ? lerpVec(current, serverMe, 0.14) : serverMe;
          });

          return;
        }

        if (message.type === "error") {
          setError(message.message);
        }
      });
    };

    connect();

    return () => {
      clearReconnect();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const buffer = snapshotsRef.current;
      const current = renderStateRef.current;
      const now = performance.now() - INTERPOLATION_DELAY_MS;

      let nextRender = current;

      if (buffer.length >= 2) {
        while (buffer.length >= 2 && buffer[1].receivedAt <= now) {
          buffer.shift();
        }

        if (buffer.length >= 2) {
          const older = buffer[0];
          const newer = buffer[1];
          const span = Math.max(1, newer.receivedAt - older.receivedAt);
          const t = Math.max(0, Math.min(1, (now - older.receivedAt) / span));
          nextRender = interpolateRoomState(older.state, newer.state, t);
        } else if (buffer[0]) {
          const target = buffer[0].state;
          nextRender = {
            ...target,
            puck: lerpVec(current.puck, target.puck, 0.18),
            player1: lerpVec(current.player1, target.player1, 0.24),
            player2: lerpVec(current.player2, target.player2, 0.24),
          };
        }
      } else if (buffer.length === 1) {
        const target = buffer[0].state;
        nextRender = {
          ...target,
          puck: lerpVec(current.puck, target.puck, 0.18),
          player1: lerpVec(current.player1, target.player1, 0.24),
          player2: lerpVec(current.player2, target.player2, 0.24),
        };
      }

      renderStateRef.current = nextRender;
      setDisplayState(nextRender);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const send = (payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  };

  const createRoom = () => {
    const normalized = joinInput.replace(/\D/g, "").slice(0, 4);

    if (normalized.length !== 4) {
      setError("4桁の数字を入力してください。");
      return;
    }

    desiredRoomIdRef.current = normalized;
    lastActionRef.current = "create";
    setJoinInput(normalized);
    setError("");
    send({ type: "create_room", roomId: normalized });
  };

  const joinRoom = () => {
    const normalized = joinInput.replace(/\D/g, "").slice(0, 4);

    if (normalized.length !== 4) {
      setError("4桁の数字を入力してください。");
      return;
    }

    desiredRoomIdRef.current = normalized;
    lastActionRef.current = "join";
    setJoinInput(normalized);
    setError("");
    send({ type: "join_room", roomId: normalized });
  };

  const restart = () => {
    send({ type: "restart" });
  };

  const sendMove = (displayX: number, displayY: number) => {
    const currentPlayerNumber = playerNumberRef.current;
    if (!currentPlayerNumber) return;

    const local = { x: displayX, y: displayY };
    setLocalDisplayMallet(local);
    lastLocalInputAtRef.current = performance.now();

    const world = currentPlayerNumber === 1 ? rotate180(local) : local;
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
    createRoom,
    joinRoom,
    restart,
    sendMove,
    viewState,
  };
}

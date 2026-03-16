import Fastify from "fastify";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 4000);
const STEP_RATE = 1000 / 60;
const BROADCAST_RATE = 1000 / 30;

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1600;
const GOAL_WIDTH = 320;
const PUCK_RADIUS = 22;
const MALLET_RADIUS = 58;
const COLLISION_BONUS = 16;
const WIN_SCORE = 5;
const TABLE_MIN_X = 70;
const TABLE_MAX_X = WORLD_WIDTH - 70;
const PLAYER1_MIN_Y = 120;
const PLAYER1_MAX_Y = WORLD_HEIGHT * 0.38;
const PLAYER2_MIN_Y = WORLD_HEIGHT * 0.5 + 40;
const PLAYER2_MAX_Y = WORLD_HEIGHT - 40;

type Vec2 = { x: number; y: number };
type PlayerNumber = 1 | 2;
type Winner = "PLAYER1" | "PLAYER2" | null;

type ClientMessage =
  | { type: "join_room"; roomId: string }
  | { type: "move"; x: number; y: number }
  | { type: "restart" };

type ServerMessage =
  | { type: "joined"; roomId: string; playerNumber: PlayerNumber }
  | { type: "room_state"; state: RoomSnapshot }
  | { type: "error"; message: string };

type RoomSnapshot = {
  roomId: string;
  status: string;
  winner: Winner;
  player1Score: number;
  player2Score: number;
  puck: Vec2;
  player1: Vec2;
  player2: Vec2;
  player1Connected: boolean;
  player2Connected: boolean;
};

type PlayerSlot = {
  socket: WebSocket;
  mallet: Vec2;
  connected: boolean;
};

type RoomState = {
  id: string;
  player1: PlayerSlot | null;
  player2: PlayerSlot | null;
  puck: Vec2;
  puckVelocity: Vec2;
  player1Score: number;
  player2Score: number;
  status: string;
  winner: Winner;
};

const app = Fastify({ logger: true });
const rooms = new Map<string, RoomState>();
const socketToRoom = new WeakMap<
  WebSocket,
  { roomId: string; playerNumber: PlayerNumber }
>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function isValidRoomId(roomId: string) {
  return /^\d{4}$/.test(roomId);
}

function makeInitialRoom(id: string): RoomState {
  return {
    id,
    player1: null,
    player2: null,
    puck: { x: 500, y: 900 },
    puckVelocity: { x: 3.8, y: 5.4 },
    player1Score: 0,
    player2Score: 0,
    status: "待機中",
    winner: null,
  };
}

function resetRound(room: RoomState, toward: PlayerNumber) {
  room.puck = { x: 500, y: 900 };
  room.puckVelocity = {
    x: toward === 1 ? -2.4 : 2.4,
    y: toward === 1 ? -4.6 : 4.6,
  };
}

function resetMatch(room: RoomState) {
  room.player1Score = 0;
  room.player2Score = 0;
  room.winner = null;
  room.status = room.player1 && room.player2 ? "プレイ中" : "待機中";

  if (room.player1) {
    room.player1.mallet = { x: 500, y: 210 };
  }

  if (room.player2) {
    room.player2.mallet = { x: 500, y: 1350 };
  }

  resetRound(room, 2);
}

function roomSnapshot(room: RoomState): RoomSnapshot {
  return {
    roomId: room.id,
    status: room.status,
    winner: room.winner,
    player1Score: room.player1Score,
    player2Score: room.player2Score,
    puck: room.puck,
    player1: room.player1?.mallet ?? { x: 500, y: 210 },
    player2: room.player2?.mallet ?? { x: 500, y: 1350 },
    player1Connected: Boolean(room.player1?.connected),
    player2Connected: Boolean(room.player2?.connected),
  };
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastRoom(room: RoomState) {
  const payload: ServerMessage = {
    type: "room_state",
    state: roomSnapshot(room),
  };

  if (room.player1?.connected) {
    send(room.player1.socket, payload);
  }

  if (room.player2?.connected) {
    send(room.player2.socket, payload);
  }
}

function removeSocket(socket: WebSocket) {
  const entry = socketToRoom.get(socket);
  if (!entry) return;

  const room = rooms.get(entry.roomId);
  if (!room) return;

  if (entry.playerNumber === 1 && room.player1?.socket === socket) {
    room.player1.connected = false;
  }

  if (entry.playerNumber === 2 && room.player2?.socket === socket) {
    room.player2.connected = false;
  }

  room.status = "相手の接続待ち";
  broadcastRoom(room);

  if (!room.player1?.connected && !room.player2?.connected) {
    rooms.delete(room.id);
  }
}

function ensureRoom(roomId: string) {
  let room = rooms.get(roomId);

  if (!room) {
    room = makeInitialRoom(roomId);
    rooms.set(roomId, room);
  }

  return room;
}

function attachPlayer(
  room: RoomState,
  socket: WebSocket,
  playerNumber: PlayerNumber
) {
  const slot: PlayerSlot = {
    socket,
    connected: true,
    mallet: playerNumber === 1 ? { x: 500, y: 210 } : { x: 500, y: 1350 },
  };

  if (playerNumber === 1) {
    room.player1 = slot;
  } else {
    room.player2 = slot;
  }

  socketToRoom.set(socket, { roomId: room.id, playerNumber });
  send(socket, { type: "joined", roomId: room.id, playerNumber });

  if (room.player1?.connected && room.player2?.connected) {
    resetMatch(room);
  } else {
    room.status = "相手の参加待ち";
    resetRound(room, 2);
  }

  broadcastRoom(room);
}

function handleJoinRoom(socket: WebSocket, roomIdRaw: string) {
  const roomId = roomIdRaw.trim();

  if (!isValidRoomId(roomId)) {
    send(socket, {
      type: "error",
      message: "4桁の数字を入力してください。",
    });
    return;
  }

  const room = ensureRoom(roomId);

  if (!room.player1 || !room.player1.connected) {
    attachPlayer(room, socket, 1);
    return;
  }

  if (!room.player2 || !room.player2.connected) {
    attachPlayer(room, socket, 2);
    return;
  }

  send(socket, { type: "error", message: "そのルームは満員です。" });
}

function handleMove(socket: WebSocket, x: number, y: number) {
  const entry = socketToRoom.get(socket);
  if (!entry) return;

  const room = rooms.get(entry.roomId);
  if (!room) return;

  const slot = entry.playerNumber === 1 ? room.player1 : room.player2;
  if (!slot) return;

  if (entry.playerNumber === 1) {
    slot.mallet = {
      x: clamp(x, TABLE_MIN_X, TABLE_MAX_X),
      y: clamp(y, PLAYER1_MIN_Y, PLAYER1_MAX_Y),
    };
  } else {
    slot.mallet = {
      x: clamp(x, TABLE_MIN_X, TABLE_MAX_X),
      y: clamp(y, PLAYER2_MIN_Y, PLAYER2_MAX_Y),
    };
  }
}

function collide(
  room: RoomState,
  player: PlayerSlot,
  label: "PLAYER1" | "PLAYER2"
) {
  const dx = room.puck.x - player.mallet.x;
  const dy = room.puck.y - player.mallet.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = PUCK_RADIUS + MALLET_RADIUS + COLLISION_BONUS;

  if (distance >= minDistance) return;

  const nx = dx / (distance || 1);
  const ny = dy / (distance || 1);
  const speed = Math.hypot(room.puckVelocity.x, room.puckVelocity.y);
  const nextSpeed = Math.min(12.5, speed + 0.8);

  room.puckVelocity = {
    x: nx * nextSpeed,
    y: ny * nextSpeed,
  };

  room.puck = {
    x: player.mallet.x + nx * (minDistance + 2),
    y: player.mallet.y + ny * (minDistance + 2),
  };

  room.status = label === "PLAYER1" ? "PLAYER1ヒット" : "PLAYER2ヒット";
}

function stepRoom(room: RoomState) {
  if (!room.player1 || !room.player2) return;
  if (!room.player1.connected || !room.player2.connected) return;
  if (room.winner) return;

  const stepX = room.puckVelocity.x / PHYSICS_SUBSTEPS;
  const stepY = room.puckVelocity.y / PHYSICS_SUBSTEPS;

  for (let i = 0; i < PHYSICS_SUBSTEPS; i++) {
    room.puck.x += stepX;
    room.puck.y += stepY;

    if (room.puck.x <= PUCK_RADIUS) {
      room.puck.x = PUCK_RADIUS;
      room.puckVelocity.x = Math.abs(room.puckVelocity.x);
    }

    if (room.puck.x >= WORLD_WIDTH - PUCK_RADIUS) {
      room.puck.x = WORLD_WIDTH - PUCK_RADIUS;
      room.puckVelocity.x = -Math.abs(room.puckVelocity.x);
    }

    const topGoal =
      room.puck.y <= PUCK_RADIUS &&
      Math.abs(room.puck.x - WORLD_WIDTH / 2) <= GOAL_WIDTH / 2;

    const bottomGoal =
      room.puck.y >= WORLD_HEIGHT - PUCK_RADIUS &&
      Math.abs(room.puck.x - WORLD_WIDTH / 2) <= GOAL_WIDTH / 2;

    if (topGoal) {
      room.player2Score += 1;

      if (room.player2Score >= WIN_SCORE) {
        room.winner = "PLAYER2";
        room.status = "PLAYER2勝利";
      } else {
        room.status = "PLAYER2ゴール";
        resetRound(room, 1);
      }
      return;
    }

    if (bottomGoal) {
      room.player1Score += 1;

      if (room.player1Score >= WIN_SCORE) {
        room.winner = "PLAYER1";
        room.status = "PLAYER1勝利";
      } else {
        room.status = "PLAYER1ゴール";
        resetRound(room, 2);
      }
      return;
    }

    if (room.puck.y <= PUCK_RADIUS) {
      room.puck.y = PUCK_RADIUS;
      room.puckVelocity.y = Math.abs(room.puckVelocity.y);
    }

    if (room.puck.y >= WORLD_HEIGHT - PUCK_RADIUS) {
      room.puck.y = WORLD_HEIGHT - PUCK_RADIUS;
      room.puckVelocity.y = -Math.abs(room.puckVelocity.y);
    }

    collide(room, room.player1, "PLAYER1");
    collide(room, room.player2, "PLAYER2");
  }

  room.puckVelocity.x *= 0.998;
  room.puckVelocity.y *= 0.998;

  if (Math.abs(room.puckVelocity.x) < 0.08) {
    room.puckVelocity.x = 0;
  }

  if (Math.abs(room.puckVelocity.y) < 0.08) {
    room.puckVelocity.y = 0;
  }

  room.status = room.status.includes("ヒット") ? room.status : "プレイ中";
}

app.get("/health", async () => {
  return { ok: true, rooms: rooms.size };
});

app.get("/", async () => {
  return { ok: true, message: "Air Hockey API" };
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  const wss = new WebSocketServer({
    server: app.server,
    path: "/ws",
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.on("message", (raw: string | Buffer) => {
      try {
        const message = JSON.parse(String(raw)) as ClientMessage;

        if (message.type === "join_room") {
          handleJoinRoom(socket, message.roomId);
          return;
        }

        if (message.type === "move") {
          handleMove(socket, message.x, message.y);
          return;
        }

        if (message.type === "restart") {
          const entry = socketToRoom.get(socket);
          if (!entry) return;

          const room = rooms.get(entry.roomId);
          if (!room) return;

          resetMatch(room);
          broadcastRoom(room);
        }
      } catch {
        send(socket, {
          type: "error",
          message: "メッセージの形式が不正です。",
        });
      }
    });

    socket.on("close", () => {
      removeSocket(socket);
    });
  });

  setInterval(() => {
    for (const room of rooms.values()) {
      stepRoom(room);
    }
  }, STEP_RATE);

  setInterval(() => {
    for (const room of rooms.values()) {
      broadcastRoom(room);
    }
  }, BROADCAST_RATE);

  app.log.info(`API running on ${PORT}`);
});

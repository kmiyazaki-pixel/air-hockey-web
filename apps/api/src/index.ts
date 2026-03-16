import Fastify from "fastify";
import { WebSocketServer, WebSocket } from "ws";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT ?? 4000);
const STEP_RATE = 1000 / 60;
const BROADCAST_RATE = 1000 / 30;

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1600;
const GOAL_WIDTH = 320;
const PUCK_RADIUS = 22;
const MALLET_RADIUS = 58;
const WIN_SCORE = 5;

const TABLE_MIN_X = 70;
const TABLE_MAX_X = WORLD_WIDTH - 70;
const PLAYER1_MIN_Y = 120;
const PLAYER1_MAX_Y = WORLD_HEIGHT * 0.38;
const PLAYER2_MIN_Y = WORLD_HEIGHT * 0.5 + 40;
const PLAYER2_MAX_Y = WORLD_HEIGHT - 40;

const PHYSICS_SUBSTEPS = 8;
const MAX_MALLET_STEP = 80;
const HIT_PUSHOUT = 2;
const MAX_PUCK_SPEED = 12.5;

type Vec2 = { x: number; y: number };
type PlayerNumber = 1 | 2;
type Winner = "PLAYER1" | "PLAYER2" | null;
type CpuDifficulty = "easy" | "normal" | "hard";

type ClientMessage =
  | { type: "create_room"; roomId: string }
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
  serverTime: number;
  tick: number;
};

type PlayerSlot = {
  socket: WebSocket;
  mallet: Vec2;
  prevMallet: Vec2;
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
  tick: number;
};

type CpuRankingRow = {
  id: number;
  name: string;
  difficulty: CpuDifficulty;
  time_ms: number;
  created_at: string;
};

const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

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

function isValidDifficulty(value: string): value is CpuDifficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

function cloneVec(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mulVec(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}

function lengthVec(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

function normalizeVec(v: Vec2) {
  const d = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / d, y: v.y / d };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function clampMove(prev: Vec2, next: Vec2, maxStep: number): Vec2 {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= maxStep || dist === 0) return next;

  const ratio = maxStep / dist;
  return {
    x: prev.x + dx * ratio,
    y: prev.y + dy * ratio,
  };
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
    tick: 0,
  };
}

function ensureRoom(roomId: string) {
  let room = rooms.get(roomId);

  if (!room) {
    room = makeInitialRoom(roomId);
    rooms.set(roomId, room);
  }

  return room;
}

function resetRound(room: RoomState, toward: PlayerNumber) {
  room.puck = { x: 500, y: 900 };
  room.puckVelocity = {
    x: toward === 1 ? -2.4 : 2.4,
    y: toward === 1 ? -4.6 : 4.6,
  };
}

function setPlayerPosition(slot: PlayerSlot, pos: Vec2) {
  slot.mallet = cloneVec(pos);
  slot.prevMallet = cloneVec(pos);
}

function resetMatch(room: RoomState) {
  room.player1Score = 0;
  room.player2Score = 0;
  room.winner = null;
  room.status = room.player1 && room.player2 ? "プレイ中" : "待機中";

  if (room.player1) {
    setPlayerPosition(room.player1, { x: 500, y: 210 });
  }

  if (room.player2) {
    setPlayerPosition(room.player2, { x: 500, y: 1350 });
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
    serverTime: Date.now(),
    tick: room.tick,
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

function attachPlayer(
  room: RoomState,
  socket: WebSocket,
  playerNumber: PlayerNumber
) {
  const initial = playerNumber === 1 ? { x: 500, y: 210 } : { x: 500, y: 1350 };

  const slot: PlayerSlot = {
    socket,
    connected: true,
    mallet: cloneVec(initial),
    prevMallet: cloneVec(initial),
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

function handleCreateRoom(socket: WebSocket, roomIdRaw: string) {
  const roomId = roomIdRaw.trim();

  if (!isValidRoomId(roomId)) {
    send(socket, { type: "error", message: "4桁の数字を入力してください。" });
    return;
  }

  if (rooms.has(roomId)) {
    send(socket, { type: "error", message: "そのルームはすでに存在します。" });
    return;
  }

  const room = ensureRoom(roomId);
  attachPlayer(room, socket, 1);
}

function handleJoinRoom(socket: WebSocket, roomIdRaw: string) {
  const roomId = roomIdRaw.trim();

  if (!isValidRoomId(roomId)) {
    send(socket, { type: "error", message: "4桁の数字を入力してください。" });
    return;
  }

  const room = rooms.get(roomId);

  if (!room) {
    send(socket, {
      type: "error",
      message: "そのルームは存在しません。先に作成してください。",
    });
    return;
  }

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

  const clamped =
    entry.playerNumber === 1
      ? {
          x: clamp(x, TABLE_MIN_X, TABLE_MAX_X),
          y: clamp(y, PLAYER1_MIN_Y, PLAYER1_MAX_Y),
        }
      : {
          x: clamp(x, TABLE_MIN_X, TABLE_MAX_X),
          y: clamp(y, PLAYER2_MIN_Y, PLAYER2_MAX_Y),
        };

  slot.mallet = clampMove(slot.mallet, clamped, MAX_MALLET_STEP);
}

function resolveHit(
  room: RoomState,
  malletPos: Vec2,
  malletVel: Vec2,
  label: "PLAYER1" | "PLAYER2"
) {
  const offset = subVec(room.puck, malletPos);
  const offsetLen = lengthVec(offset);
  const minDistance = PUCK_RADIUS + MALLET_RADIUS;

  if (offsetLen >= minDistance) return false;

  const normal =
    offsetLen > 0.0001
      ? normalizeVec(offset)
      : label === "PLAYER1"
        ? { x: 0, y: 1 }
        : { x: 0, y: -1 };

  room.puck = addVec(malletPos, mulVec(normal, minDistance + HIT_PUSHOUT));

  const malletSpeed = lengthVec(malletVel);
  const hitStrength = Math.min(6.0, malletSpeed * 0.42);

  let nextVelocity = addVec(
    room.puckVelocity,
    mulVec(malletVel, 0.48 + Math.min(0.22, malletSpeed * 0.01))
  );

  const away = dot(nextVelocity, normal);
  if (away < 3.2) {
    nextVelocity = addVec(nextVelocity, mulVec(normal, 3.2 - away));
  }

  const totalSpeed = lengthVec(nextVelocity);
  if (totalSpeed < 5.6) {
    nextVelocity = mulVec(normalizeVec(nextVelocity), 5.6);
  } else if (totalSpeed > MAX_PUCK_SPEED) {
    nextVelocity = mulVec(normalizeVec(nextVelocity), MAX_PUCK_SPEED);
  }

  nextVelocity = addVec(nextVelocity, mulVec(normal, hitStrength * 0.18));

  const finalSpeed = lengthVec(nextVelocity);
  if (finalSpeed > MAX_PUCK_SPEED) {
    nextVelocity = mulVec(normalizeVec(nextVelocity), MAX_PUCK_SPEED);
  }

  room.puckVelocity = nextVelocity;
  room.status = label === "PLAYER1" ? "PLAYER1ヒット" : "PLAYER2ヒット";
  return true;
}

function beginPhysicsFrame(room: RoomState) {
  if (room.player1) room.player1.prevMallet = cloneVec(room.player1.mallet);
  if (room.player2) room.player2.prevMallet = cloneVec(room.player2.mallet);
}

function endPhysicsFrame(room: RoomState) {
  if (room.player1) room.player1.prevMallet = cloneVec(room.player1.mallet);
  if (room.player2) room.player2.prevMallet = cloneVec(room.player2.mallet);
}

function stepRoom(room: RoomState) {
  if (!room.player1 || !room.player2) return;
  if (!room.player1.connected || !room.player2.connected) return;
  if (room.winner) return;

  room.tick += 1;
  beginPhysicsFrame(room);

  let hitThisFrame = false;

  for (let i = 1; i <= PHYSICS_SUBSTEPS; i++) {
    const prevT = (i - 1) / PHYSICS_SUBSTEPS;
    const currT = i / PHYSICS_SUBSTEPS;

    const p1Prev = lerpVec(room.player1.prevMallet, room.player1.mallet, prevT);
    const p1Curr = lerpVec(room.player1.prevMallet, room.player1.mallet, currT);
    const p2Prev = lerpVec(room.player2.prevMallet, room.player2.mallet, prevT);
    const p2Curr = lerpVec(room.player2.prevMallet, room.player2.mallet, currT);

    const p1Vel = subVec(p1Curr, p1Prev);
    const p2Vel = subVec(p2Curr, p2Prev);

    room.puck.x += room.puckVelocity.x / PHYSICS_SUBSTEPS;
    room.puck.y += room.puckVelocity.y / PHYSICS_SUBSTEPS;

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

      endPhysicsFrame(room);
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

      endPhysicsFrame(room);
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

    if (!hitThisFrame) {
      if (resolveHit(room, p1Curr, p1Vel, "PLAYER1")) {
        hitThisFrame = true;
        continue;
      }

      if (resolveHit(room, p2Curr, p2Vel, "PLAYER2")) {
        hitThisFrame = true;
        continue;
      }
    }
  }

  room.puckVelocity.x *= 0.9992;
  room.puckVelocity.y *= 0.9992;

  if (Math.abs(room.puckVelocity.x) < 0.04) room.puckVelocity.x = 0;
  if (Math.abs(room.puckVelocity.y) < 0.04) room.puckVelocity.y = 0;

  room.status = hitThisFrame ? room.status : "プレイ中";

  endPhysicsFrame(room);
}

async function ensureRankingTable() {
  if (!pool) {
    app.log.warn("DATABASE_URL is not set. Ranking API will be disabled.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cpu_rankings (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(20) NOT NULL,
      difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard')),
      time_ms INTEGER NOT NULL CHECK (time_ms > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS cpu_rankings_difficulty_time_idx
    ON cpu_rankings (difficulty, time_ms ASC, created_at ASC)
  `);
}

app.get("/health", async () => {
  return { ok: true, rooms: rooms.size, db: Boolean(pool) };
});

app.get("/", async () => {
  return { ok: true, message: "Air Hockey API" };
});

app.get("/rankings/cpu", async (request, reply) => {
  if (!pool) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const difficulty = String((request.query as { difficulty?: string }).difficulty ?? "");

  if (!isValidDifficulty(difficulty)) {
    return reply.code(400).send({ error: "invalid_difficulty" });
  }

  const result = await pool.query<CpuRankingRow>(
    `
      SELECT id, name, difficulty, time_ms, created_at
      FROM cpu_rankings
      WHERE difficulty = $1
      ORDER BY time_ms ASC, created_at ASC
      LIMIT 10
    `,
    [difficulty]
  );

  return {
    difficulty,
    items: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      difficulty: row.difficulty,
      timeMs: row.time_ms,
      createdAt: row.created_at,
    })),
  };
});

app.post("/rankings/cpu", async (request, reply) => {
  if (!pool) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const body = request.body as {
    name?: unknown;
    difficulty?: unknown;
    timeMs?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 20) : "";
  const difficulty =
    typeof body.difficulty === "string" ? body.difficulty : "";
  const timeMs = typeof body.timeMs === "number" ? Math.floor(body.timeMs) : NaN;

  if (!name) {
    return reply.code(400).send({ error: "invalid_name" });
  }

  if (!isValidDifficulty(difficulty)) {
    return reply.code(400).send({ error: "invalid_difficulty" });
  }

  if (!Number.isFinite(timeMs) || timeMs <= 0) {
    return reply.code(400).send({ error: "invalid_time" });
  }

  await pool.query(
    `
      INSERT INTO cpu_rankings (name, difficulty, time_ms)
      VALUES ($1, $2, $3)
    `,
    [name, difficulty, timeMs]
  );

  const result = await pool.query<CpuRankingRow>(
    `
      SELECT id, name, difficulty, time_ms, created_at
      FROM cpu_rankings
      WHERE difficulty = $1
      ORDER BY time_ms ASC, created_at ASC
      LIMIT 10
    `,
    [difficulty]
  );

  return reply.code(201).send({
    ok: true,
    difficulty,
    items: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      difficulty: row.difficulty,
      timeMs: row.time_ms,
      createdAt: row.created_at,
    })),
  });
});

app.listen({ port: PORT, host: "0.0.0.0" }, async (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  try {
    await ensureRankingTable();
    app.log.info("Ranking table is ready");
  } catch (dbError) {
    app.log.error(dbError);
  }

  const wss = new WebSocketServer({
    server: app.server,
    path: "/ws",
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.on("message", (raw: string | Buffer) => {
      try {
        const message = JSON.parse(String(raw)) as ClientMessage;

        if (message.type === "create_room") {
          handleCreateRoom(socket, message.roomId);
          return;
        }

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

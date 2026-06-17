import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });

const rooms = new Map<string, Set<WebSocket>>();

function broadcast(roomCode: string, message: object, exclude?: WebSocket) {
  const clients = rooms.get(roomCode);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on("connection", (ws) => {
  let currentRoom: string | null = null;

  ws.on("message", (data) => {
    let msg: { type: string; code?: string };
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
      return;
    }

    if (msg.type === "JOIN") {
      const code = msg.code;
      if (!code) {
        ws.send(JSON.stringify({ type: "ERROR", message: "code required" }));
        return;
      }
      if (currentRoom) {
        const prev = rooms.get(currentRoom);
        prev?.delete(ws);
      }
      currentRoom = code;
      if (!rooms.has(code)) rooms.set(code, new Set());
      rooms.get(code)!.add(ws);
      const count = rooms.get(code)!.size;
      ws.send(JSON.stringify({ type: "JOINED", code, peerCount: count }));
      broadcast(code, { type: "PEER_JOINED", peerCount: count }, ws);
      logger.info({ code, peerCount: count }, "WS peer joined room");
    } else if (msg.type === "FILE_AVAILABLE") {
      if (currentRoom) broadcast(currentRoom, msg, ws);
    } else if (msg.type === "PING") {
      ws.send(JSON.stringify({ type: "PONG" }));
    }
  });

  ws.on("close", () => {
    if (currentRoom) {
      const clients = rooms.get(currentRoom);
      clients?.delete(ws);
      const count = clients?.size ?? 0;
      broadcast(currentRoom, { type: "PEER_LEFT", peerCount: count });
      if (count === 0) rooms.delete(currentRoom);
      logger.info({ code: currentRoom, peerCount: count }, "WS peer left room");
    }
  });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

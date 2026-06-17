import { Router } from "express";
import { db, roomsTable, roomFilesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function roomResponse(r: { code: string; status: string; peerCount: number; createdAt: Date; expiresAt: Date }) {
  return {
    code: r.code,
    status: r.status,
    peerCount: r.peerCount,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  };
}

router.post("/rooms", async (_req, res) => {
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
    if (existing.length === 0) break;
    code = generateCode();
    attempts++;
  }
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const [room] = await db
    .insert(roomsTable)
    .values({ code, status: "waiting", peerCount: 1, expiresAt })
    .returning();
  return res.status(201).json(roomResponse(room));
});

router.get("/rooms/:code", async (req, res) => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) return res.status(404).json({ error: "Room not found" });
  return res.json(roomResponse(room));
});

router.post("/rooms/:code/join", async (req, res) => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.peerCount >= 2) return res.status(409).json({ error: "Room is full" });
  if (room.status === "closed") return res.status(409).json({ error: "Room is closed" });
  const [updated] = await db
    .update(roomsTable)
    .set({ peerCount: 2, status: "connected" })
    .where(eq(roomsTable.code, code))
    .returning();
  return res.json(roomResponse(updated));
});

router.delete("/rooms/:code", async (req, res) => {
  const { code } = req.params;
  await db.update(roomsTable).set({ status: "closed" }).where(eq(roomsTable.code, code));
  return res.status(204).send();
});

router.post("/rooms/:code/files", async (req, res) => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) return res.status(404).json({ error: "Room not found" });

  const { fileName, fileSize, mimeType, encryptedAesKey, iv, authTag, ciphertext, senderPublicKey } = req.body as {
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    encryptedAesKey: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    senderPublicKey: string;
  };

  if (!fileName || !encryptedAesKey || !iv || !authTag || !ciphertext || !senderPublicKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [file] = await db
    .insert(roomFilesTable)
    .values({ roomCode: code, fileName, fileSize: fileSize ?? null, mimeType: mimeType ?? null, encryptedAesKey, iv, authTag, ciphertext, senderPublicKey })
    .returning();

  return res.status(201).json({
    id: file.id,
    roomCode: file.roomCode,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    encryptedAesKey: file.encryptedAesKey,
    iv: file.iv,
    authTag: file.authTag,
    ciphertext: file.ciphertext,
    senderPublicKey: file.senderPublicKey,
    downloadedAt: file.downloadedAt?.toISOString() ?? null,
    createdAt: file.createdAt.toISOString(),
  });
});

router.get("/rooms/:code/files", async (req, res) => {
  const { code } = req.params;
  const files = await db
    .select()
    .from(roomFilesTable)
    .where(and(eq(roomFilesTable.roomCode, code), isNull(roomFilesTable.downloadedAt)));

  return res.json(
    files.map((f) => ({
      id: f.id,
      roomCode: f.roomCode,
      fileName: f.fileName,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      encryptedAesKey: f.encryptedAesKey,
      iv: f.iv,
      authTag: f.authTag,
      ciphertext: f.ciphertext,
      senderPublicKey: f.senderPublicKey,
      downloadedAt: f.downloadedAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
    }))
  );
});

router.get("/rooms/:code/files/:fileId", async (req, res) => {
  const fileId = Number(req.params.fileId);
  const { code } = req.params;
  const [file] = await db
    .select()
    .from(roomFilesTable)
    .where(and(eq(roomFilesTable.id, fileId), eq(roomFilesTable.roomCode, code)));
  if (!file) return res.status(404).json({ error: "File not found" });
  return res.json({
    id: file.id,
    roomCode: file.roomCode,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    encryptedAesKey: file.encryptedAesKey,
    iv: file.iv,
    authTag: file.authTag,
    ciphertext: file.ciphertext,
    senderPublicKey: file.senderPublicKey,
    downloadedAt: file.downloadedAt?.toISOString() ?? null,
    createdAt: file.createdAt.toISOString(),
  });
});

router.delete("/rooms/:code/files/:fileId", async (req, res) => {
  const fileId = Number(req.params.fileId);
  const { code } = req.params;
  await db
    .update(roomFilesTable)
    .set({ downloadedAt: new Date() })
    .where(and(eq(roomFilesTable.id, fileId), eq(roomFilesTable.roomCode, code)));
  return res.status(204).send();
});

export default router;

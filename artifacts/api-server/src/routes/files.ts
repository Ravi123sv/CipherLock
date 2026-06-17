import { Router } from "express";
import crypto from "node:crypto";
import { db, fileOperationsTable, keyPairsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const ALGORITHM = "AES-256-GCM + RSA-OAEP-2048";

router.post("/files/encrypt", async (req, res) => {
  const { fileName, fileData, publicKey, keyId } = req.body as {
    fileName: string;
    fileData: string;
    publicKey: string;
    keyId?: number | null;
  };

  if (!fileName || !fileData || !publicKey) {
    return res.status(400).json({ error: "fileName, fileData, and publicKey are required" });
  }

  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const fileBuffer = Buffer.from(fileData, "base64");
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  let rsaPublicKey: crypto.KeyObject;
  try {
    rsaPublicKey = crypto.createPublicKey(publicKey);
  } catch {
    return res.status(400).json({ error: "Invalid public key PEM" });
  }

  const encryptedAesKey = crypto.publicEncrypt(
    { key: rsaPublicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    aesKey
  );

  const [row] = await db
    .insert(fileOperationsTable)
    .values({
      type: "encrypt",
      fileName,
      algorithm: ALGORITHM,
      keyId: keyId ?? null,
    })
    .returning();

  return res.json({
    id: row.id,
    fileName,
    encryptedAesKey: encryptedAesKey.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    algorithm: ALGORITHM,
    createdAt: row.createdAt.toISOString(),
  });
});

router.post("/files/decrypt", async (req, res) => {
  const { encryptedAesKey, iv, authTag, ciphertext, privateKey, fileName } = req.body as {
    encryptedAesKey: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    privateKey: string;
    fileName?: string;
  };

  if (!encryptedAesKey || !iv || !authTag || !ciphertext || !privateKey) {
    return res.status(400).json({ error: "encryptedAesKey, iv, authTag, ciphertext, and privateKey are required" });
  }

  let rsaPrivateKey: crypto.KeyObject;
  try {
    rsaPrivateKey = crypto.createPrivateKey(privateKey);
  } catch {
    return res.status(400).json({ error: "Invalid private key PEM" });
  }

  let aesKey: Buffer;
  try {
    aesKey = crypto.privateDecrypt(
      { key: rsaPrivateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
      Buffer.from(encryptedAesKey, "base64")
    );
  } catch {
    return res.status(400).json({ error: "Failed to decrypt AES key — wrong private key?" });
  }

  let decrypted: Buffer;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
  } catch {
    return res.status(400).json({ error: "Decryption failed — data may be corrupted or tampered with" });
  }

  const name = fileName ?? "decrypted_file";

  await db.insert(fileOperationsTable).values({
    type: "decrypt",
    fileName: name,
    algorithm: ALGORITHM,
    keyId: null,
  });

  const now = new Date();
  return res.json({
    fileName: name,
    fileData: decrypted.toString("base64"),
    algorithm: ALGORITHM,
    decryptedAt: now.toISOString(),
  });
});

router.get("/files", async (_req, res) => {
  const rows = await db
    .select({
      id: fileOperationsTable.id,
      type: fileOperationsTable.type,
      fileName: fileOperationsTable.fileName,
      algorithm: fileOperationsTable.algorithm,
      keyId: fileOperationsTable.keyId,
      keyLabel: keyPairsTable.label,
      createdAt: fileOperationsTable.createdAt,
    })
    .from(fileOperationsTable)
    .leftJoin(keyPairsTable, eq(fileOperationsTable.keyId, keyPairsTable.id))
    .orderBy(desc(fileOperationsTable.createdAt))
    .limit(50);

  return res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      fileName: r.fileName,
      algorithm: r.algorithm,
      keyId: r.keyId,
      keyLabel: r.keyLabel ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.get("/files/stats", async (_req, res) => {
  const [totalOps] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fileOperationsTable);

  const [encryptCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fileOperationsTable)
    .where(eq(fileOperationsTable.type, "encrypt"));

  const [decryptCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fileOperationsTable)
    .where(eq(fileOperationsTable.type, "decrypt"));

  const [keyCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(keyPairsTable);

  const recentRows = await db
    .select({
      id: fileOperationsTable.id,
      type: fileOperationsTable.type,
      fileName: fileOperationsTable.fileName,
      algorithm: fileOperationsTable.algorithm,
      keyId: fileOperationsTable.keyId,
      keyLabel: keyPairsTable.label,
      createdAt: fileOperationsTable.createdAt,
    })
    .from(fileOperationsTable)
    .leftJoin(keyPairsTable, eq(fileOperationsTable.keyId, keyPairsTable.id))
    .orderBy(desc(fileOperationsTable.createdAt))
    .limit(5);

  return res.json({
    totalOperations: totalOps.count,
    totalEncryptions: encryptCount.count,
    totalDecryptions: decryptCount.count,
    totalKeyPairs: keyCount.count,
    recentActivity: recentRows.map((r) => ({
      id: r.id,
      type: r.type,
      fileName: r.fileName,
      algorithm: r.algorithm,
      keyId: r.keyId,
      keyLabel: r.keyLabel ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default router;

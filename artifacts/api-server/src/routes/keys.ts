import { Router } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { db, keyPairsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const router = Router();

function computeFingerprint(publicKeyPem: string): string {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const der = keyObj.export({ type: "spki", format: "der" });
  return crypto.createHash("sha256").update(der).digest("hex").match(/.{2}/g)!.join(":").slice(0, 47);
}

router.post("/keys/generate", async (req, res) => {
  const { label, keySize = 2048 } = req.body as { label: string; keySize?: number };
  if (!label || typeof label !== "string") {
    return res.status(400).json({ error: "label is required" });
  }
  const size = [2048, 4096].includes(keySize) ? keySize : 2048;

  const { publicKey, privateKey } = await generateKeyPairAsync("rsa", {
    modulusLength: size,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const fingerprint = computeFingerprint(publicKey);

  const [row] = await db
    .insert(keyPairsTable)
    .values({ label, keySize: size, fingerprint, publicKey, privateKey })
    .returning();

  return res.status(201).json({
    id: row.id,
    label: row.label,
    keySize: row.keySize,
    fingerprint: row.fingerprint,
    publicKey: row.publicKey,
    privateKey: row.privateKey,
    createdAt: row.createdAt.toISOString(),
  });
});

router.get("/keys", async (_req, res) => {
  const rows = await db.select().from(keyPairsTable).orderBy(keyPairsTable.createdAt);
  return res.json(
    rows.map((r) => ({
      id: r.id,
      label: r.label,
      keySize: r.keySize,
      fingerprint: r.fingerprint,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.get("/keys/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

  const [row] = await db.select().from(keyPairsTable).where(eq(keyPairsTable.id, id));
  if (!row) return res.status(404).json({ error: "Key pair not found" });

  return res.json({
    id: row.id,
    label: row.label,
    keySize: row.keySize,
    fingerprint: row.fingerprint,
    publicKey: row.publicKey,
    privateKey: row.privateKey,
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/keys/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

  await db.delete(keyPairsTable).where(eq(keyPairsTable.id, id));
  return res.status(204).send();
});

export default router;

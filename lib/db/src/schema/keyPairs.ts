import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keyPairsTable = pgTable("key_pairs", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  keySize: integer("key_size").notNull().default(2048),
  fingerprint: text("fingerprint").notNull(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKeyPairSchema = createInsertSchema(keyPairsTable).omit({ id: true, createdAt: true });
export type InsertKeyPair = z.infer<typeof insertKeyPairSchema>;
export type KeyPair = typeof keyPairsTable.$inferSelect;

import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { keyPairsTable } from "./keyPairs";

export const fileOperationsTable = pgTable("file_operations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  algorithm: text("algorithm").notNull().default("AES-256-GCM + RSA-OAEP-2048"),
  keyId: integer("key_id").references(() => keyPairsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFileOperationSchema = createInsertSchema(fileOperationsTable).omit({ id: true, createdAt: true });
export type InsertFileOperation = z.infer<typeof insertFileOperationSchema>;
export type FileOperation = typeof fileOperationsTable.$inferSelect;

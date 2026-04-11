import { eq, desc, asc, sql, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, materials, contactMessages,
  materialRatings, materialComments, downloadLogs,
  InsertMaterial, InsertContactMessage,
  InsertMaterialRating, InsertMaterialComment, InsertDownloadLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Materials ───────────────────────────────────────────────────────────────

export async function getMaterials(grade?: number) {
  const db = await getDb();
  if (!db) return [];
  if (grade) {
    return db.select().from(materials).where(eq(materials.grade, grade)).orderBy(asc(materials.grade), asc(materials.stage));
  }
  return db.select().from(materials).orderBy(asc(materials.grade), asc(materials.stage));
}

export async function getMaterialById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  return result[0];
}

export async function insertMaterial(data: InsertMaterial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(materials).values(data);
}

export async function deleteMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materials).where(eq(materials.id, id));
}

// ─── Contact Messages ─────────────────────────────────────────────────────────

export async function insertContactMessage(data: InsertContactMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(contactMessages).values(data);
}

export async function getContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export async function upsertRating(data: InsertMaterialRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(materialRatings).values(data).onDuplicateKeyUpdate({
    set: { rating: data.rating },
  });
}

export async function getRatingsForMaterial(materialId: number) {
  const db = await getDb();
  if (!db) return { average: 0, count: 0, ratings: [] as { userId: number; rating: number }[] };
  const rows = await db.select().from(materialRatings).where(eq(materialRatings.materialId, materialId));
  const total = rows.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: rows.length > 0 ? total / rows.length : 0,
    count: rows.length,
    ratings: rows.map(r => ({ userId: r.userId, rating: r.rating })),
  };
}

export async function getUserRating(materialId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(materialRatings)
    .where(and(eq(materialRatings.materialId, materialId), eq(materialRatings.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function insertComment(data: InsertMaterialComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(materialComments).values(data);
}

export async function getCommentsForMaterial(materialId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: materialComments.id,
    materialId: materialComments.materialId,
    userId: materialComments.userId,
    content: materialComments.content,
    createdAt: materialComments.createdAt,
    userName: users.name,
  })
    .from(materialComments)
    .leftJoin(users, eq(materialComments.userId, users.id))
    .where(eq(materialComments.materialId, materialId))
    .orderBy(desc(materialComments.createdAt));
  return rows;
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materialComments).where(eq(materialComments.id, id));
}

export async function getCommentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materialComments).where(eq(materialComments.id, id)).limit(1);
  return result[0];
}

// ─── Download Logs ────────────────────────────────────────────────────────────

export async function insertDownloadLog(data: InsertDownloadLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(downloadLogs).values(data);
}

export async function getDownloadCountByMaterial() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    materialId: downloadLogs.materialId,
    downloadCount: count(downloadLogs.id),
  })
    .from(downloadLogs)
    .groupBy(downloadLogs.materialId)
    .orderBy(desc(count(downloadLogs.id)));
  return rows;
}

export async function getTotalDownloads() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count(downloadLogs.id) }).from(downloadLogs);
  return result[0]?.total ?? 0;
}

// ─── Admin Queries ────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function getTotalUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count(users.id) }).from(users);
  return result[0]?.total ?? 0;
}

export async function getTotalMaterials() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count(materials.id) }).from(materials);
  return result[0]?.total ?? 0;
}

export async function getTotalMessages() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count(contactMessages.id) }).from(contactMessages);
  return result[0]?.total ?? 0;
}

export async function getMaterialsWithUploader() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: materials.id,
    title: materials.title,
    description: materials.description,
    grade: materials.grade,
    stage: materials.stage,
    fileName: materials.fileName,
    fileSize: materials.fileSize,
    mimeType: materials.mimeType,
    language: materials.language,
    uploadedBy: materials.uploadedBy,
    createdAt: materials.createdAt,
    uploaderName: users.name,
    uploaderEmail: users.email,
  })
    .from(materials)
    .leftJoin(users, eq(materials.uploadedBy, users.id))
    .orderBy(desc(materials.createdAt));
  return rows;
}

export async function getRecentComments(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: materialComments.id,
    materialId: materialComments.materialId,
    content: materialComments.content,
    createdAt: materialComments.createdAt,
    userName: users.name,
    userEmail: users.email,
    materialTitle: materials.title,
  })
    .from(materialComments)
    .leftJoin(users, eq(materialComments.userId, users.id))
    .leftJoin(materials, eq(materialComments.materialId, materials.id))
    .orderBy(desc(materialComments.createdAt))
    .limit(limit);
  return rows;
}

export async function getRecentDownloads(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: downloadLogs.id,
    createdAt: downloadLogs.createdAt,
    userName: users.name,
    userEmail: users.email,
    materialTitle: materials.title,
    materialGrade: materials.grade,
  })
    .from(downloadLogs)
    .leftJoin(users, eq(downloadLogs.userId, users.id))
    .leftJoin(materials, eq(downloadLogs.materialId, materials.id))
    .orderBy(desc(downloadLogs.createdAt))
    .limit(limit);
  return rows;
}

export async function getAllRatingsWithDetails() {
  const db = await getDb();
  if (!db) return [];
  // Get average rating per material
  const rows = await db.select({
    materialId: materialRatings.materialId,
    avgRating: sql<number>`AVG(${materialRatings.rating})`,
    ratingCount: count(materialRatings.id),
    materialTitle: materials.title,
    materialGrade: materials.grade,
  })
    .from(materialRatings)
    .leftJoin(materials, eq(materialRatings.materialId, materials.id))
    .groupBy(materialRatings.materialId, materials.title, materials.grade)
    .orderBy(desc(sql`AVG(${materialRatings.rating})`));
  return rows;
}

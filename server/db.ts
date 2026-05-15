import { eq, desc, asc, sql, and, count, or, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, materials, contactMessages,
  materialRatings, materialComments, downloadLogs, materialFiles,
  InsertMaterial, InsertContactMessage,
  InsertMaterialRating, InsertMaterialComment, InsertDownloadLog, InsertMaterialFile,
  events, eventRegistrations, InsertEvent, InsertEventRegistration,
  forumTopicViews, forumReactions,
  brailleProjects, InsertBrailleProject, BrailleProject,
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
    const textFields = ["name", "email", "loginMethod", "country", "countryCode", "regionName", "city"] as const;
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

/** Public listing: excludes hidden materials. Admin/owner listing uses getMaterialsAll. */
export async function getMaterials(grade?: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const visibleOnly = eq(materials.hidden, false);
  const conditions = [visibleOnly];
  if (grade) conditions.push(eq(materials.grade, grade));
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        like(materials.title, term),
        like(materials.description, term),
        like(materials.creatorName, term)
      )!
    );
  }
  return db.select().from(materials)
    .where(and(...conditions))
    .orderBy(asc(materials.grade), asc(materials.stage));
}

/** Returns all materials including hidden ones (for admin/owner views). */
export async function getMaterialsAll(grade?: number) {
  const db = await getDb();
  if (!db) return [];
  if (grade) {
    return db.select().from(materials)
      .where(eq(materials.grade, grade))
      .orderBy(asc(materials.grade), asc(materials.stage));
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

export async function updateMaterial(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    grade?: number;
    stage?: number | null;
    language?: "pt" | "en" | "both";
    materialType?: "partitura" | "atividade";
    creatorVision?: "vidente" | "pdv";
    creatorName?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(data).where(eq(materials.id, id));
}

export async function replaceMaterialFile(
  id: number,
  data: { fileKey: string; fileUrl: string; fileName: string; fileSize: number; mimeType: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(data).where(eq(materials.id, id));
}

export async function toggleMaterialVisibility(id: number, hidden: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set({ hidden }).where(eq(materials.id, id));
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
    country: users.country,
    countryCode: users.countryCode,
    regionName: users.regionName,
    city: users.city,
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
    materialType: materials.materialType,
    creatorVision: materials.creatorVision,
    creatorName: materials.creatorName,
    uploadedBy: materials.uploadedBy,
    hidden: materials.hidden,
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


// ─── Material Files (Multiple files per material) ────────────────────────────

export async function addFileToMaterial(data: InsertMaterialFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materialFiles).values(data);
  return result;
}

export async function getFilesByMaterial(materialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialFiles)
    .where(eq(materialFiles.materialId, materialId))
    .orderBy(asc(materialFiles.createdAt));
}

export async function deleteFile(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materialFiles).where(eq(materialFiles.id, fileId));
}

export async function getFileById(fileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materialFiles)
    .where(eq(materialFiles.id, fileId))
    .limit(1);
  return result[0];
}

// ─── Events helpers ──────────────────────────────────────────────────────────

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(data);
  return result[0];
}
export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(events).set(data).where(eq(events.id, id));
}
export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
  await db.delete(events).where(eq(events.id, id));
}
export async function listEvents(onlyPublished = true) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(events);
  if (onlyPublished) return q.where(eq(events.status, "published")).orderBy(desc(events.eventDate));
  return q.orderBy(desc(events.eventDate));
}
export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0];
}

// ─── Event Registrations helpers ─────────────────────────────────────────────
export async function createRegistration(data: InsertEventRegistration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eventRegistrations).values(data);
  return result[0];
}
export async function countRegistrations(eventId: number) {
  const db = await getDb();
  if (!db) return { total: 0, waitlisted: 0 };
  const rows = await db.select().from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, eventId));
  return {
    total: rows.length,
    waitlisted: rows.filter(r => r.waitlisted).length,
    confirmed: rows.filter(r => !r.waitlisted).length,
  };
}
export async function listRegistrationsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: eventRegistrations.id,
    eventId: eventRegistrations.eventId,
    userId: eventRegistrations.userId,
    country: eventRegistrations.country,
    instrument: eventRegistrations.instrument,
    brailleLevel: eventRegistrations.brailleLevel,
    isVisuallyImpaired: eventRegistrations.isVisuallyImpaired,
    motivation: eventRegistrations.motivation,
    waitlisted: eventRegistrations.waitlisted,
    createdAt: eventRegistrations.createdAt,
    userName: users.name,
    userEmail: users.email,
  }).from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(asc(eventRegistrations.createdAt));
}
export async function getUserRegistration(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)))
    .limit(1);
  return result[0];
}
export async function cancelRegistration(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
}
export async function listUserRegistrations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: eventRegistrations.id,
    eventId: eventRegistrations.eventId,
    waitlisted: eventRegistrations.waitlisted,
    createdAt: eventRegistrations.createdAt,
    eventTitle: events.title,
    eventDate: events.eventDate,
    eventFormat: events.format,
    meetingLink: events.meetingLink,
  }).from(eventRegistrations)
    .leftJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(eq(eventRegistrations.userId, userId))
    .orderBy(desc(events.eventDate));
}

// ─── Forum ────────────────────────────────────────────────────────────────────
import {
  forumCategories, forumTopics, forumPosts, userDisplayNames,
  InsertForumTopic, InsertForumPost,
} from "../drizzle/schema";

export async function getForumCategories() {
  const db = await getDb();
  if (!db) return [];
  const cats = await db.select().from(forumCategories).orderBy(asc(forumCategories.sortOrder));
  // attach topic count to each category
  const counts = await db.select({
    categoryId: forumTopics.categoryId,
    topicCount: count(forumTopics.id),
  }).from(forumTopics)
    .where(eq(forumTopics.hidden, false))
    .groupBy(forumTopics.categoryId);
  const countMap = Object.fromEntries(counts.map(c => [c.categoryId, c.topicCount]));
  return cats.map(c => ({ ...c, topicCount: countMap[c.id] ?? 0 }));
}

export async function getForumCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(forumCategories).where(eq(forumCategories.slug, slug)).limit(1);
  return result[0];
}

export async function getForumTopics(categoryId: number, includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  const cond = includeHidden
    ? eq(forumTopics.categoryId, categoryId)
    : and(eq(forumTopics.categoryId, categoryId), eq(forumTopics.hidden, false));
  const rows = await db.select({
    id: forumTopics.id,
    categoryId: forumTopics.categoryId,
    userId: forumTopics.userId,
    title: forumTopics.title,
    language: forumTopics.language,
    pinned: forumTopics.pinned,
    hidden: forumTopics.hidden,
    lastPostAt: forumTopics.lastPostAt,
    createdAt: forumTopics.createdAt,
    authorName: users.name,
    authorDisplayName: userDisplayNames.displayName,
    viewCount: forumTopicViews.viewCount,
  }).from(forumTopics)
    .leftJoin(users, eq(forumTopics.userId, users.id))
    .leftJoin(userDisplayNames, eq(forumTopics.userId, userDisplayNames.userId))
    .leftJoin(forumTopicViews, eq(forumTopics.id, forumTopicViews.topicId))
    .where(cond)
    .orderBy(desc(forumTopics.pinned), desc(forumTopics.lastPostAt));
  // attach reply count
  const topicIds = rows.map(r => r.id);
  if (topicIds.length === 0) return rows.map(r => ({ ...r, replyCount: 0, viewCount: r.viewCount ?? 0 }));
  const replyCounts = await db.select({
    topicId: forumPosts.topicId,
    replyCount: count(forumPosts.id),
  }).from(forumPosts)
    .where(and(eq(forumPosts.hidden, false), sql`${forumPosts.topicId} IN (${sql.join(topicIds.map(id => sql`${id}`), sql`, `)})`))  
    .groupBy(forumPosts.topicId);
  const replyMap = Object.fromEntries(replyCounts.map(r => [r.topicId, r.replyCount]));
  return rows.map(r => ({ ...r, replyCount: replyMap[r.id] ?? 0, viewCount: r.viewCount ?? 0 }));
}

export async function getForumTopicById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: forumTopics.id,
    categoryId: forumTopics.categoryId,
    userId: forumTopics.userId,
    title: forumTopics.title,
    pinned: forumTopics.pinned,
    hidden: forumTopics.hidden,
    lastPostAt: forumTopics.lastPostAt,
    createdAt: forumTopics.createdAt,
  }).from(forumTopics).where(eq(forumTopics.id, id)).limit(1);
  return result[0];
}

export async function createForumTopic(data: InsertForumTopic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(forumTopics).values(data);
  return result[0];
}

export async function updateForumTopicLastPost(topicId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(forumTopics).set({ lastPostAt: new Date() }).where(eq(forumTopics.id, topicId));
}

export async function toggleForumTopicPin(id: number, pinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumTopics).set({ pinned }).where(eq(forumTopics.id, id));
}

export async function toggleForumTopicHidden(id: number, hidden: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumTopics).set({ hidden }).where(eq(forumTopics.id, id));
}

export async function deleteForumTopic(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(forumPosts).where(eq(forumPosts.topicId, id));
  await db.delete(forumTopics).where(eq(forumTopics.id, id));
}

export async function getForumPosts(topicId: number, includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  const cond = includeHidden
    ? eq(forumPosts.topicId, topicId)
    : and(eq(forumPosts.topicId, topicId), eq(forumPosts.hidden, false));
  return db.select({
    id: forumPosts.id,
    topicId: forumPosts.topicId,
    userId: forumPosts.userId,
    body: forumPosts.body,
    hidden: forumPosts.hidden,
    createdAt: forumPosts.createdAt,
    updatedAt: forumPosts.updatedAt,
    authorName: users.name,
    authorDisplayName: userDisplayNames.displayName,
    authorEmail: users.email,
  }).from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id))
    .leftJoin(userDisplayNames, eq(forumPosts.userId, userDisplayNames.userId))
    .where(cond)
    .orderBy(asc(forumPosts.createdAt));
}

export async function createForumPost(data: InsertForumPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(forumPosts).values(data);
  await updateForumTopicLastPost(data.topicId);
}

export async function toggleForumPostHidden(id: number, hidden: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumPosts).set({ hidden }).where(eq(forumPosts.id, id));
}

export async function deleteForumPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(forumPosts).where(eq(forumPosts.id, id));
}

export async function getForumPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
  return result[0];
}

// ─── User Display Names ────────────────────────────────────────────────────────

export async function getUserDisplayName(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userDisplayNames).where(eq(userDisplayNames.userId, userId)).limit(1);
  return result[0]?.displayName ?? null;
}

export async function setUserDisplayName(userId: number, displayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userDisplayNames).values({ userId, displayName })
    .onDuplicateKeyUpdate({ set: { displayName } });
}

// ─── Forum Topic Views ──────────────────────────────────────────────────────────────────
export async function incrementTopicView(topicId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(forumTopicViews)
    .values({ topicId, viewCount: 1 })
    .onDuplicateKeyUpdate({ set: { viewCount: sql`${forumTopicViews.viewCount} + 1` } });
}

export async function getTopicViewCount(topicId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ viewCount: forumTopicViews.viewCount })
    .from(forumTopicViews)
    .where(eq(forumTopicViews.topicId, topicId))
    .limit(1);
  return result[0]?.viewCount ?? 0;
}

// ─── Forum Reactions ──────────────────────────────────────────────────────────────────
export type EmojiType = "thumbsup" | "heart" | "bulb" | "music" | "hands" | "question";

export async function toggleForumReaction(postId: number, userId: number, emoji: EmojiType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if reaction already exists
  const existing = await db.select({ id: forumReactions.id })
    .from(forumReactions)
    .where(and(
      eq(forumReactions.postId, postId),
      eq(forumReactions.userId, userId),
      eq(forumReactions.emoji, emoji)
    ))
    .limit(1);
  if (existing.length > 0) {
    // Remove reaction
    await db.delete(forumReactions).where(eq(forumReactions.id, existing[0].id));
    return { added: false };
  } else {
    // Add reaction
    await db.insert(forumReactions).values({ postId, userId, emoji });
    return { added: true };
  }
}

export async function getReactionsForPosts(postIds: number[]) {
  const db = await getDb();
  if (!db || postIds.length === 0) return [];
  return db.select()
    .from(forumReactions)
    .where(inArray(forumReactions.postId, postIds));
}

// ─── Forum Search ───────────────────────────────────────────────────────────────────
export async function searchForumTopics(query: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${query}%`;
  // Search in topic titles
  const topicResults = await db
    .select({
      topicId: forumTopics.id,
      topicTitle: forumTopics.title,
      categoryId: forumTopics.categoryId,
      language: forumTopics.language,
      createdAt: forumTopics.createdAt,
      matchType: sql<string>`'title'`,
      snippet: sql<string>`NULL`,
    })
    .from(forumTopics)
    .where(and(
      eq(forumTopics.hidden, false),
      like(forumTopics.title, term)
    ))
    .limit(20);

  // Search in post bodies
  const postResults = await db
    .select({
      topicId: forumPosts.topicId,
      topicTitle: forumTopics.title,
      categoryId: forumTopics.categoryId,
      language: forumTopics.language,
      createdAt: forumTopics.createdAt,
      matchType: sql<string>`'body'`,
      snippet: sql<string>`SUBSTRING(${forumPosts.body}, 1, 200)`,
    })
    .from(forumPosts)
    .innerJoin(forumTopics, eq(forumPosts.topicId, forumTopics.id))
    .where(and(
      eq(forumPosts.hidden, false),
      eq(forumTopics.hidden, false),
      like(forumPosts.body, term)
    ))
    .limit(20);

  // Merge, deduplicate by topicId
  const seen = new Set<number>();
  const merged: typeof topicResults = [];
  for (const r of [...topicResults, ...postResults]) {
    if (!seen.has(r.topicId)) {
      seen.add(r.topicId);
      merged.push(r);
    }
  }
  return merged.slice(0, 20);
}

// ─── Forum seed (5 default categories) ────────────────────────────────────────────────────────────
export async function seedForumCategories() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: forumCategories.id }).from(forumCategories).limit(1);
  if (existing.length > 0) return; // already seeded
  await db.insert(forumCategories).values([
    {
      slug: "musicografia-braille",
      namePt: "Musicografia Braille",
      nameEn: "Braille Music Notation",
      nameEs: "Musicografía Braille",
      descriptionPt: "Dúvidas, descobertas e discussões sobre o método Five Steps e a musicografia braille em geral.",
      descriptionEn: "Questions, discoveries and discussions about the Five Steps method and braille music notation in general.",
      descriptionEs: "Dudas, descubrimientos y discusiones sobre el método Five Steps y la musicografía braille en general.",
      sortOrder: 1,
    },
    {
      slug: "acervo",
      namePt: "Acervo de Partituras",
      nameEn: "Sheet Music Archive",
      nameEs: "Acervo de Partituras",
      descriptionPt: "Dúvidas e sugestões sobre os materiais disponíveis no acervo.",
      descriptionEn: "Questions and suggestions about the materials available in the archive.",
      descriptionEs: "Dudas y sugerencias sobre los materiales disponibles en el acervo.",
      sortOrder: 2,
    },
    {
      slug: "duvidas-suporte",
      namePt: "Dúvidas e Suporte",
      nameEn: "Questions & Support",
      nameEs: "Dudas y Soporte",
      descriptionPt: "Tire suas dúvidas sobre o método, o site e os materiais.",
      descriptionEn: "Get help with the method, the website and the materials.",
      descriptionEs: "Resuelve tus dudas sobre el método, el sitio y los materiales.",
      sortOrder: 3,
    },
    {
      slug: "eventos-formacoes",
      namePt: "Eventos e Formações",
      nameEn: "Events & Training",
      nameEs: "Eventos y Formaciones",
      descriptionPt: "Discussões sobre aulas, workshops, palestras e outras atividades.",
      descriptionEn: "Discussions about classes, workshops, lectures and other activities.",
      descriptionEs: "Discusiones sobre clases, talleres, conferencias y otras actividades.",
      sortOrder: 4,
    },
    {
      slug: "geral",
      namePt: "Geral",
      nameEn: "General",
      nameEs: "General",
      descriptionPt: "Conversas gerais sobre música, inclusão e acessibilidade.",
      descriptionEn: "General conversations about music, inclusion and accessibility.",
      descriptionEs: "Conversaciones generales sobre música, inclusión y accesibilidad.",
      sortOrder: 5,
    },
  ]);
}

// ─── Braille Editor Projects ────────────────────────────────────────────────

export async function createBrailleProject(data: InsertBrailleProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brailleProjects).values(data);
  const insertId = Number((result as any)[0]?.insertId ?? 0);
  return { id: insertId, ...data };
}

export async function updateBrailleProject(id: number, data: Partial<InsertBrailleProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(brailleProjects).set(data).where(eq(brailleProjects.id, id));
}

export async function deleteBrailleProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(brailleProjects).where(eq(brailleProjects.id, id));
}

export async function getBrailleProjectById(id: number): Promise<BrailleProject | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brailleProjects).where(eq(brailleProjects.id, id)).limit(1);
  return result[0];
}

export async function listBrailleProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brailleProjects)
    .where(eq(brailleProjects.userId, userId))
    .orderBy(desc(brailleProjects.updatedAt));
}

export async function getAllBrailleProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: brailleProjects.id,
    userId: brailleProjects.userId,
    title: brailleProjects.title,
    language: brailleProjects.language,
    createdAt: brailleProjects.createdAt,
    updatedAt: brailleProjects.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(brailleProjects)
    .leftJoin(users, eq(brailleProjects.userId, users.id))
    .orderBy(desc(brailleProjects.updatedAt));
}

export async function getTotalBrailleProjects() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count(brailleProjects.id) }).from(brailleProjects);
  return result[0]?.total ?? 0;
}

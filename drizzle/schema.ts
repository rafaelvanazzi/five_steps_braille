import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, uniqueIndex, boolean, longtext, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("countryCode", { length: 4 }),
  regionName: varchar("regionName", { length: 100 }),
  city: varchar("city", { length: 100 }),
  preferredBrfExportFormat: varchar("preferredBrfExportFormat", { length: 32 }).default("a4-brasil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Materials for the Five Steps library/archive
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  grade: int("grade").notNull(), // 1-5 (Five Steps grades)
  stage: int("stage"), // specific stage within grade (optional)
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  mimeType: varchar("mimeType", { length: 128 }),
  language: mysqlEnum("language", ["pt", "en", "both"]).default("pt").notNull(),
  materialType: mysqlEnum("materialType", ["partitura", "atividade"]).default("atividade").notNull(),
  creatorVision: mysqlEnum("creatorVision", ["vidente", "pdv"]).default("vidente").notNull(),
  creatorName: varchar("creatorName", { length: 255 }),
  uploadedBy: int("uploadedBy").notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// Contact messages from institutions and interested parties
export const contactMessages = mysqlTable("contact_messages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  institution: varchar("institution", { length: 255 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["institution", "musician_dv", "musician_nodv", "general"]).default("general").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

// ─── Ratings (stars) for materials ──────────────────────────────────────────
export const materialRatings = mysqlTable("material_ratings", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("unique_user_material").on(table.userId, table.materialId),
]);

export type MaterialRating = typeof materialRatings.$inferSelect;
export type InsertMaterialRating = typeof materialRatings.$inferInsert;

// ─── Comments for materials ─────────────────────────────────────────────────
export const materialComments = mysqlTable("material_comments", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialComment = typeof materialComments.$inferSelect;
export type InsertMaterialComment = typeof materialComments.$inferInsert;

// ─── Material files (multiple files per material) ────────────────────────────
export const materialFiles = mysqlTable("material_files", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  mimeType: varchar("mimeType", { length: 128 }),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialFile = typeof materialFiles.$inferSelect;
export type InsertMaterialFile = typeof materialFiles.$inferInsert;

// ─── Events (Aulas e Atividades) ───────────────────────────────────────────
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  eventDate: timestamp("eventDate").notNull(),
  format: mysqlEnum("format", ["online", "presencial", "hibrido"]).default("online").notNull(),
  targetAudience: mysqlEnum("targetAudience", ["videntes", "pdv", "ambos"]).default("ambos").notNull(),
  maxSpots: int("maxSpots").default(100).notNull(),
  meetingLink: text("meetingLink"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  pastEventText: text("pastEventText"), // free text for past event report
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Event Registrations ─────────────────────────────────────────────────────
export const eventRegistrations = mysqlTable("event_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  instrument: varchar("instrument", { length: 100 }).notNull(),
  brailleLevel: mysqlEnum("brailleLevel", ["none", "basic", "intermediate", "advanced"]).notNull(),
  isVisuallyImpaired: boolean("isVisuallyImpaired").default(false).notNull(),
  motivation: text("motivation"),
  waitlisted: boolean("waitlisted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_event_user").on(table.eventId, table.userId),
]);

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = typeof eventRegistrations.$inferInsert;

// ─── Forum ─────────────────────────────────────────────────────────────────
export const forumCategories = mysqlTable("forum_categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  namePt: varchar("namePt", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  nameEs: varchar("nameEs", { length: 128 }).notNull(),
  descriptionPt: text("descriptionPt"),
  descriptionEn: text("descriptionEn"),
  descriptionEs: text("descriptionEs"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumCategory = typeof forumCategories.$inferSelect;
export type InsertForumCategory = typeof forumCategories.$inferInsert;

export const forumTopics = mysqlTable("forum_topics", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  language: mysqlEnum("language", ["pt", "en", "es"]).default("pt").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  lastPostAt: timestamp("lastPostAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumTopic = typeof forumTopics.$inferSelect;
export type InsertForumTopic = typeof forumTopics.$inferInsert;

export const forumPosts = mysqlTable("forum_posts", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topicId").notNull(),
  userId: int("userId").notNull(),
  body: text("body").notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = typeof forumPosts.$inferInsert;

export const userDisplayNames = mysqlTable("user_display_names", {
  userId: int("userId").primaryKey(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserDisplayName = typeof userDisplayNames.$inferSelect;
export type InsertUserDisplayName = typeof userDisplayNames.$inferInsert;

// ─── Forum Topic Views ────────────────────────────────────────────────────────
export const forumTopicViews = mysqlTable("forum_topic_views", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topicId").notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("unique_topic_view").on(table.topicId),
]);

export type ForumTopicView = typeof forumTopicViews.$inferSelect;
export type InsertForumTopicView = typeof forumTopicViews.$inferInsert;

// ─── Forum Reactions ────────────────────────────────────────────────────────
export const forumReactions = mysqlTable("forum_reactions", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  emoji: mysqlEnum("emoji", ["thumbsup", "heart", "bulb", "music", "hands", "question"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_post_user_emoji").on(table.postId, table.userId, table.emoji),
]);

export type ForumReaction = typeof forumReactions.$inferSelect;
export type InsertForumReaction = typeof forumReactions.$inferInsert;

// ─── Download logs ──────────────────────────────────────────────────────────
export const downloadLogs = mysqlTable("download_logs", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DownloadLog = typeof downloadLogs.$inferSelect;
export type InsertDownloadLog = typeof downloadLogs.$inferInsert;

// ─── Braille Editor Projects ────────────────────────────────────────────────
export const brailleProjects = mysqlTable("braille_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  contentBraille: longtext("contentBraille"), // Braille content (celas Unicode)
  contentText: longtext("contentText"), // Text content (tinta)
  contentMusicXml: longtext("contentMusicXml"), // MusicXML representation
  language: mysqlEnum("language", ["pt", "en", "es"]).default("pt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrailleProject = typeof brailleProjects.$inferSelect;
export type InsertBrailleProject = typeof brailleProjects.$inferInsert;

// ─── Email Campaigns (Scheduled) ────────────────────────────────────────────
export const emailCampaigns = mysqlTable("email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: longtext("htmlContent").notNull(),
  replyTo: varchar("replyTo", { length: 320 }),
  recipients: longtext("recipients").notNull(), // JSON array of emails
  intervalMinutes: int("intervalMinutes").default(2).notNull(), // interval between emails
  status: mysqlEnum("status", ["draft", "scheduled", "running", "completed", "cancelled"]).default("draft").notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }), // Heartbeat task UID
  totalRecipients: int("totalRecipients").default(0).notNull(),
  sentCount: int("sentCount").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_created_by").on(table.createdBy),
  index("idx_status").on(table.status),
  index("idx_schedule_cron_task_uid").on(table.scheduleCronTaskUid),
]);

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

// ─── Email Campaign Logs (Track each email sent) ─────────────────────────────
export const emailCampaignLogs = mysqlTable("email_campaign_logs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_campaign_id").on(table.campaignId),
  index("idx_recipient").on(table.recipient),
  index("idx_status").on(table.status),
]);

export type EmailCampaignLog = typeof emailCampaignLogs.$inferSelect;
export type InsertEmailCampaignLog = typeof emailCampaignLogs.$inferInsert;

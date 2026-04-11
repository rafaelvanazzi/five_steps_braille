import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Test User", email: "test@example.com", role: "user", loginMethod: "google", createdAt: new Date(), lastSignedIn: new Date() },
    { id: 2, name: "Admin User", email: "admin@example.com", role: "admin", loginMethod: "google", createdAt: new Date(), lastSignedIn: new Date() },
  ]),
  getTotalUsers: vi.fn().mockResolvedValue(2),
  getTotalMaterials: vi.fn().mockResolvedValue(5),
  getTotalDownloads: vi.fn().mockResolvedValue(10),
  getTotalMessages: vi.fn().mockResolvedValue(3),
  getMaterialsWithUploader: vi.fn().mockResolvedValue([
    { id: 1, title: "Material 1", grade: 1, stage: 1, fileName: "test.pdf", uploaderName: "Admin", uploaderEmail: "admin@example.com", createdAt: new Date() },
  ]),
  getDownloadCountByMaterial: vi.fn().mockResolvedValue([
    { materialId: 1, downloadCount: 5 },
  ]),
  getRecentComments: vi.fn().mockResolvedValue([
    { id: 1, materialId: 1, content: "Great material!", createdAt: new Date(), userName: "Test User", userEmail: "test@example.com", materialTitle: "Material 1" },
  ]),
  getRecentDownloads: vi.fn().mockResolvedValue([
    { id: 1, createdAt: new Date(), userName: "Test User", userEmail: "test@example.com", materialTitle: "Material 1", materialGrade: 1 },
  ]),
  getAllRatingsWithDetails: vi.fn().mockResolvedValue([
    { materialId: 1, avgRating: 4.5, ratingCount: 2, materialTitle: "Material 1", materialGrade: 1 },
  ]),
  upsertRating: vi.fn().mockResolvedValue(undefined),
  getRatingsForMaterial: vi.fn().mockResolvedValue({ average: 4.5, count: 2, ratings: [{ userId: 1, rating: 5 }, { userId: 2, rating: 4 }] }),
  getUserRating: vi.fn().mockResolvedValue({ id: 1, materialId: 1, userId: 1, rating: 5 }),
  insertComment: vi.fn().mockResolvedValue(undefined),
  getCommentsForMaterial: vi.fn().mockResolvedValue([
    { id: 1, materialId: 1, userId: 1, content: "Nice!", createdAt: new Date(), userName: "Test User" },
  ]),
  deleteComment: vi.fn().mockResolvedValue(undefined),
  getCommentById: vi.fn().mockResolvedValue({ id: 1, materialId: 1, userId: 1, content: "Nice!" }),
  insertDownloadLog: vi.fn().mockResolvedValue(undefined),
  getMaterials: vi.fn().mockResolvedValue([]),
  getMaterialById: vi.fn().mockResolvedValue({ id: 1, title: "Material 1", fileUrl: "https://example.com/file.pdf", fileName: "file.pdf" }),
  insertMaterial: vi.fn().mockResolvedValue(undefined),
  deleteMaterial: vi.fn().mockResolvedValue(undefined),
  insertContactMessage: vi.fn().mockResolvedValue(undefined),
  getContactMessages: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

describe("Admin Dashboard Queries", () => {
  it("should return dashboard stats", async () => {
    const [users, materials, downloads, messages] = await Promise.all([
      db.getTotalUsers(),
      db.getTotalMaterials(),
      db.getTotalDownloads(),
      db.getTotalMessages(),
    ]);
    expect(users).toBe(2);
    expect(materials).toBe(5);
    expect(downloads).toBe(10);
    expect(messages).toBe(3);
  });

  it("should return all users with details", async () => {
    const users = await db.getAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0]).toHaveProperty("email");
    expect(users[0]).toHaveProperty("name");
    expect(users[0]).toHaveProperty("role");
    expect(users[0]).toHaveProperty("createdAt");
    expect(users[0]).toHaveProperty("lastSignedIn");
  });

  it("should return materials with uploader info", async () => {
    const materials = await db.getMaterialsWithUploader();
    expect(materials).toHaveLength(1);
    expect(materials[0]).toHaveProperty("uploaderName");
    expect(materials[0]).toHaveProperty("uploaderEmail");
  });

  it("should return download ranking", async () => {
    const ranking = await db.getDownloadCountByMaterial();
    expect(ranking).toHaveLength(1);
    expect(ranking[0]).toHaveProperty("materialId");
    expect(ranking[0]).toHaveProperty("downloadCount");
    expect(ranking[0].downloadCount).toBe(5);
  });

  it("should return recent comments with user and material info", async () => {
    const comments = await db.getRecentComments(20);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toHaveProperty("userName");
    expect(comments[0]).toHaveProperty("materialTitle");
    expect(comments[0]).toHaveProperty("content");
  });

  it("should return recent downloads with user and material info", async () => {
    const downloads = await db.getRecentDownloads(20);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toHaveProperty("userName");
    expect(downloads[0]).toHaveProperty("materialTitle");
  });

  it("should return ratings overview", async () => {
    const ratings = await db.getAllRatingsWithDetails();
    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toHaveProperty("avgRating");
    expect(ratings[0]).toHaveProperty("ratingCount");
    expect(ratings[0]).toHaveProperty("materialTitle");
  });
});

describe("Rating System", () => {
  it("should upsert a rating", async () => {
    await db.upsertRating({ materialId: 1, userId: 1, rating: 5 });
    expect(db.upsertRating).toHaveBeenCalledWith({ materialId: 1, userId: 1, rating: 5 });
  });

  it("should get ratings for a material", async () => {
    const result = await db.getRatingsForMaterial(1);
    expect(result.average).toBe(4.5);
    expect(result.count).toBe(2);
    expect(result.ratings).toHaveLength(2);
  });

  it("should get user rating for a material", async () => {
    const result = await db.getUserRating(1, 1);
    expect(result).toBeTruthy();
    expect(result!.rating).toBe(5);
  });
});

describe("Comment System", () => {
  it("should insert a comment", async () => {
    await db.insertComment({ materialId: 1, userId: 1, content: "Nice!" });
    expect(db.insertComment).toHaveBeenCalledWith({ materialId: 1, userId: 1, content: "Nice!" });
  });

  it("should get comments for a material with user names", async () => {
    const comments = await db.getCommentsForMaterial(1);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toHaveProperty("userName");
    expect(comments[0].content).toBe("Nice!");
  });

  it("should delete a comment", async () => {
    await db.deleteComment(1);
    expect(db.deleteComment).toHaveBeenCalledWith(1);
  });

  it("should get a comment by id", async () => {
    const comment = await db.getCommentById(1);
    expect(comment).toBeTruthy();
    expect(comment!.userId).toBe(1);
  });
});

describe("Download Logging", () => {
  it("should insert a download log", async () => {
    await db.insertDownloadLog({ materialId: 1, userId: 1 });
    expect(db.insertDownloadLog).toHaveBeenCalledWith({ materialId: 1, userId: 1 });
  });
});

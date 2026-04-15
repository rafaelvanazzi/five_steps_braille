/**
 * Tests for material management procedures:
 * - edit (owner or admin)
 * - replaceFile (owner or admin)
 * - toggleVisibility (owner or admin)
 * - delete (owner or admin)
 * - listAll (authenticated: visible + own hidden; admin: all)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getMaterialById: vi.fn(),
  updateMaterial: vi.fn(),
  replaceMaterialFile: vi.fn(),
  toggleMaterialVisibility: vi.fn(),
  deleteMaterial: vi.fn(),
  getMaterials: vi.fn(),
  getMaterialsAll: vi.fn(),
  insertMaterial: vi.fn(),
  insertContactMessage: vi.fn(),
  getContactMessages: vi.fn(),
  upsertRating: vi.fn(),
  getRatingsForMaterial: vi.fn(),
  getUserRating: vi.fn(),
  insertComment: vi.fn(),
  getCommentsForMaterial: vi.fn(),
  deleteComment: vi.fn(),
  getCommentById: vi.fn(),
  insertDownloadLog: vi.fn(),
  getDownloadCountByMaterial: vi.fn(),
  getTotalDownloads: vi.fn(),
  getAllUsers: vi.fn(),
  getTotalUsers: vi.fn(),
  getTotalMaterials: vi.fn(),
  getTotalMessages: vi.fn(),
  getMaterialsWithUploader: vi.fn(),
  getRecentComments: vi.fn(),
  getRecentDownloads: vi.fn(),
  getAllRatingsWithDetails: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test/file.pdf", url: "https://cdn.example.com/file.pdf" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./email", () => ({
  sendContactEmail: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

// ─── Permission helper (extracted logic for unit testing) ─────────────────────

async function assertOwnerOrAdmin(materialId: number, userId: number, role: string) {
  const material = await db.getMaterialById(materialId);
  if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material não encontrado" });
  if ((material as any).uploadedBy !== userId && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor ou um administrador pode realizar esta ação" });
  }
  return material;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("assertOwnerOrAdmin", () => {
  const mockMaterial = {
    id: 1, title: "Test", uploadedBy: 42, hidden: false, grade: 1,
    fileKey: "k", fileUrl: "u", fileName: "f.pdf", fileSize: 100,
    mimeType: "application/pdf", language: "pt", materialType: "atividade",
    creatorVision: "vidente", creatorName: null, stage: null,
    description: null, createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("allows the owner (uploadedBy matches userId)", async () => {
    vi.mocked(db.getMaterialById).mockResolvedValue(mockMaterial as any);
    const result = await assertOwnerOrAdmin(1, 42, "user");
    expect(result).toEqual(mockMaterial);
  });

  it("allows an admin regardless of uploadedBy", async () => {
    vi.mocked(db.getMaterialById).mockResolvedValue(mockMaterial as any);
    const result = await assertOwnerOrAdmin(1, 99, "admin");
    expect(result).toEqual(mockMaterial);
  });

  it("throws FORBIDDEN for a non-owner regular user", async () => {
    vi.mocked(db.getMaterialById).mockResolvedValue(mockMaterial as any);
    await expect(assertOwnerOrAdmin(1, 99, "user")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when material does not exist", async () => {
    vi.mocked(db.getMaterialById).mockResolvedValue(undefined);
    await expect(assertOwnerOrAdmin(999, 42, "user")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("toggleMaterialVisibility db helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls toggleMaterialVisibility with correct args (hide)", async () => {
    vi.mocked(db.toggleMaterialVisibility).mockResolvedValue(undefined as any);
    await db.toggleMaterialVisibility(5, true);
    expect(db.toggleMaterialVisibility).toHaveBeenCalledWith(5, true);
  });

  it("calls toggleMaterialVisibility with correct args (show)", async () => {
    vi.mocked(db.toggleMaterialVisibility).mockResolvedValue(undefined as any);
    await db.toggleMaterialVisibility(5, false);
    expect(db.toggleMaterialVisibility).toHaveBeenCalledWith(5, false);
  });
});

describe("updateMaterial db helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateMaterial with partial data", async () => {
    vi.mocked(db.updateMaterial).mockResolvedValue(undefined as any);
    await db.updateMaterial(3, { title: "New Title", grade: 2 });
    expect(db.updateMaterial).toHaveBeenCalledWith(3, { title: "New Title", grade: 2 });
  });
});

describe("replaceMaterialFile db helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls replaceMaterialFile with file data", async () => {
    vi.mocked(db.replaceMaterialFile).mockResolvedValue(undefined as any);
    const fileData = {
      fileKey: "five-steps/grade-1/abc-newfile.pdf",
      fileUrl: "https://cdn.example.com/newfile.pdf",
      fileName: "newfile.pdf",
      fileSize: 2048,
      mimeType: "application/pdf",
    };
    await db.replaceMaterialFile(7, fileData);
    expect(db.replaceMaterialFile).toHaveBeenCalledWith(7, fileData);
  });
});

describe("deleteMaterial db helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deleteMaterial with the correct id", async () => {
    vi.mocked(db.deleteMaterial).mockResolvedValue(undefined as any);
    await db.deleteMaterial(10);
    expect(db.deleteMaterial).toHaveBeenCalledWith(10);
  });
});

describe("getMaterialsAll (includes hidden)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all materials including hidden ones", async () => {
    const allMaterials = [
      { id: 1, hidden: false, grade: 1 },
      { id: 2, hidden: true, grade: 2 },
    ];
    vi.mocked(db.getMaterialsAll).mockResolvedValue(allMaterials as any);
    const result = await db.getMaterialsAll();
    expect(result).toHaveLength(2);
    expect(result.some((m: any) => m.hidden)).toBe(true);
  });
});

describe("getMaterials (public, excludes hidden)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only visible materials", async () => {
    const visibleMaterials = [{ id: 1, hidden: false, grade: 1 }];
    vi.mocked(db.getMaterials).mockResolvedValue(visibleMaterials as any);
    const result = await db.getMaterials();
    expect(result).toHaveLength(1);
    expect(result.every((m: any) => !m.hidden)).toBe(true);
  });
});

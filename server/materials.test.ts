import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getMaterials: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Exercícios Grau 1",
      description: "Notas básicas",
      grade: 1,
      stage: 1,
      fileKey: "five-steps/grade-1/test.pdf",
      fileUrl: "https://cdn.example.com/test.pdf",
      fileName: "test.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      language: "pt",
      uploadedBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getMaterialById: vi.fn().mockResolvedValue({
    id: 1,
    title: "Exercícios Grau 1",
    fileUrl: "https://cdn.example.com/test.pdf",
    fileName: "test.pdf",
  }),
  insertMaterial: vi.fn().mockResolvedValue(undefined),
  deleteMaterial: vi.fn().mockResolvedValue(undefined),
  insertContactMessage: vi.fn().mockResolvedValue(undefined),
  getContactMessages: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "João Silva",
      email: "joao@example.com",
      institution: "UNICAMP",
      subject: "Parceria",
      message: "Gostaria de uma parceria.",
      type: "institution",
      status: "new",
      createdAt: new Date(),
    },
  ]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "five-steps/test.pdf", url: "https://cdn.example.com/test.pdf" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-123",
      email: "user@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-456",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("materials.list", () => {
  it("returns materials list publicly without grade filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.materials.list({});
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Exercícios Grau 1");
    expect(result[0]?.grade).toBe(1);
  });

  it("returns materials list with grade filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.materials.list({ grade: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("materials.getDownloadUrl", () => {
  it("allows authenticated user to get download URL", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.materials.getDownloadUrl({ id: 1 });
    expect(result.url).toBe("https://cdn.example.com/test.pdf");
    expect(result.fileName).toBe("test.pdf");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.materials.getDownloadUrl({ id: 1 })).rejects.toThrow();
  });
});

describe("materials.upload", () => {
  it("allows admin to upload material", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materials.upload({
      title: "Novo Material",
      grade: 2,
      language: "pt",
      fileBase64: Buffer.from("test content").toString("base64"),
      fileName: "material.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.materials.upload({
        title: "Novo Material",
        grade: 2,
        language: "pt",
        fileBase64: Buffer.from("test").toString("base64"),
        fileName: "material.pdf",
        mimeType: "application/pdf",
        fileSize: 512,
      })
    ).rejects.toThrow();
  });
});

describe("materials.delete", () => {
  it("allows admin to delete material", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materials.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.materials.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("contact.send", () => {
  it("allows anyone to send a contact message", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contact.send({
      name: "Maria Silva",
      email: "maria@example.com",
      subject: "Informações",
      message: "Gostaria de saber mais sobre o método Five Steps.",
      type: "general",
    });
    expect(result.success).toBe(true);
  });
});

describe("contact.list", () => {
  it("allows admin to list contact messages", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.contact.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("João Silva");
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.contact.list()).rejects.toThrow();
  });
});

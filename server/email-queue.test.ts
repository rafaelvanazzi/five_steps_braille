import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the email module
vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock the email-campaigns module
vi.mock("./email-campaigns", () => ({
  getEmailCampaignById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Campaign",
    subject: "Test Subject",
    htmlContent: "<p>Hello</p>",
    replyTo: "test@example.com",
    intervalMinutes: 2,
    totalRecipients: 3,
    status: "draft",
  }),
  getCampaignLogs: vi.fn().mockResolvedValue([
    { id: 1, campaignId: 1, recipient: "a@test.com", status: "pending" },
    { id: 2, campaignId: 1, recipient: "b@test.com", status: "pending" },
    { id: 3, campaignId: 1, recipient: "c@test.com", status: "pending" },
  ]),
  updateCampaignLogStatus: vi.fn().mockResolvedValue(undefined),
  incrementCampaignSentCount: vi.fn().mockResolvedValue(undefined),
  updateCampaignStatus: vi.fn().mockResolvedValue(undefined),
}));

import {
  startCampaignSending,
  cancelCampaignSending,
  getCampaignQueueStatus,
  getActiveCampaignIds,
} from "./email-queue";
import { sendEmail } from "./email";
import * as emailCampaigns from "./email-campaigns";

describe("email-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start campaign sending and return success", async () => {
    const result = await startCampaignSending(1);
    expect(result.success).toBe(true);
    expect(result.totalEmails).toBeGreaterThanOrEqual(2);
    expect(result.message).toContain("emails");
    cancelCampaignSending(1);
  });

  it("should return error if campaign not found", async () => {
    vi.mocked(emailCampaigns.getEmailCampaignById).mockResolvedValueOnce(undefined);
    const result = await startCampaignSending(999);
    expect(result.success).toBe(false);
    expect(result.message).toContain("não encontrada");
  });

  it("should return error if no pending emails", async () => {
    vi.mocked(emailCampaigns.getCampaignLogs).mockResolvedValueOnce([
      { id: 1, campaignId: 1, recipient: "a@test.com", status: "sent", sentAt: new Date(), errorMessage: null, createdAt: new Date() },
    ]);
    const result = await startCampaignSending(2);
    expect(result.success).toBe(false);
    expect(result.message).toContain("pendente");
  });

  it("should send first email immediately", async () => {
    await startCampaignSending(3);
    // Wait a tick for the async processNextEmail to run
    await new Promise((r) => setTimeout(r, 50));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith({
      to: "a@test.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      replyTo: "test@example.com",
    });
    // Cancel to clean up timer
    cancelCampaignSending(3);
  });

  it("should track active campaigns", async () => {
    await startCampaignSending(4);
    await new Promise((r) => setTimeout(r, 50));
    expect(getActiveCampaignIds()).toContain(4);
    cancelCampaignSending(4);
  });

  it("should cancel a running campaign", async () => {
    await startCampaignSending(5);
    await new Promise((r) => setTimeout(r, 50));
    const cancelled = cancelCampaignSending(5);
    expect(cancelled).toBe(true);
    expect(getActiveCampaignIds()).not.toContain(5);
  });

  it("should return false when cancelling non-existent campaign", () => {
    const result = cancelCampaignSending(999);
    expect(result).toBe(false);
  });

  it("should return null for non-active campaign status", () => {
    const status = getCampaignQueueStatus(999);
    expect(status).toBeNull();
  });

  it("should prevent duplicate campaign starts", async () => {
    await startCampaignSending(6);
    await new Promise((r) => setTimeout(r, 50));
    const result = await startCampaignSending(6);
    expect(result.success).toBe(false);
    expect(result.message).toContain("já está sendo enviada");
    cancelCampaignSending(6);
  });
});

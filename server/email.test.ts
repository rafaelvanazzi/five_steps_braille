import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the resend module before importing email.ts
vi.mock("resend", () => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null });
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
  };
});

import { sendContactEmail } from "./email";
import { Resend } from "resend";

describe("sendContactEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
  });

  it("sends email to both recipients when API key is set", async () => {
    await sendContactEmail({
      name: "Test User",
      email: "test@example.com",
      subject: "Test Subject",
      message: "This is a test message for the contact form.",
      type: "general",
    });

    const ResendMock = vi.mocked(Resend);
    const instance = ResendMock.mock.results[0].value;
    expect(instance.emails.send).toHaveBeenCalledOnce();

    const call = instance.emails.send.mock.calls[0][0];
    expect(call.to).toContain("acervo.musicografia@gmail.com");
    expect(call.to).toContain("rafaelvanazzi@gmail.com");
    expect(call.subject).toBe("[Five Steps] Test Subject");
    expect(call.replyTo).toBe("test@example.com");
  });

  it("skips sending when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    // Should not throw
    await expect(
      sendContactEmail({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "This is a test message.",
        type: "general",
      })
    ).resolves.toBeUndefined();
  });

  it("includes institution in email when provided", async () => {
    await sendContactEmail({
      name: "Test User",
      email: "test@example.com",
      institution: "UNICAMP",
      subject: "Partnership",
      message: "We would like to partner with Five Steps.",
      type: "institution",
    });

    const ResendMock = vi.mocked(Resend);
    const instance = ResendMock.mock.results[0].value;
    const call = instance.emails.send.mock.calls[0][0];
    expect(call.html).toContain("UNICAMP");
    expect(call.html).toContain("Parceria Institucional");
  });
});

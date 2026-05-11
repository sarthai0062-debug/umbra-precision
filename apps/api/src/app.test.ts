import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { issueLoginChallenge } from "./auth";

describe("api", () => {
  it("returns health", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.features).toMatchObject({ network: "devnet" });
  });

  it("rejects session creation when login challenge is not issued", async () => {
    const app = createApp();
    const publicKey = "11111111111111111111111111111111";

    const res = await request(app).post("/auth/session").send({
      publicKey,
      message: "random-message",
      signature: "random-signature-that-is-long-enough",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("challenge");
  });

  it("issues one-time login challenge", async () => {
    const app = createApp();
    const publicKey = "11111111111111111111111111111111";
    const first = issueLoginChallenge(publicKey);
    const second = issueLoginChallenge(publicKey);
    expect(first).not.toBe(second);
  });
});

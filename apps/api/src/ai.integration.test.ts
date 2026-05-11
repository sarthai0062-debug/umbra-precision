import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { issueSession } from "./auth";

describe("ai integration", () => {
  it("plans treasury moves with minimax when configured", async () => {
  const app = createApp();
  const token = issueSession("11111111111111111111111111111111");

  const res = await request(app)
    .post("/ai/plan")
    .set("Authorization", `Bearer ${token}`)
    .send({ prompt: "Shield 1 USDC for payroll privacy" });

  expect(res.status).toBe(200);
  expect(res.body.plan.summary).toBeTruthy();
  expect(Array.isArray(res.body.plan.recommendedOperations)).toBe(true);
  expect(["minimax-m2.7", "heuristic"]).toContain(res.body.source);
  }, 90_000);
});

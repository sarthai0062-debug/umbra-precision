import { describe, expect, it } from "vitest";
import { buildComplianceReport, computePrivacyPosture, createOperationState, isTerminalStatus, transitionOperation } from "./index";

describe("operation state", () => {
  it("creates an operation in created state", () => {
    const op = createOperationState({ id: "1", userPublicKey: "abc", type: "deposit", idempotencyKey: "idem", correlationId: "corr" });
    expect(op.status).toBe("created");
    expect(op.attempts).toBe(0);
  });

  it("transitions operation state", () => {
    const op = createOperationState({ id: "1", userPublicKey: "abc", type: "withdraw", idempotencyKey: "idem", correlationId: "corr" });
    const next = transitionOperation(op, { status: "submitted" });
    expect(next.status).toBe("submitted");
  });

  it("marks terminal states", () => {
    expect(isTerminalStatus("callback_confirmed")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("queued")).toBe(false);
  });

  it("computes privacy posture and compliance report", () => {
    const op = createOperationState({
      id: "1",
      userPublicKey: "abc",
      type: "deposit",
      idempotencyKey: "idem",
      correlationId: "corr",
    });
    const confirmed = transitionOperation(op, { status: "callback_confirmed" });
    const posture = computePrivacyPosture([confirmed]);
    const report = buildComplianceReport([confirmed], "Audit summary");

    expect(posture.shieldedMoves).toBe(1);
    expect(report).toContain("UmbraPrecision compliance packet");
    expect(report).toContain("Audit summary");
  });
});

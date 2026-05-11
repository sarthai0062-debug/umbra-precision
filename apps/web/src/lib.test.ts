import { describe, expect, it } from "vitest";
import { normalizeStatus } from "./lib";

describe("normalizeStatus", () => {
  it("normalizes status values", () => {
    expect(normalizeStatus("Callback Confirmed")).toBe("callback_confirmed");
  });
});

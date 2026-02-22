import { describe, it, expect } from "vitest";
import { validateLimit, validateRadius } from "./validateSearchConstraints";
import { MAX_LIMIT, MAX_RADIUS } from "@webanwendung/shared";

describe("validateLimit", () => {
  it("accepts boundary", () => {
    expect(validateLimit(MAX_LIMIT)).toBeNull();
  });
  it("rejects over max", () => {
    expect(validateLimit(MAX_LIMIT + 1)).toContain(`${MAX_LIMIT}`);
  });
});

describe("validateRadius", () => {
  it("accepts boundary", () => {
    expect(validateRadius(MAX_RADIUS)).toBeNull();
  });
  it("rejects over max", () => {
    expect(validateRadius(MAX_RADIUS + 1)).toContain(`${MAX_RADIUS}`);
  });
});
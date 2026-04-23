import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkRateLimit } from "@/lib/rateLimit";

describe("rate limit", () => {
  it("allows requests until the max is reached", () => {
    const first = checkRateLimit({ windowMs: 1000, max: 2, key: "test-allow" });
    const second = checkRateLimit({ windowMs: 1000, max: 2, key: "test-allow" });
    const third = checkRateLimit({ windowMs: 1000, max: 2, key: "test-allow" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.retryAfter).toBeTypeOf("number");
  });

  it("tracks keys independently", () => {
    const a = checkRateLimit({ windowMs: 1000, max: 1, key: "key-a" });
    const b = checkRateLimit({ windowMs: 1000, max: 1, key: "key-b" });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });
});

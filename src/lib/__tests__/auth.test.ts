// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only so it doesn't throw outside Next.js server context
vi.mock("server-only", () => ({}));

// Cookie store mock
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createSession ────────────────────────────────────────────────────────────

describe("createSession", () => {
  test("sets an httpOnly cookie", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
  });

  test("cookie expires roughly 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("stores a non-empty JWT string in the cookie", async () => {
    await createSession("user-1", "test@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.token.value" });

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    // First create a real session to obtain a valid token
    await createSession("user-42", "alice@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    // Now simulate the cookie being present
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("alice@example.com");
  });

  test("returned session has an expiresAt field", async () => {
    await createSession("user-1", "test@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.expiresAt).toBeDefined();
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

// ─── verifySession ────────────────────────────────────────────────────────────

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/");
    if (token) {
      // NextRequest is immutable; build with a preset cookie header
      return new NextRequest("http://localhost/", {
        headers: { cookie: `auth-token=${token}` },
      });
    }
    return req;
  }

  test("returns null when no cookie is present", async () => {
    const result = await verifySession(makeRequest());
    expect(result).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const result = await verifySession(makeRequest("bad.token.here"));
    expect(result).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    await createSession("user-99", "bob@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    const session = await verifySession(makeRequest(token));
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("bob@example.com");
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import axios, { AxiosError } from "axios";
import { createServer } from "vite";

let server, client, store, authApi;
const storage = new Map();
const originalAdapter = axios.defaults.adapter;
const originalStorage = globalThis.localStorage;
const previousApiUrl = process.env.VITE_API_URL;

before(async () => {
  process.env.VITE_API_URL = "http://localhost:5001/api/v1";
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom", mode: "test", logLevel: "silent" });
  client = (await server.ssrLoadModule("/src/lib/axios.ts")).default;
  store = (await server.ssrLoadModule("/src/features/auth/store.ts")).useAuthStore;
  authApi = (await server.ssrLoadModule("/src/features/auth/services.ts")).authApi;
});

beforeEach(() => store.getState().clearAuth());
after(async () => {
  await server?.close();
  axios.defaults.adapter = originalAdapter;
  globalThis.localStorage = originalStorage;
  if (previousApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = previousApiUrl;
});

function session(overrides = {}) {
  return {
    accessToken: "synthetic-access", refreshToken: "synthetic-refresh", expiresIn: 900,
    user: { accountId: "synthetic-account", accountType: "CUSTOMER", role: "CUSTOMER", customerId: "synthetic-customer", employeeId: null, fullName: "Test User", avatarUrl: null },
    ...overrides,
  };
}

function envelope(value) {
  return { isSuccess: true, code: 200, message: "Success", value, traceId: "synthetic-trace", timestamp: "2026-09-26T00:00:00Z" };
}
function response(config, value, status = 200) {
  return { config, data: envelope(value), status, statusText: "", headers: {} };
}
function fail(config, status = 401) {
  throw new AxiosError("Request rejected", "ERR_BAD_REQUEST", config, undefined, response(config, null, status));
}
function transport(adapter) {
  // Intercept the transport only; service, interceptors, and store remain real.
  client.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("login establishes the complete session and normalizes the principal role", async () => {
  const value = session();
  value.user.role = " customer ";
  transport(async (config) => {
    assert.equal(config.url, "/auth/login");
    assert.deepEqual(JSON.parse(config.data), { email: "user@example.com", password: "synthetic-password" });
    return response(config, value);
  });
  store.getState().setAuth(await authApi.login({ email: "user@example.com", password: "synthetic-password" }));
  const state = store.getState();
  assert.equal(state.accessToken, value.accessToken);
  assert.equal(state.refreshToken, value.refreshToken);
  assert.equal(state.expiresIn, 900);
  assert.deepEqual(state.user, value.user);
  assert.deepEqual(state.principal.roles, ["CUSTOMER"]);
  assert.equal(state.principal.id, value.user.accountId);
  assert.equal(JSON.parse(storage.get("pegaxus-auth")).state.accessToken, value.accessToken);
});

test("accounts/me uses centralized Bearer injection and returns the account value", async () => {
  const value = session();
  store.getState().setAuth(value);
  transport(async (config) => {
    assert.equal(config.url, "/accounts/me");
    assert.equal(config.headers.get("Authorization"), `Bearer ${value.accessToken}`);
    assert.equal(config.baseURL, "http://localhost:5001/api/v1/");
    return response(config, { ...value.user, email: "user@example.com" });
  });
  assert.equal((await authApi.getMe()).accountId, value.user.accountId);
});

test("shared client preserves dev envelope and browser multipart boundaries", async () => {
  transport(async (config) => {
    assert.notEqual(config.headers.get("Content-Type"), "application/json");
    assert.equal(config.data instanceof FormData, true);
    return response(config, { accountId: "synthetic-account" });
  });
  const result = await client.patch("/accounts/me", new FormData());
  assert.equal(result.value.accountId, "synthetic-account");
});

test("concurrent 401s share one refresh and retain rotated tokens and expiry", async () => {
  const old = session();
  const next = session({ accessToken: "synthetic-next-access", refreshToken: "synthetic-next-refresh", expiresIn: 1800 });
  store.getState().setAuth(old);
  let refreshes = 0;
  transport(async (config) => {
    if (config.url.endsWith("/auth/refresh-token")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      assert.deepEqual(JSON.parse(config.data), { refreshToken: old.refreshToken });
      return response(config, next);
    }
    if (config.headers.get("Authorization") === `Bearer ${old.accessToken}`) fail(config);
    assert.equal(config.headers.get("Authorization"), `Bearer ${next.accessToken}`);
    return response(config, []);
  });
  await Promise.all([client.get("/protected-a"), client.get("/protected-b")]);
  assert.equal(refreshes, 1);
  assert.equal(store.getState().refreshToken, next.refreshToken);
  assert.equal(store.getState().expiresIn, next.expiresIn);
  assert.deepEqual(store.getState().user, old.user);
});

test("a retried request can fail only once more and clears the rejected session", async () => {
  store.getState().setAuth(session());
  let refreshes = 0, attempts = 0;
  transport(async (config) => {
    if (config.url.endsWith("/auth/refresh-token")) {
      refreshes++;
      return response(config, session({ accessToken: "synthetic-next-access" }));
    }
    attempts++;
    fail(config);
  });
  await assert.rejects(client.get("/protected"));
  assert.equal(refreshes, 1);
  assert.equal(attempts, 2);
  assert.equal(store.getState().accessToken, null);
});

test("an unauthenticated 401 retains its original status without a refresh request", async () => {
  let requests = 0;
  transport(async (config) => { requests++; fail(config); });
  await assert.rejects(client.get("/protected"), (error) => error.response?.status === 401);
  assert.equal(requests, 1);
});

test("auth 401 and protected 403 are not refreshed", async () => {
  store.getState().setAuth(session());
  let requests = 0;
  transport(async (config) => { requests++; fail(config, config.url.includes("auth") ? 401 : 403); });
  await assert.rejects(authApi.login({ email: "user@example.com", password: "synthetic-password" }));
  await assert.rejects(client.get("/protected"));
  assert.equal(requests, 2);
});

test("refresh failure clears the session and retains the backend error", async () => {
  store.getState().setAuth(session());
  transport(async (config) => fail(config));
  await assert.rejects(client.get("/protected"), (error) => error.response?.status === 401);
  assert.equal(store.getState().accessToken, null);
  assert.equal(store.getState().refreshToken, null);
  assert.equal(store.getState().principal, null);
});

test("logout while refresh is pending does not resurrect an expired session", async () => {
  store.getState().setAuth(session());
  const started = deferred(), release = deferred();
  transport(async (config) => {
    if (config.url.endsWith("/auth/refresh-token")) {
      started.resolve();
      await release.promise;
      return response(config, session({ accessToken: "synthetic-next-access" }));
    }
    if (config._retry) return response(config, []);
    fail(config);
  });
  const request = client.get("/protected");
  const result = request.catch((error) => error);
  await started.promise;
  store.getState().clearAuth();
  release.resolve();
  await result;
  assert.equal(store.getState().accessToken, null);
  assert.equal(store.getState().principal, null);
});

test("logout posts the current refresh token with Bearer authentication", async () => {
  const value = session();
  store.getState().setAuth(value);
  transport(async (config) => {
    assert.equal(config.url, "/auth/logout");
    assert.equal(config.headers.get("Authorization"), `Bearer ${value.accessToken}`);
    assert.deepEqual(JSON.parse(config.data), { refreshToken: value.refreshToken });
    return response(config, null);
  });
  await authApi.logout(value.refreshToken);
});

test("logout is reachable and normal routing does not bypass authentication", () => {
  const router = readFileSync(new URL("../src/app/router.tsx", import.meta.url), "utf8");
  assert.match(router, /path:\s*["']\/logout["']/);
  assert.doesNotMatch(router, /skipAdminAuth/);
  const hooks = readFileSync(new URL("../src/features/auth/hooks/useAuth.ts", import.meta.url), "utf8");
  assert.match(hooks, /onSettled:[\s\S]*clearAuth\(\)[\s\S]*queryClient\.clear\(\)/);
});

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

test("an in-flight request cannot be started twice", async () => {
  const { createRequestAttemptGuard } = await vite.ssrLoadModule(
    "/src/shared/hooks/request-attempt-guard.ts",
  );
  const guard = createRequestAttemptGuard();
  let release;
  const first = guard.run(() => new Promise((resolve) => { release = resolve; }));
  const duplicate = await guard.run(async () => "duplicate");

  assert.deepEqual(duplicate, { started: false });
  release("first");
  assert.deepEqual(await first, { started: true, value: "first" });
});

test("a failed request stays blocked until relevant input changes", async () => {
  const { createRequestAttemptGuard } = await vite.ssrLoadModule(
    "/src/shared/hooks/request-attempt-guard.ts",
  );
  const guard = createRequestAttemptGuard();
  let requests = 0;
  const failing = async () => { requests++; throw new Error("failed"); };

  await assert.rejects(guard.run(failing), /failed/);
  assert.deepEqual(await guard.run(failing), { started: false });
  assert.equal(requests, 1);
  guard.reset();
  await assert.rejects(guard.run(failing), /failed/);
  assert.equal(requests, 2);
});

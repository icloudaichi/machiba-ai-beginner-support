import assert from "node:assert/strict";
import test from "node:test";
import {
  SafeSessionError,
  eventMarker,
  fingerprintEvent,
  formatEventComment,
  isEventKnown,
  makeEvent,
  publicWriteDecision,
  safeStatusPayload,
  safeCommitSha,
  safeText,
} from "./support-session-lib.mjs";

test("safeText accepts a short summary and normalizes spacing", () => {
  assert.equal(safeText("summary", "  画面を   開けました  ", { required: true }), "画面を 開けました");
});

test("safeText rejects sensitive or raw input without echoing it", () => {
  const unsafeValues = [
    "連絡先は person@example.com です",
    "password: example-value",
    "/Users/example/secret/project",
    "C:\\Users\\example\\secret\\project",
    "User: 会話全文です",
    "npm ERR! raw command output",
    "-----BEGIN PRIVATE KEY-----",
    "eyJ1234567890abcdef.abcdefghijklmnop.qrstuvwxyz123456",
    "A234567890123456789012345678901234567890123456789",
    "123e4567-e89b-12d3-a456-426614174000",
    "https://github.com/example/private-repo",
    "example-owner/example-repo",
    "@example-handle",
    "username: example-person",
    "ユーザー名：example-person",
    "email: hidden-value",
    "メール：hidden-value",
    "repo: hidden-repository",
  ];

  for (const value of unsafeValues) {
    assert.throws(
      () => safeText("summary", value, { required: true }),
      (error) => {
        assert.ok(error instanceof SafeSessionError);
        assert.equal(error.code, "unsafe_input");
        assert.equal(error.message.includes(value), false);
        return true;
      },
    );
  }
});

test("event fingerprints deduplicate equivalent structured records", () => {
  const first = {
    type: "success",
    step: "GitHub接続",
    summary: "接続を確認しました",
    next: "Cloudflareを確認します",
  };
  const second = { ...first, id: "different", occurredAt: "later" };
  assert.equal(fingerprintEvent(first), fingerprintEvent(second));

  const event = makeEvent(first);
  const state = { syncedFingerprints: [] };
  const queue = { items: [{ kind: "event", event }] };
  assert.equal(isEventKnown(state, queue, event.fingerprint), true);
});

test("structured comments include an idempotency marker", () => {
  const event = makeEvent({
    type: "failure",
    step: "Cloudflare接続",
    summary: "接続をまだ確認できません",
    next: "ログイン状態を確認します",
    commit: "a".repeat(40),
    now: new Date("2026-08-22T00:00:00.000Z"),
  });
  const body = formatEventComment(event);
  assert.ok(body.includes(eventMarker(event)));
  assert.ok(body.includes("## 失敗"));
  assert.ok(body.includes("次にする一つ"));
  assert.ok(body.includes(`関連コミット：${"a".repeat(40)}`));
});

test("commit references require a full SHA and never echo rejected input", () => {
  assert.equal(safeCommitSha("A".repeat(40)), "a".repeat(40));
  const rejected = "short-secret-value";
  assert.throws(
    () => safeCommitSha(rejected),
    (error) => {
      assert.equal(error.code, "invalid_commit");
      assert.equal(error.message.includes(rejected), false);
      return true;
    },
  );
});

test("public repositories require an explicit write opt-in", () => {
  assert.deepEqual(publicWriteDecision({ visibility: "PUBLIC", allowPublic: false }), {
    allowed: false,
    status: "blocked-public",
  });
  assert.equal(publicWriteDecision({ visibility: "PUBLIC", allowPublic: true }).allowed, true);
  assert.equal(publicWriteDecision({ visibility: "PRIVATE", allowPublic: false }).allowed, true);
});

test("safe status output contains no repository or account identity fields", () => {
  const payload = safeStatusPayload({
    command: "status",
    state: { phase: "active", issueVerified: true, issueNumber: 42 },
    queue: { items: [] },
    github: "synced",
  });
  assert.deepEqual(Object.keys(payload), [
    "ok",
    "command",
    "session",
    "github",
    "issueLinked",
    "issueNumber",
    "pending",
    "duplicate",
  ]);
  assert.equal(payload.issueNumber, 42);
  assert.equal(JSON.stringify(payload).includes("owner"), false);
  assert.equal(JSON.stringify(payload).includes("repository"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  DRIVE_SUBMISSION_FOLDER_ID,
  DRIVE_SUBMISSION_FOLDER_LABEL,
  SafeSessionError,
  eventMarker,
  fingerprintEvent,
  formatEventComment,
  formatIssueBody,
  formatIssueTitle,
  isEventKnown,
  makeEvent,
  makeParticipantKey,
  makeSession,
  publicWriteDecision,
  safeStatusPayload,
  safeCommitSha,
  safeDriveFileUrl,
  safeDisplayName,
  safeFilename,
  safeText,
  safeUploadRoute,
  verifyDriveSubmissionFolder,
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

test("confirmed display names are limited to safe 40-character labels", () => {
  assert.equal(safeDisplayName("だいち"), "だいち");
  assert.equal(safeDisplayName("あ".repeat(40)), "あ".repeat(40));
  for (const rejected of ["あ".repeat(41), "person@example.com", "@hidden-handle"]) {
    assert.throws(
      () => safeDisplayName(rejected),
      (error) => {
        assert.equal(error.code, "invalid_display_name");
        assert.equal(error.message.includes(rejected), false);
        return true;
      },
    );
  }
});

test("private participant sessions put the confirmed display name in the title and body", () => {
  const displayName = "だいち";
  const session = makeSession({
    goal: "アプリの相談を続ける",
    repositorySlug: "example/private-support",
    repositoryId: "R_example",
    displayName,
    participantKey: makeParticipantKey(displayName),
    now: new Date("2026-08-22T00:00:00.000Z"),
  });
  assert.equal(formatIssueTitle(session), "AI相談｜だいち｜2026-08-22");
  const body = formatIssueBody(session);
  assert.ok(body.includes("参加者の表示名：だいち"));
  assert.ok(body.includes(makeParticipantKey(displayName)));
});

test("consultation comments retain reusable structured summaries instead of a transcript", () => {
  const event = makeEvent({
    type: "consultation",
    step: "AI相談",
    summary: "Cloudflareの設定方法を知りたい",
    consultation: "Cloudflareの設定方法を知りたい",
    background: "初回のアプリ公開を進めている",
    tried: "設定画面を開いて接続状態を確認した",
    failure: "保存先の選択が不足して先へ進めなかった",
    solution: "保存先を先に作成してから設定をやり直した",
    learning: "接続先を準備してから設定すると進めやすい",
    next: "公開前の確認を一つずつ進める",
    participantKey: "b".repeat(64),
  });
  const body = formatEventComment(event);
  for (const label of ["相談内容", "背景", "試したこと", "起きたこと・失敗", "解決方法", "学び", "次の一手"]) {
    assert.ok(body.includes(`- ${label}：`));
  }
  assert.equal(body.includes("User:"), false);
  assert.ok(body.includes(`machiba-support-participant:${"b".repeat(64)}`));
});

test("Drive artifact URLs allow individual files and reject folders or auth parameters", () => {
  const driveFile = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing";
  const docsFile = "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit";
  const driveUserFile = "https://drive.google.com/file/u/0/d/1AbCdEfGhIjKlMnOp/view";
  const docsUserFile = "https://docs.google.com/spreadsheets/u/0/d/1AbCdEfGhIjKlMnOp/edit";
  assert.equal(safeDriveFileUrl(driveFile), driveFile);
  assert.equal(safeDriveFileUrl(docsFile), docsFile);
  assert.equal(safeDriveFileUrl(driveUserFile), driveUserFile);
  assert.equal(safeDriveFileUrl(docsUserFile), docsUserFile);
  assert.equal(safeDriveFileUrl(undefined), "");

  const rejectedUrls = [
    "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp",
    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?authuser=0",
    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?resourcekey=hidden",
    "http://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view",
    "https://example.com/file/d/1AbCdEfGhIjKlMnOp/view",
  ];
  for (const rejected of rejectedUrls) {
    assert.throws(
      () => safeDriveFileUrl(rejected),
      (error) => {
        assert.equal(error.code, "invalid_drive_file_url");
        assert.equal(error.message.includes(rejected), false);
        return true;
      },
    );
  }
});

test("Drive submission verification is bound to the designated folder and never echoes rejected IDs", () => {
  assert.equal(
    verifyDriveSubmissionFolder(DRIVE_SUBMISSION_FOLDER_ID, true),
    DRIVE_SUBMISSION_FOLDER_LABEL,
  );
  for (const rejected of [undefined, "1WrongDestinationFolder1234567890"]) {
    assert.throws(
      () => verifyDriveSubmissionFolder(rejected, true),
      (error) => {
        assert.equal(error.code, "invalid_drive_submission_folder");
        if (rejected) assert.equal(error.message.includes(rejected), false);
        return true;
      },
    );
  }
  assert.throws(
    () => verifyDriveSubmissionFolder(DRIVE_SUBMISSION_FOLDER_ID, false),
    (error) => {
      assert.equal(error.code, "drive_parent_verification_required");
      assert.equal(error.message.includes(DRIVE_SUBMISSION_FOLDER_ID), false);
      return true;
    },
  );
});

test("artifact comments record filename, route, verification, and an explicit URL state", () => {
  assert.equal(safeFilename("講座成果物.zip"), "講座成果物.zip");
  for (const rejected of ["../成果物.zip", ".env", "access-token.txt", "秘密鍵.pem"]) {
    assert.throws(
      () => safeFilename(rejected),
      (error) => {
        assert.equal(error.code, "invalid_filename");
        assert.equal(error.message.includes(rejected), false);
        return true;
      },
    );
  }
  assert.equal(safeUploadRoute("connector"), "connector");
  const event = makeEvent({
    type: "artifact",
    step: "成果物提出",
    summary: "作成した教材一式を提出した",
    next: "講師による確認を待つ",
    filename: "講座成果物.zip",
    driveUrl: "",
    uploadRoute: "connector",
    readBackVerified: true,
    submissionFolder: DRIVE_SUBMISSION_FOLDER_LABEL,
    parentVerified: true,
    participantKey: "a".repeat(64),
  });
  const body = formatEventComment(event);
  assert.ok(body.includes("## Google Drive成果物"));
  assert.ok(body.includes("ファイル名：講座成果物\\.zip"));
  assert.ok(body.includes("未記録（ファイル名とread-back確認のみ）"));
  assert.ok(body.includes("アップロード経路：connector"));
  assert.ok(body.includes(`提出先：${DRIVE_SUBMISSION_FOLDER_LABEL}`));
  assert.ok(body.includes("親フォルダ確認：済"));
  assert.ok(body.includes("Drive read-back確認：済（ファイル名・親フォルダ）"));
  assert.equal(body.includes(DRIVE_SUBMISSION_FOLDER_ID), false);
  assert.ok(body.includes(`machiba-support-participant:${"a".repeat(64)}`));
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

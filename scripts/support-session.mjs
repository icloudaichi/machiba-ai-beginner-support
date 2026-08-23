#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DRIVE_SUBMISSION_FOLDER_ID,
  EXIT_CODES,
  EVENT_TYPES,
  SafeSessionError,
  eventFingerprintMarker,
  eventMarker,
  formatEventComment,
  formatIssueBody,
  formatIssueTitle,
  fingerprintEvent,
  isEventKnown,
  issueMarker,
  makeEvent,
  makeParticipantKey,
  makeSession,
  parseCliArgs,
  parseIssueNumber,
  participantMarker,
  publicWriteDecision,
  safeDriveFileUrl,
  safeDisplayName,
  safeFilename,
  safeStatusPayload,
  safeCommitSha,
  safeText,
  safeUploadRoute,
  unescapeMarkdown,
  validateOptions,
  verifyDriveSubmissionFolder,
} from "./support-session-lib.mjs";

const STATE_DIRECTORY = "machiba-support-session";
const SNAPSHOT_FILE = "session.json";
const STATE_FILE = "state.json";
const QUEUE_FILE = "queue.json";
const LOCK_FILE = "write.lock";
const LOCK_STALE_MS = 5 * 60 * 1000;
const MAX_CAPTURE_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 30 * 1000;

const HELP_PAYLOAD = Object.freeze({
  ok: true,
  command: "help",
  usage: [
    "support-session.mjs start --goal <一文> --display-name <本人確認済み表示名> --confirm-display-name",
    "support-session.mjs resume --issue <番号> [--allow-public]",
    "support-session.mjs status",
    "support-session.mjs event --type <success|failure|blocked|info> --step <一文> --summary <一文> [--next <一文>] [--commit <push済みfull SHA>] [--allow-public]",
    "support-session.mjs consultation --consultation <相談内容> [--background <背景>] [--tried <試したこと>] [--failure <失敗>] [--solution <解決方法>] [--learning <学び>] --next <次の一手> [--commit <push済みfull SHA>]",
    `support-session.mjs artifact --filename <ファイル名> --folder-id ${DRIVE_SUBMISSION_FOLDER_ID} --parent-verified [--drive-url <個別ファイルURL>] --upload-route <browser|connector|api> --read-back-verified --summary <要約> --next <次の一手>`,
    "support-session.mjs history --query <相談語> [--limit <1から10>]",
    "support-session.mjs complete --summary <一文> [--next <一文>] [--commit <push済みfull SHA>] [--allow-public]",
    "support-session.mjs sync [--allow-public]",
  ],
  exitCodes: {
    0: "GitHubのread-back確認済み、または状態表示",
    1: "入力・状態エラー",
    2: "ローカル保存済み、GitHub未確認",
  },
  publicRepository: "公開リポジトリへの一般記録には--allow-publicが必要です。表示名と相談詳細は--allow-publicがあっても記録しません。",
  sessionScope: "1リポジトリにつき進行中のサポートセッションは1件です。公開許可にはIssueの作成・コメント・完了時のcloseを含みます。",
});

class CommandRunner {
  constructor(cwd) {
    this.cwd = cwd;
  }

  async run(command, args) {
    return new Promise((resolvePromise) => {
      let stdout = "";
      let stderr = "";
      let exceeded = false;
      let timedOut = false;
      let settled = false;

      const child = spawn(command, args, {
        cwd: this.cwd,
        env: process.env,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const append = (current, chunk) => {
        if (exceeded) return current;
        const next = current + chunk.toString("utf8");
        if (Buffer.byteLength(next, "utf8") > MAX_CAPTURE_BYTES) {
          exceeded = true;
          child.kill();
          return "";
        }
        return next;
      };

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, COMMAND_TIMEOUT_MS);

      child.stdout.on("data", (chunk) => {
        stdout = append(stdout, chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr = append(stderr, chunk);
      });
      child.on("error", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolvePromise({ ok: false, code: null, stdout: "", stderr: "", exceeded: false });
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolvePromise({
          ok: code === 0 && !exceeded && !timedOut,
          code,
          stdout: exceeded ? "" : stdout,
          stderr: "",
          exceeded,
        });
      });
    });
  }
}

async function getStorage(cwd, runner) {
  const inside = await runner.run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout.trim() !== "true") {
    throw new SafeSessionError("not_git_repository", "Gitリポジトリのフォルダで実行してください。");
  }

  const commonDirResult = await runner.run("git", ["rev-parse", "--git-common-dir"]);
  if (!commonDirResult.ok) {
    throw new SafeSessionError("git_state_unavailable", "ローカルの記録場所を準備できませんでした。");
  }

  const rawCommonDir = commonDirResult.stdout.trim();
  const commonDir = isAbsolute(rawCommonDir) ? resolve(rawCommonDir) : resolve(cwd, rawCommonDir);
  const directory = resolve(commonDir, STATE_DIRECTORY);
  const relativePath = relative(commonDir, directory);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new SafeSessionError("unsafe_state_location", "安全な記録場所を確認できませんでした。");
  }

  await mkdir(directory, { recursive: true });
  return {
    directory,
    snapshotPath: resolve(directory, SNAPSHOT_FILE),
    statePath: resolve(directory, STATE_FILE),
    queuePath: resolve(directory, QUEUE_FILE),
    lockPath: resolve(directory, LOCK_FILE),
  };
}

async function readJson(path, fallback) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw new SafeSessionError("local_state_invalid", "ローカルの記録を安全に読み取れませんでした。");
  }
}

async function atomicWrite(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function acquireLock(lockPath) {
  const tryOpen = async () => open(lockPath, "wx", 0o600);
  try {
    return await tryOpen();
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw new SafeSessionError("lock_unavailable", "ローカル記録を保護できませんでした。");
    }
  }

  try {
    const details = await stat(lockPath);
    if (Date.now() - details.mtimeMs > LOCK_STALE_MS) {
      await unlink(lockPath);
      return await tryOpen();
    }
  } catch {
    // A concurrent process may have released the lock. Retry once below.
    try {
      return await tryOpen();
    } catch {
      // Fall through to the safe error.
    }
  }

  throw new SafeSessionError("session_busy", "別の記録処理が進行中です。少し待ってから再実行してください。");
}

async function releaseLock(handle, lockPath) {
  try {
    await handle?.close();
  } finally {
    try {
      await unlink(lockPath);
    } catch {
      // A missing lock needs no recovery.
    }
  }
}

function emptyQueue() {
  return { schemaVersion: 1, items: [] };
}

function assertStateShape(state, queue) {
  try {
    if (queue?.schemaVersion !== 1 || !Array.isArray(queue.items)) throw new Error("queue");
    if (!state) {
      if (queue.items.length !== 0) throw new Error("orphan-queue");
      return;
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    const timestampIsValid = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
    const hasParticipant = state.displayName !== null || state.participantKey !== null;
    if (
      state.schemaVersion !== 1 ||
      !uuidPattern.test(state.sessionId) ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(state.repositorySlug) ||
      !(state.repositoryId === null || /^[A-Za-z0-9_=-]{3,160}$/u.test(state.repositoryId)) ||
      (hasParticipant &&
        (safeDisplayName(state.displayName) !== state.displayName ||
          !/^[0-9a-f]{64}$/u.test(state.participantKey) ||
          makeParticipantKey(state.displayName) !== state.participantKey)) ||
      (!hasParticipant && !(state.displayName === null && state.participantKey === null)) ||
      !["active", "completing", "completed"].includes(state.phase) ||
      safeText("goal", state.goal, { required: true }) !== state.goal ||
      !timestampIsValid(state.startedAt) ||
      !timestampIsValid(state.updatedAt) ||
      !(state.completedAt === null || timestampIsValid(state.completedAt)) ||
      !(state.issueNumber === null || (Number.isSafeInteger(state.issueNumber) && state.issueNumber > 0)) ||
      typeof state.issueVerified !== "boolean" ||
      (state.issueVerified && (!state.issueNumber || !state.repositoryId)) ||
      typeof state.publicWriteAllowed !== "boolean" ||
      !Array.isArray(state.syncedFingerprints) ||
      state.syncedFingerprints.some((value) => !/^[0-9a-f]{64}$/u.test(value)) ||
      new Set(state.syncedFingerprints).size !== state.syncedFingerprints.length
    ) {
      throw new Error("state");
    }

    for (const item of queue.items) {
      if (item?.kind === "issue") {
        if (item.id !== state.sessionId) throw new Error("issue-item");
        continue;
      }
      if (item?.kind !== "event" || item.id !== item.event?.id || !uuidPattern.test(item.id)) {
        throw new Error("event-item");
      }
      const event = item.event;
      const consultationFields = ["consultation", "background", "tried", "failure", "solution", "learning"];
      const artifactFieldsAreValid =
        (!event.filename || safeFilename(event.filename) === event.filename) &&
        safeDriveFileUrl(event.driveUrl ?? "") === (event.driveUrl ?? "") &&
        (event.uploadRoute ? safeUploadRoute(event.uploadRoute) === event.uploadRoute : true) &&
        (!event.submissionFolder ||
          verifyDriveSubmissionFolder(DRIVE_SUBMISSION_FOLDER_ID, event.parentVerified) ===
            event.submissionFolder);
      if (
        !EVENT_TYPES.includes(event.type) ||
        safeText("step", event.step, { required: true }) !== event.step ||
        safeText("summary", event.summary, { required: true }) !== event.summary ||
        safeText("next", event.next) !== event.next ||
        safeCommitSha(event.commit ?? "") !== (event.commit ?? "") ||
        consultationFields.some(
          (field) => safeText(field, event[field] ?? "") !== (event[field] ?? ""),
        ) ||
        !artifactFieldsAreValid ||
        (event.type === "consultation" &&
          (!event.consultation ||
            !event.next ||
            event.summary !== event.consultation ||
            event.step !== "AI相談" ||
            event.participantKey !== state.participantKey)) ||
        (event.type === "artifact" &&
          (!event.filename ||
            !event.uploadRoute ||
            event.readBackVerified !== true ||
            !event.submissionFolder ||
            event.parentVerified !== true ||
            event.participantKey !== state.participantKey ||
            !event.summary ||
            !event.next ||
            event.step !== "成果物提出")) ||
        (!["artifact", "consultation"].includes(event.type) &&
          (event.filename ||
            event.driveUrl ||
            event.uploadRoute ||
            event.readBackVerified ||
            event.submissionFolder ||
            event.parentVerified ||
            event.participantKey)) ||
        !timestampIsValid(event.occurredAt) ||
        !/^[0-9a-f]{64}$/u.test(event.fingerprint) ||
        fingerprintEvent(event) !== event.fingerprint
      ) {
        throw new Error("event");
      }
    }
  } catch {
    throw new SafeSessionError("local_state_invalid", "ローカルの記録形式を確認できませんでした。");
  }
}

async function persist(storage, state, queue) {
  await atomicWrite(storage.snapshotPath, { schemaVersion: 1, state, queue });
  for (const legacyPath of [storage.statePath, storage.queuePath]) {
    try {
      await unlink(legacyPath);
    } catch {
      // Legacy files may not exist.
    }
  }
}

async function loadSession(storage) {
  const snapshot = await readJson(storage.snapshotPath, null);
  if (snapshot) {
    if (snapshot.schemaVersion !== 1) {
      throw new SafeSessionError("local_state_invalid", "ローカルの記録形式を確認できませんでした。");
    }
    const state = snapshot.state;
    if (state) {
      state.displayName ??= null;
      state.participantKey ??= null;
    }
    return { state, queue: snapshot.queue };
  }
  const state = await readJson(storage.statePath, null);
  if (state) {
    state.displayName ??= null;
    state.participantKey ??= null;
  }
  return {
    state,
    queue: await readJson(storage.queuePath, emptyQueue()),
  };
}

function safeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function parseGitHubRepositorySlug(remoteUrl) {
  const value = remoteUrl.trim();
  const patterns = [
    /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/iu,
    /^git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/iu,
    /^ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/iu,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getCurrentRepositorySlug(runner) {
  const result = await runner.run("git", ["config", "--get", "remote.origin.url"]);
  if (!result.ok) {
    throw new SafeSessionError("repository_identity_unavailable", "originからGitHubリポジトリを確認できませんでした。");
  }
  const slug = parseGitHubRepositorySlug(result.stdout);
  if (!slug) {
    throw new SafeSessionError("repository_identity_unavailable", "originはGitHubリポジトリを指定してください。外部出力は表示しません。");
  }
  return slug;
}

async function getGitHubRepository(runner, repositorySlug) {
  const result = await runner.run("gh", [
    "repo",
    "view",
    "--repo",
    repositorySlug,
    "--json",
    "id,nameWithOwner,visibility",
  ]);
  if (!result.ok) return null;
  try {
    const repository = JSON.parse(result.stdout);
    if (
      typeof repository.id !== "string" ||
      typeof repository.nameWithOwner !== "string" ||
      repository.nameWithOwner.toLowerCase() !== repositorySlug.toLowerCase() ||
      !["PUBLIC", "PRIVATE", "INTERNAL"].includes(repository.visibility)
    ) {
      return null;
    }
    return repository;
  } catch {
    return null;
  }
}

async function getInitialRepositoryBinding(runner) {
  const repositorySlug = await getCurrentRepositorySlug(runner);
  const repository = await getGitHubRepository(runner, repositorySlug);
  return {
    repositorySlug: repository?.nameWithOwner ?? repositorySlug,
    repositoryId: repository?.id ?? null,
    visibility: repository?.visibility ?? null,
  };
}

async function verifyBoundRepository(runner, state) {
  const currentSlug = await getCurrentRepositorySlug(runner);
  if (currentSlug.toLowerCase() !== state.repositorySlug.toLowerCase()) {
    throw new SafeSessionError("repository_mismatch", "開始時と異なるリポジトリでは記録できません。リポジトリを確認してください。");
  }

  const repository = await getGitHubRepository(runner, state.repositorySlug);
  if (!repository) return null;
  if (state.repositoryId && repository.id !== state.repositoryId) {
    throw new SafeSessionError("repository_mismatch", "開始時と異なるGitHubリポジトリでは記録できません。");
  }
  state.repositoryId ??= repository.id;
  state.repositorySlug = repository.nameWithOwner;
  return repository;
}

async function findExistingIssue(runner, state) {
  const result = await runner.run("gh", [
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    "100",
    "--json",
    "number,body",
    "--repo",
    state.repositorySlug,
  ]);
  if (!result.ok) return { ok: false, number: null };
  try {
    const issues = JSON.parse(result.stdout);
    const marker = issueMarker(state.sessionId);
    const found = issues.find((issue) => typeof issue.body === "string" && issue.body.includes(marker));
    return { ok: true, number: found?.number ?? null };
  } catch {
    return { ok: false, number: null };
  }
}

async function verifyIssue(runner, state, issueNumber) {
  const result = await runner.run("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "number,body,state",
    "--repo",
    state.repositorySlug,
  ]);
  if (!result.ok) return false;
  try {
    const issue = JSON.parse(result.stdout);
    return issue.number === issueNumber && issue.body?.includes(issueMarker(state.sessionId));
  } catch {
    return false;
  }
}

async function ensureIssue(runner, state) {
  if (state.issueNumber && (await verifyIssue(runner, state, state.issueNumber))) {
    state.issueVerified = true;
    return true;
  }

  const existing = await findExistingIssue(runner, state);
  if (!existing.ok) return false;
  if (existing.number) {
    state.issueNumber = existing.number;
    state.issueVerified = await verifyIssue(runner, state, existing.number);
    return state.issueVerified;
  }

  const created = await runner.run("gh", [
    "issue",
    "create",
    "--title",
    formatIssueTitle(state),
    "--body",
    formatIssueBody(state),
    "--repo",
    state.repositorySlug,
  ]);
  if (!created.ok) return false;

  try {
    state.issueNumber = parseIssueNumber(created.stdout);
  } catch {
    return false;
  }
  state.issueVerified = await verifyIssue(runner, state, state.issueNumber);
  return state.issueVerified;
}

async function issueHasEvent(runner, state, event) {
  const result = await runner.run("gh", [
    "issue",
    "view",
    String(state.issueNumber),
    "--json",
    "comments",
    "--repo",
    state.repositorySlug,
  ]);
  if (!result.ok) return null;
  try {
    const payload = JSON.parse(result.stdout);
    const exactMarker = eventMarker(event);
    const fingerprintMarker = eventFingerprintMarker(event.fingerprint);
    return payload.comments.some(
      (comment) =>
        typeof comment.body === "string" &&
        (comment.body.includes(exactMarker) || comment.body.includes(fingerprintMarker)),
    );
  } catch {
    return null;
  }
}

async function syncEvent(runner, state, event) {
  const existing = await issueHasEvent(runner, state, event);
  if (existing === null) return false;
  if (existing) return true;

  const created = await runner.run("gh", [
    "issue",
    "comment",
    String(state.issueNumber),
    "--body",
    formatEventComment(event),
    "--repo",
    state.repositorySlug,
  ]);
  if (!created.ok) return false;
  return (await issueHasEvent(runner, state, event)) === true;
}

async function closeIssue(runner, state) {
  const current = await runner.run("gh", [
    "issue",
    "view",
    String(state.issueNumber),
    "--json",
    "state",
    "--repo",
    state.repositorySlug,
  ]);
  if (!current.ok) return false;
  try {
    if (JSON.parse(current.stdout).state === "CLOSED") return true;
  } catch {
    return false;
  }

  const closed = await runner.run("gh", ["issue", "close", String(state.issueNumber), "--repo", state.repositorySlug]);
  if (!closed.ok) return false;
  const readBack = await runner.run("gh", [
    "issue",
    "view",
    String(state.issueNumber),
    "--json",
    "state",
    "--repo",
    state.repositorySlug,
  ]);
  if (!readBack.ok) return false;
  try {
    return JSON.parse(readBack.stdout).state === "CLOSED";
  } catch {
    return false;
  }
}

function parseResumeIssueNumber(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/u.test(value)) {
    throw new SafeSessionError("invalid_issue_number", "Issue番号は正の整数だけを指定してください。入力内容は表示しません。");
  }
  const issueNumber = Number(value);
  if (!Number.isSafeInteger(issueNumber)) {
    throw new SafeSessionError("invalid_issue_number", "Issue番号を安全に確認できません。入力内容は表示しません。");
  }
  return issueNumber;
}

async function readResumeIssue(runner, repositorySlug, issueNumber) {
  const result = await runner.run("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "number,body,state,comments",
    "--repo",
    repositorySlug,
  ]);
  if (!result.ok) {
    throw new SafeSessionError(
      "resume_unavailable",
      "GitHubからセッションを確認できませんでした。接続後にもう一度実行してください。",
      EXIT_CODES.queued,
    );
  }

  try {
    const issue = JSON.parse(result.stdout);
    const sessionMatch = issue.body?.match(
      /<!-- machiba-support-session:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}) -->/iu,
    );
    if (issue.number !== issueNumber || !sessionMatch || !["OPEN", "CLOSED"].includes(issue.state)) {
      throw new Error("invalid");
    }
    const startedMatch = issue.body.match(/^- 開始日時：([^\r\n]+)$/mu);
    const startedAt = startedMatch && !Number.isNaN(Date.parse(startedMatch[1]))
      ? new Date(startedMatch[1]).toISOString()
      : new Date().toISOString();
    const participantMatch = issue.body.match(/<!-- machiba-support-participant:([0-9a-f]{64}) -->/iu);
    const displayNameMatch = issue.body.match(/^- 参加者の表示名：([^\r\n]+)$/mu);
    let displayName = null;
    let participantKey = null;
    if (participantMatch || displayNameMatch) {
      if (!participantMatch || !displayNameMatch) throw new Error("participant");
      displayName = safeDisplayName(unescapeMarkdown(displayNameMatch[1]));
      participantKey = participantMatch[1].toLowerCase();
      if (makeParticipantKey(displayName) !== participantKey) throw new Error("participant");
    }
    const fingerprints = new Set();
    for (const comment of issue.comments ?? []) {
      if (typeof comment.body !== "string") continue;
      for (const match of comment.body.matchAll(
        /<!-- machiba-support-event:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:([0-9a-f]{64}) -->/giu,
      )) {
        fingerprints.add(match[1].toLowerCase());
      }
    }
    return {
      sessionId: sessionMatch[1].toLowerCase(),
      startedAt,
      phase: issue.state === "CLOSED" ? "completed" : "active",
      displayName,
      participantKey,
      syncedFingerprints: [...fingerprints],
    };
  } catch {
    throw new SafeSessionError(
      "invalid_session_issue",
      "指定されたIssueは、このサポートセッションの記録として確認できませんでした。入力内容は表示しません。",
    );
  }
}

function parseHistoryLimit(value) {
  if (value === undefined) return 5;
  if (typeof value !== "string" || !/^(?:[1-9]|10)$/u.test(value)) {
    throw new SafeSessionError("invalid_history_limit", "履歴件数は1から10で指定してください。入力内容は表示しません。");
  }
  return Number(value);
}

function parseConsultationComment(body, issueNumber, expectedParticipantKey) {
  if (typeof body !== "string" || !body.includes("## AI相談記録")) return null;
  const marker = body.match(
    /<!-- machiba-support-event:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:([0-9a-f]{64}) -->/iu,
  );
  if (!marker || !body.includes(participantMarker(expectedParticipantKey))) return null;

  const fieldDefinitions = [
    ["consultation", "相談内容", true],
    ["background", "背景", false],
    ["tried", "試したこと", false],
    ["failure", "起きたこと・失敗", false],
    ["solution", "解決方法", false],
    ["learning", "学び", false],
    ["next", "次の一手", true],
  ];

  try {
    const recordedMatch = body.match(/^- 記録日時：([^\r\n]+)$/mu);
    if (!recordedMatch || Number.isNaN(Date.parse(recordedMatch[1]))) return null;
    const record = {
      issueNumber,
      recordedAt: new Date(recordedMatch[1]).toISOString(),
    };
    for (const [field, label, required] of fieldDefinitions) {
      const match = body.match(new RegExp(`^- ${label}：([^\\r\\n]+)$`, "mu"));
      const value = match ? unescapeMarkdown(match[1]) : "";
      record[field] = safeText(field, value, { required });
    }
    const commitMatch = body.match(/^- 関連コミット：([0-9a-f]{40})$/mu);
    record.commit = safeCommitSha(commitMatch?.[1] ?? "");
    const expectedFingerprint = fingerprintEvent({
      type: "consultation",
      step: "AI相談",
      summary: record.consultation,
      consultation: record.consultation,
      background: record.background,
      tried: record.tried,
      failure: record.failure,
      solution: record.solution,
      learning: record.learning,
      next: record.next,
      commit: record.commit,
      participantKey: expectedParticipantKey,
    });
    if (expectedFingerprint !== marker[1].toLowerCase()) return null;
    return record;
  } catch {
    return null;
  }
}

async function readConsultationHistory(runner, state, query, limit) {
  const listed = await runner.run("gh", [
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    "100",
    "--json",
    "number,body",
    "--repo",
    state.repositorySlug,
  ]);
  if (!listed.ok) {
    throw new SafeSessionError(
      "history_unavailable",
      "GitHubから相談履歴を確認できませんでした。接続後にもう一度実行してください。",
      EXIT_CODES.queued,
    );
  }

  let issues;
  try {
    issues = JSON.parse(listed.stdout).filter(
      (issue) =>
        Number.isSafeInteger(issue.number) &&
        typeof issue.body === "string" &&
        issue.body.includes(participantMarker(state.participantKey)),
    );
  } catch {
    throw new SafeSessionError("history_unavailable", "相談履歴を安全に読み取れませんでした。", EXIT_CODES.queued);
  }

  const records = [];
  for (const issue of issues.slice(0, 30)) {
    const viewed = await runner.run("gh", [
      "issue",
      "view",
      String(issue.number),
      "--json",
      "number,comments",
      "--repo",
      state.repositorySlug,
    ]);
    if (!viewed.ok) continue;
    try {
      const payload = JSON.parse(viewed.stdout);
      if (payload.number !== issue.number || !Array.isArray(payload.comments)) continue;
      for (const comment of payload.comments) {
        const record = parseConsultationComment(comment.body, issue.number, state.participantKey);
        if (record) records.push(record);
      }
    } catch {
      // Skip an Issue that cannot be parsed into the safe schema.
    }
  }

  const needle = query.toLocaleLowerCase("ja-JP");
  return records
    .filter((record) =>
      [
        record.consultation,
        record.background,
        record.tried,
        record.failure,
        record.solution,
        record.learning,
        record.next,
      ]
        .join(" ")
        .toLocaleLowerCase("ja-JP")
        .includes(needle),
    )
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
    .slice(0, limit);
}

async function syncAll({ runner, state, queue, storage }) {
  const repository = await verifyBoundRepository(runner, state);
  if (!repository) {
    await persist(storage, state, queue);
    return "queued";
  }

  if (state.displayName && repository.visibility !== "PRIVATE") {
    await persist(storage, state, queue);
    return "blocked-public-detail";
  }

  const decision = publicWriteDecision({
    visibility: repository.visibility,
    allowPublic: state.publicWriteAllowed,
  });
  if (!decision.allowed) {
    await persist(storage, state, queue);
    return decision.status;
  }

  if (!(await ensureIssue(runner, state))) {
    await persist(storage, state, queue);
    return "queued";
  }

  queue.items = queue.items.filter((item) => item.kind !== "issue");
  await persist(storage, state, queue);

  for (const item of [...queue.items]) {
    if (item.kind !== "event") continue;
    if (state.syncedFingerprints.includes(item.event.fingerprint)) {
      queue.items = queue.items.filter((candidate) => candidate.id !== item.id);
      await persist(storage, state, queue);
      continue;
    }

    if (!(await syncEvent(runner, state, item.event))) {
      await persist(storage, state, queue);
      return "queued";
    }

    state.syncedFingerprints.push(item.event.fingerprint);
    queue.items = queue.items.filter((candidate) => candidate.id !== item.id);
    state.updatedAt = new Date().toISOString();
    await persist(storage, state, queue);
  }

  if (state.phase === "completing" && queue.items.length === 0) {
    if (!(await closeIssue(runner, state))) {
      await persist(storage, state, queue);
      return "queued";
    }
    state.phase = "completed";
    state.completedAt = new Date().toISOString();
    state.updatedAt = state.completedAt;
  }

  await persist(storage, state, queue);
  return "synced";
}

function requireActive(state) {
  if (!state) {
    throw new SafeSessionError("session_not_started", "先にstartコマンドでセッションを開始してください。");
  }
  if (state.phase !== "active") {
    throw new SafeSessionError("session_not_active", "このセッションは進行中ではありません。");
  }
}

function queueEvent(state, queue, event) {
  if (isEventKnown(state, queue, event.fingerprint)) return false;
  queue.items.push({ id: event.id, kind: "event", event });
  state.updatedAt = event.occurredAt;
  return true;
}

async function validatePushedCommit(runner, state, value) {
  const commit = safeCommitSha(value);
  if (!commit) return "";

  const exists = await runner.run("git", ["cat-file", "-e", `${commit}^{commit}`]);
  if (!exists.ok) {
    throw new SafeSessionError("invalid_commit", "現在のリポジトリでコミットを確認できません。入力内容は表示しません。");
  }

  const currentBranch = await runner.run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (!currentBranch.ok || !/^[A-Za-z0-9._/-]+$/u.test(currentBranch.stdout.trim())) {
    throw new SafeSessionError("commit_not_pushed", "push済みであることを確認できません。先にcommitとpushを完了してください。");
  }

  const branch = currentBranch.stdout.trim();
  const remoteResult = await runner.run("git", ["config", "--get", `branch.${branch}.remote`]);
  const mergeResult = await runner.run("git", ["config", "--get", `branch.${branch}.merge`]);
  if (!remoteResult.ok || !mergeResult.ok) {
    throw new SafeSessionError("commit_not_pushed", "push済みであることを確認できません。先にcommitとpushを完了してください。");
  }

  const remoteName = remoteResult.stdout.trim();
  const mergeRef = mergeResult.stdout.trim();
  if (!/^[A-Za-z0-9._-]+$/u.test(remoteName) || !/^refs\/heads\/[A-Za-z0-9._/-]+$/u.test(mergeRef)) {
    throw new SafeSessionError("commit_not_pushed", "push先を安全に確認できません。先にGitHubへのpushを完了してください。");
  }

  const remoteUrl = await runner.run("git", ["config", "--get", `remote.${remoteName}.url`]);
  const remoteSlug = remoteUrl.ok ? parseGitHubRepositorySlug(remoteUrl.stdout) : null;
  if (!remoteSlug || remoteSlug.toLowerCase() !== state.repositorySlug.toLowerCase()) {
    throw new SafeSessionError("commit_remote_mismatch", "このIssueと同じGitHubリポジトリへのpushを確認できません。");
  }

  const liveRemote = await runner.run("git", ["ls-remote", "--exit-code", remoteName, mergeRef]);
  if (!liveRemote.ok) {
    throw new SafeSessionError("commit_not_pushed", "GitHub上のpush結果を確認できません。接続後にもう一度実行してください。");
  }
  const remoteLine = liveRemote.stdout.trim().split(/\r?\n/u).find((line) => line.endsWith(`\t${mergeRef}`));
  const remoteTip = remoteLine?.split(/\s+/u)[0]?.toLowerCase();
  if (!remoteTip || !/^[0-9a-f]{40}$/u.test(remoteTip)) {
    throw new SafeSessionError("commit_not_pushed", "GitHub上のpush結果を確認できません。外部出力は表示しません。");
  }

  const remoteTipExists = await runner.run("git", ["cat-file", "-e", `${remoteTip}^{commit}`]);
  const pushed = await runner.run("git", ["merge-base", "--is-ancestor", commit, remoteTip]);
  if (!remoteTipExists.ok || !pushed.ok) {
    throw new SafeSessionError("commit_not_pushed", "指定したコミットはGitHub上の現在のブランチで確認できません。");
  }
  return commit;
}

async function execute(argv, cwd = process.cwd()) {
  const { command, options } = parseCliArgs(argv);
  const runner = new CommandRunner(cwd);
  const storage = await getStorage(cwd, runner);
  const lockHandle = await acquireLock(storage.lockPath);

  try {
    const loaded = await loadSession(storage);
    let state = loaded.state;
    let queue = loaded.queue;
    assertStateShape(state, queue);

    let verifiedRepository = null;
    if (state && !["start", "resume"].includes(command)) {
      verifiedRepository = await verifyBoundRepository(runner, state);
      await persist(storage, state, queue);
    }

    if (command === "status") {
      validateOptions(options, []);
      let github = "queued";
      let exitCode = EXIT_CODES.queued;
      if (!state) {
        github = "not-started";
        exitCode = EXIT_CODES.ok;
      } else if (verifiedRepository) {
        const decision = state.displayName && verifiedRepository.visibility !== "PRIVATE"
          ? { allowed: false, status: "blocked-public-detail" }
          : publicWriteDecision({
              visibility: verifiedRepository.visibility,
              allowPublic: state.publicWriteAllowed,
            });
        github = !decision.allowed && queue.items.length > 0
          ? decision.status
          : state.issueVerified && queue.items.length === 0
            ? "synced"
            : "queued";
        exitCode = github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued;
      }
      return {
        exitCode,
        payload: safeStatusPayload({
          command,
          state,
          queue,
          github,
        }),
      };
    }

    if (command === "start") {
      validateOptions(options, ["goal", "display-name", "confirm-display-name", "allow-public"]);
      const goal = safeText("goal", options.goal, { required: true });
      const hasDisplayName = options["display-name"] !== undefined;
      if (!hasDisplayName || !options["confirm-display-name"]) {
        throw new SafeSessionError(
          "display_name_confirmation_required",
          "表示名は、本人が入力内容を確認したうえで表示名と確認フラグを一緒に指定してください。入力内容は表示しません。",
        );
      }
      const displayName = safeDisplayName(options["display-name"]);
      const participantKey = makeParticipantKey(displayName);
      if (state && state.phase !== "completed") {
        throw new SafeSessionError("session_already_active", "進行中のセッションがあります。statusで確認してください。");
      }

      const repository = await getInitialRepositoryBinding(runner);
      if (displayName && repository.visibility && repository.visibility !== "PRIVATE") {
        throw new SafeSessionError(
          "private_repository_required",
          "表示名と相談詳細はprivate GitHubリポジトリだけに記録できます。--allow-publicでは許可できません。",
        );
      }
      state = makeSession({
        goal,
        repositorySlug: repository.repositorySlug,
        repositoryId: repository.repositoryId,
        displayName,
        participantKey,
        allowPublic: options["allow-public"],
      });
      queue = emptyQueue();
      queue.items.push({ id: state.sessionId, kind: "issue" });
      await persist(storage, state, queue);
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    if (command === "resume") {
      validateOptions(options, ["issue", "allow-public"]);
      const issueNumber = parseResumeIssueNumber(options.issue);
      if (state && state.phase !== "completed" && state.issueNumber !== issueNumber) {
        throw new SafeSessionError("session_already_active", "別の進行中セッションがあります。statusで確認してください。");
      }

      const repository = await getInitialRepositoryBinding(runner);
      if (!repository.repositoryId) {
        throw new SafeSessionError(
          "resume_unavailable",
          "GitHubリポジトリを確認できないため再開できません。接続後にもう一度実行してください。",
          EXIT_CODES.queued,
        );
      }
      if (
        state &&
        (state.repositorySlug.toLowerCase() !== repository.repositorySlug.toLowerCase() ||
          (state.repositoryId && state.repositoryId !== repository.repositoryId))
      ) {
        throw new SafeSessionError("repository_mismatch", "開始時と異なるGitHubリポジトリでは再開できません。");
      }
      const remote = await readResumeIssue(runner, repository.repositorySlug, issueNumber);
      if (remote.displayName && repository.visibility !== "PRIVATE") {
        throw new SafeSessionError(
          "private_repository_required",
          "表示名を含む相談セッションはprivate GitHubリポジトリでだけ再開できます。",
        );
      }
      if (state?.issueNumber === issueNumber && state.sessionId === remote.sessionId) {
        if (state.displayName !== remote.displayName || state.participantKey !== remote.participantKey) {
          throw new SafeSessionError("participant_mismatch", "参加者の表示名を確認できないため再開を停止しました。");
        }
        state.issueVerified = true;
        state.repositorySlug = repository.repositorySlug;
        state.repositoryId = repository.repositoryId;
        state.publicWriteAllowed = state.publicWriteAllowed || Boolean(options["allow-public"]);
        state.syncedFingerprints = [...new Set([...state.syncedFingerprints, ...remote.syncedFingerprints])];
        if (remote.phase === "completed") {
          state.phase = "completed";
          state.completedAt ??= new Date().toISOString();
        }
        queue.items = queue.items.filter(
          (item) => item.kind !== "issue" && !(item.kind === "event" && state.syncedFingerprints.includes(item.event.fingerprint)),
        );
        state.updatedAt = new Date().toISOString();
      } else {
        state = {
          schemaVersion: 1,
          sessionId: remote.sessionId,
          phase: remote.phase,
          goal: "GitHub Issueから再開",
          startedAt: remote.startedAt,
          updatedAt: new Date().toISOString(),
          completedAt: remote.phase === "completed" ? new Date().toISOString() : null,
          issueNumber,
          issueVerified: true,
          repositorySlug: repository.repositorySlug,
          repositoryId: repository.repositoryId,
          displayName: remote.displayName,
          participantKey: remote.participantKey,
          publicWriteAllowed: Boolean(options["allow-public"]),
          syncedFingerprints: remote.syncedFingerprints,
        };
        queue = emptyQueue();
      }
      await persist(storage, state, queue);
      return {
        exitCode: EXIT_CODES.ok,
        payload: safeStatusPayload({ command, state, queue, github: "synced" }),
      };
    }

    if (command === "sync") {
      validateOptions(options, ["allow-public"]);
      if (!state) {
        throw new SafeSessionError("session_not_started", "同期するセッションがありません。");
      }
      if (options["allow-public"]) state.publicWriteAllowed = true;
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    if (command === "consultation") {
      validateOptions(options, [
        "consultation",
        "background",
        "tried",
        "failure",
        "solution",
        "learning",
        "next",
        "commit",
      ]);
      requireActive(state);
      if (!state.displayName || !state.participantKey) {
        throw new SafeSessionError(
          "confirmed_display_name_required",
          "相談詳細を記録するには、本人が確認した表示名を指定してセッションを開始してください。",
        );
      }
      if (verifiedRepository && verifiedRepository.visibility !== "PRIVATE") {
        throw new SafeSessionError(
          "private_repository_required",
          "相談詳細はprivate GitHubリポジトリだけに記録できます。--allow-publicでは許可できません。",
        );
      }

      const consultation = safeText("consultation", options.consultation, { required: true });
      const event = makeEvent({
        type: "consultation",
        step: "AI相談",
        summary: consultation,
        consultation,
        background: safeText("background", options.background),
        tried: safeText("tried", options.tried),
        failure: safeText("failure", options.failure),
        solution: safeText("solution", options.solution),
        learning: safeText("learning", options.learning),
        next: safeText("next", options.next, { required: true }),
        commit: await validatePushedCommit(runner, state, options.commit),
        participantKey: state.participantKey,
      });
      const queued = queueEvent(state, queue, event);
      await persist(storage, state, queue);
      if (!queued) {
        const github = queue.items.length === 0 && state.issueVerified ? "synced" : "queued";
        return {
          exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
          payload: safeStatusPayload({ command, state, queue, github, duplicate: true }),
        };
      }
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    if (command === "artifact") {
      validateOptions(options, [
        "filename",
        "folder-id",
        "parent-verified",
        "drive-url",
        "upload-route",
        "read-back-verified",
        "summary",
        "next",
      ]);
      requireActive(state);
      if (!state.displayName || !state.participantKey) {
        throw new SafeSessionError(
          "confirmed_display_name_required",
          "成果物を記録するには、本人が確認した表示名のセッションを開始または再開してください。",
        );
      }
      if (!options["read-back-verified"]) {
        throw new SafeSessionError(
          "drive_read_back_required",
          "Google Drive上のファイルを読み戻して確認した後に記録してください。",
        );
      }
      const submissionFolder = verifyDriveSubmissionFolder(
        options["folder-id"],
        options["parent-verified"] === true,
      );
      if (verifiedRepository && verifiedRepository.visibility !== "PRIVATE") {
        throw new SafeSessionError(
          "private_repository_required",
          "表示名と成果物情報はprivate GitHubリポジトリだけに記録できます。--allow-publicでは許可できません。",
        );
      }

      const event = makeEvent({
        type: "artifact",
        step: "成果物提出",
        summary: safeText("summary", options.summary, { required: true }),
        next: safeText("next", options.next, { required: true }),
        filename: safeFilename(options.filename),
        driveUrl: safeDriveFileUrl(options["drive-url"]),
        uploadRoute: safeUploadRoute(options["upload-route"]),
        readBackVerified: true,
        submissionFolder,
        parentVerified: true,
        participantKey: state.participantKey,
      });
      const queued = queueEvent(state, queue, event);
      await persist(storage, state, queue);
      if (!queued) {
        const github = queue.items.length === 0 && state.issueVerified ? "synced" : "queued";
        return {
          exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
          payload: safeStatusPayload({ command, state, queue, github, duplicate: true }),
        };
      }
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    if (command === "history") {
      validateOptions(options, ["query", "limit"]);
      if (!state?.displayName || !state.participantKey) {
        throw new SafeSessionError(
          "confirmed_display_name_required",
          "相談履歴を確認するには、本人が確認した表示名のセッションを開始または再開してください。",
        );
      }
      if (!verifiedRepository) {
        throw new SafeSessionError(
          "history_unavailable",
          "GitHubへ接続できないため相談履歴を確認できません。",
          EXIT_CODES.queued,
        );
      }
      if (verifiedRepository.visibility !== "PRIVATE") {
        throw new SafeSessionError(
          "private_repository_required",
          "表示名を使った相談履歴の確認はprivate GitHubリポジトリだけで行えます。",
        );
      }
      const query = safeText("query", options.query, { required: true });
      const history = await readConsultationHistory(runner, state, query, parseHistoryLimit(options.limit));
      return {
        exitCode: EXIT_CODES.ok,
        payload: {
          ...safeStatusPayload({ command, state, queue, github: "read" }),
          history,
        },
      };
    }

    if (command === "event") {
      validateOptions(options, ["type", "step", "summary", "next", "commit", "allow-public"]);
      requireActive(state);
      if (!options.type || !["success", "failure", "blocked", "info"].includes(options.type)) {
        throw new SafeSessionError("invalid_event_type", "typeはsuccess、failure、blocked、infoから選んでください。");
      }
      if (options["allow-public"]) state.publicWriteAllowed = true;
      const event = makeEvent({
        type: options.type,
        step: safeText("step", options.step, { required: true }),
        summary: safeText("summary", options.summary, { required: true }),
        next: safeText("next", options.next),
        commit: await validatePushedCommit(runner, state, options.commit),
      });
      const queued = queueEvent(state, queue, event);
      await persist(storage, state, queue);
      if (!queued) {
        const github = queue.items.length === 0 && state.issueVerified ? "synced" : "queued";
        return {
          exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
          payload: safeStatusPayload({ command, state, queue, github, duplicate: true }),
        };
      }
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    if (command === "complete") {
      validateOptions(options, ["summary", "next", "commit", "allow-public"]);
      requireActive(state);
      if (options["allow-public"]) state.publicWriteAllowed = true;
      const event = makeEvent({
        type: "completed",
        step: "セッション終了",
        summary: safeText("summary", options.summary, { required: true }),
        next: safeText("next", options.next),
        commit: await validatePushedCommit(runner, state, options.commit),
      });
      queueEvent(state, queue, event);
      state.phase = "completing";
      await persist(storage, state, queue);
      const github = await syncAll({ runner, state, queue, storage });
      return {
        exitCode: github === "synced" ? EXIT_CODES.ok : EXIT_CODES.queued,
        payload: safeStatusPayload({ command, state, queue, github }),
      };
    }

    throw new SafeSessionError(
      "unknown_command",
      "start、resume、status、event、consultation、artifact、history、complete、syncのいずれかを指定してください。",
    );
  } finally {
    await releaseLock(lockHandle, storage.lockPath);
  }
}

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  try {
    if (
      (argv.length === 1 && (argv[0] === "--help" || argv[0] === "help")) ||
      (argv.length === 2 &&
        argv[1] === "--help" &&
        ["start", "resume", "status", "event", "consultation", "artifact", "history", "complete", "sync"].includes(
          argv[0],
        ))
    ) {
      safeJson(HELP_PAYLOAD);
      return EXIT_CODES.ok;
    }
    const result = await execute(argv, cwd);
    safeJson(result.payload);
    return result.exitCode;
  } catch (error) {
    const safeError =
      error instanceof SafeSessionError
        ? error
        : new SafeSessionError("internal_error", "安全のため処理を停止しました。入力内容や外部出力は表示しません。");
    safeJson({ ok: false, code: safeError.code, message: safeError.message });
    return safeError.exitCode;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  process.exitCode = await main();
}

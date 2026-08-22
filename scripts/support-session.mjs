#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
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
  makeSession,
  parseCliArgs,
  parseIssueNumber,
  publicWriteDecision,
  safeStatusPayload,
  safeCommitSha,
  safeText,
  validateOptions,
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
    "support-session.mjs start --goal <一文> [--allow-public]",
    "support-session.mjs resume --issue <番号> [--allow-public]",
    "support-session.mjs status",
    "support-session.mjs event --type <success|failure|blocked|info> --step <一文> --summary <一文> [--next <一文>] [--commit <push済みfull SHA>] [--allow-public]",
    "support-session.mjs complete --summary <一文> [--next <一文>] [--commit <push済みfull SHA>] [--allow-public]",
    "support-session.mjs sync [--allow-public]",
  ],
  exitCodes: {
    0: "GitHubのread-back確認済み、または状態表示",
    1: "入力・状態エラー",
    2: "ローカル保存済み、GitHub未確認",
  },
  publicRepository: "公開リポジトリへの初回書き込みには--allow-publicが必要です。許可は現在のセッションだけに保存されます。",
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
    if (
      state.schemaVersion !== 1 ||
      !uuidPattern.test(state.sessionId) ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(state.repositorySlug) ||
      !(state.repositoryId === null || /^[A-Za-z0-9_=-]{3,160}$/u.test(state.repositoryId)) ||
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
      if (
        !EVENT_TYPES.includes(event.type) ||
        safeText("step", event.step, { required: true }) !== event.step ||
        safeText("summary", event.summary, { required: true }) !== event.summary ||
        safeText("next", event.next) !== event.next ||
        safeCommitSha(event.commit) !== event.commit ||
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
    return { state: snapshot.state, queue: snapshot.queue };
  }
  return {
    state: await readJson(storage.statePath, null),
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
    formatIssueTitle(state.startedAt),
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
      syncedFingerprints: [...fingerprints],
    };
  } catch {
    throw new SafeSessionError(
      "invalid_session_issue",
      "指定されたIssueは、このサポートセッションの記録として確認できませんでした。入力内容は表示しません。",
    );
  }
}

async function syncAll({ runner, state, queue, storage }) {
  const repository = await verifyBoundRepository(runner, state);
  if (!repository) {
    await persist(storage, state, queue);
    return "queued";
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
        const decision = publicWriteDecision({
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
      validateOptions(options, ["goal", "allow-public"]);
      const goal = safeText("goal", options.goal, { required: true });
      if (state && state.phase !== "completed") {
        throw new SafeSessionError("session_already_active", "進行中のセッションがあります。statusで確認してください。");
      }

      const repository = await getInitialRepositoryBinding(runner);
      state = makeSession({
        goal,
        repositorySlug: repository.repositorySlug,
        repositoryId: repository.repositoryId,
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
      if (state?.issueNumber === issueNumber && state.sessionId === remote.sessionId) {
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

    throw new SafeSessionError("unknown_command", "start、status、event、complete、syncのいずれかを指定してください。");
  } finally {
    await releaseLock(lockHandle, storage.lockPath);
  }
}

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  try {
    if (
      (argv.length === 1 && (argv[0] === "--help" || argv[0] === "help")) ||
      (argv.length === 2 && argv[1] === "--help" && ["start", "resume", "status", "event", "complete", "sync"].includes(argv[0]))
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

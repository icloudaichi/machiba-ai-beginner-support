import { createHash, randomUUID } from "node:crypto";

export const EVENT_TYPES = Object.freeze([
  "success",
  "failure",
  "blocked",
  "info",
  "completed",
]);

export const EXIT_CODES = Object.freeze({
  ok: 0,
  error: 1,
  queued: 2,
});

const EVENT_LABELS = Object.freeze({
  success: "成功",
  failure: "失敗",
  blocked: "停止中",
  info: "情報",
  completed: "完了",
});

const FIELD_LIMITS = Object.freeze({
  goal: 240,
  step: 100,
  summary: 360,
  next: 240,
});

const UNSAFE_PATTERNS = [
  /[\r\n\u2028\u2029]/u,
  /\b(?:https?|ssh|git):\/\/\S+/iu,
  /\bwww\.[^\s]+/iu,
  /[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/iu,
  /(?:^|\s)@[A-Za-z0-9_-]{1,39}\b/u,
  /\b[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}\b/u,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/iu,
  /\b(?:github_pat_|gh[pousr]_|sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._~+/-]+=*)/iu,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/u,
  /\b[A-Za-z0-9_-]{40,}\b/u,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu,
  /\b(?:password|passwd|passphrase|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?key|account[ _-]?id)\b\s*[:=]/iu,
  /\b(?:username|user[ _-]?name|email|e-mail|repo|repository|owner)\b\s*[:=]/iu,
  /(?:パスワード|認証コード|秘密鍵|APIキー|アクセストークン|アカウントID)\s*[:：=]/u,
  /(?:ユーザー名|メール(?:アドレス)?|リポジトリ(?:名)?|所有者)\s*[:：=]/u,
  /\b[a-f0-9]{32}\b/iu,
  /(?:^|[\s"'`])\/(?:Users|home)\/[^/\s]+(?:\/[^\s]*)?/u,
  /\b[A-Za-z]:\\Users\\[^\\\s]+(?:\\[^\s]*)?/u,
  /(?:^|\s)(?:User|Assistant|System)\s*:/iu,
  /(?:^|\s)(?:ユーザー|アシスタント|システム)\s*[:：]/u,
  /(?:^|\s)(?:npm ERR!|Traceback \(most recent call last\)|Exception in thread|at .+?:\d+:\d+)/u,
  /(?:logged in to|standard output|standard error|stdout|stderr|exit code)\b/iu,
  /(?:^|\s)[$>#]\s+\S/u,
];

export class SafeSessionError extends Error {
  constructor(code, safeMessage, exitCode = EXIT_CODES.error) {
    super(safeMessage);
    this.name = "SafeSessionError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command.startsWith("-")) {
    throw new SafeSessionError("missing_command", "コマンドを指定してください。");
  }

  const options = {};
  const booleanFlags = new Set(["allow-public"]);

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new SafeSessionError("unexpected_argument", "指定方法を確認してください。");
    }

    const key = token.slice(2);
    if (!key || Object.hasOwn(options, key)) {
      throw new SafeSessionError("invalid_option", "オプションの指定を確認してください。");
    }

    if (booleanFlags.has(key)) {
      options[key] = true;
      continue;
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new SafeSessionError("missing_option_value", "オプションの値を指定してください。");
    }
    options[key] = value;
    index += 1;
  }

  return { command, options };
}

export function validateOptions(options, allowed) {
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      throw new SafeSessionError("unknown_option", "未対応のオプションが指定されています。");
    }
  }
}

export function safeText(field, value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new SafeSessionError("missing_safe_text", "必要な説明を一文で指定してください。");
    }
    return "";
  }

  if (typeof value !== "string") {
    throw new SafeSessionError("invalid_safe_text", "説明は一文で指定してください。");
  }

  const normalized = value.normalize("NFKC").trim().replace(/[\t ]+/gu, " ");
  const maxLength = FIELD_LIMITS[field] ?? 240;

  if ((required && normalized.length === 0) || normalized.length > maxLength) {
    throw new SafeSessionError("unsafe_input", "短い要約だけを入力してください。入力内容は表示しません。");
  }

  if (hasForbiddenControlCharacter(normalized) || UNSAFE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new SafeSessionError(
      "unsafe_input",
      "秘密情報・個人情報・会話全文・生のコマンド出力は記録できません。安全な一文に要約してください。入力内容は表示しません。",
    );
  }

  return normalized;
}

function hasForbiddenControlCharacter(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint === 0x7f || (codePoint < 0x20 && codePoint !== 0x09);
  });
}

export function makeSession({ goal, repositorySlug, repositoryId = null, allowPublic = false, now = new Date() }) {
  return {
    schemaVersion: 1,
    sessionId: randomUUID(),
    phase: "active",
    goal,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: null,
    issueNumber: null,
    issueVerified: false,
    repositorySlug,
    repositoryId,
    publicWriteAllowed: Boolean(allowPublic),
    syncedFingerprints: [],
  };
}

export function makeEvent({ type, step, summary, next = "", commit = "", now = new Date() }) {
  if (!EVENT_TYPES.includes(type)) {
    throw new SafeSessionError("invalid_event_type", "記録の種類を確認してください。");
  }

  const event = {
    id: randomUUID(),
    type,
    step,
    summary,
    next,
    commit,
    occurredAt: now.toISOString(),
  };
  return { ...event, fingerprint: fingerprintEvent(event) };
}

export function fingerprintEvent(event) {
  const canonical = JSON.stringify([
    event.type,
    event.step,
    event.summary,
    event.next ?? "",
    event.commit ?? "",
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function issueMarker(sessionId) {
  return `<!-- machiba-support-session:${sessionId} -->`;
}

export function eventMarker(event) {
  return `<!-- machiba-support-event:${event.id}:${event.fingerprint} -->`;
}

export function eventFingerprintMarker(fingerprint) {
  return `:${fingerprint} -->`;
}

export function formatIssueTitle(startedAt) {
  const date = startedAt.slice(0, 10);
  return `[AI相談] サポートセッション ${date}`;
}

export function formatIssueBody(session) {
  return [
    issueMarker(session.sessionId),
    "# AI相談セッション",
    "",
    `- 開始日時：${session.startedAt}`,
    `- 今日の目的：${escapeMarkdown(session.goal)}`,
    "- 状態：進行中",
    "",
    "## 記録方針",
    "",
    "このIssueには、AIとの会話全文ではなく、作業の成功・失敗・停止理由・次の一つを安全な要約として記録します。秘密情報、個人情報、生のコマンド出力は記録しません。",
  ].join("\n");
}

export function formatEventComment(event) {
  const lines = [
    eventMarker(event),
    `## ${EVENT_LABELS[event.type]}`,
    "",
    `- 記録日時：${event.occurredAt}`,
    `- STEP：${escapeMarkdown(event.step)}`,
    `- 内容：${escapeMarkdown(event.summary)}`,
  ];

  if (event.next) {
    lines.push(`- 次にする一つ：${escapeMarkdown(event.next)}`);
  }
  if (event.commit) {
    lines.push(`- 関連コミット：${event.commit}`);
  }

  return lines.join("\n");
}

export function safeCommitSha(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || !/^[0-9a-fA-F]{40}$/u.test(value)) {
    throw new SafeSessionError("invalid_commit", "コミットはpush済みの40桁full SHAで指定してください。入力内容は表示しません。");
  }
  return value.toLowerCase();
}

export function isEventKnown(state, queue, fingerprint) {
  return (
    state.syncedFingerprints.includes(fingerprint) ||
    queue.items.some((item) => item.kind === "event" && item.event.fingerprint === fingerprint)
  );
}

export function safeStatusPayload({ command, state, queue, github, duplicate = false }) {
  return {
    ok: true,
    command,
    session: state?.phase ?? "not-started",
    github,
    issueLinked: Boolean(state?.issueVerified),
    issueNumber: state?.issueVerified && Number.isInteger(state.issueNumber) ? state.issueNumber : null,
    pending: queue?.items?.length ?? 0,
    duplicate,
  };
}

export function parseIssueNumber(output) {
  const match = String(output).trim().match(/\/(\d+)\/?$/u);
  if (!match) {
    throw new SafeSessionError("issue_create_unconfirmed", "GitHubへの記録を確認できませんでした。", EXIT_CODES.queued);
  }
  return Number(match[1]);
}

export function escapeMarkdown(value) {
  return value.replace(/([\\`*_{}[\]()#+.!|>~-])/gu, "\\$1").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

export function publicWriteDecision({ visibility, allowPublic }) {
  if (visibility === "PUBLIC" && !allowPublic) {
    return { allowed: false, status: "blocked-public" };
  }
  if (visibility !== "PUBLIC" && visibility !== "PRIVATE" && visibility !== "INTERNAL") {
    return { allowed: false, status: "queued" };
  }
  return { allowed: true, status: "ready" };
}

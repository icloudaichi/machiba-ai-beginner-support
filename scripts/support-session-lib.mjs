import { createHash, randomUUID } from "node:crypto";

export const EVENT_TYPES = Object.freeze([
  "success",
  "failure",
  "blocked",
  "info",
  "completed",
  "consultation",
  "artifact",
]);

export const EXIT_CODES = Object.freeze({
  ok: 0,
  error: 1,
  queued: 2,
});

export const DRIVE_SUBMISSION_FOLDER_ID = "1sEgVfferbokBUQU440bChvVYyGk338hs";
export const DRIVE_SUBMISSION_FOLDER_LABEL = "街場のAI屋さん・当日成果物フォルダ";

const EVENT_LABELS = Object.freeze({
  success: "成功",
  failure: "失敗",
  blocked: "停止中",
  info: "情報",
  completed: "完了",
  consultation: "AI相談記録",
  artifact: "Google Drive成果物",
});

const FIELD_LIMITS = Object.freeze({
  goal: 240,
  step: 100,
  summary: 360,
  next: 240,
  consultation: 700,
  background: 500,
  tried: 700,
  failure: 700,
  solution: 700,
  learning: 500,
  query: 120,
  displayName: 40,
  filename: 180,
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
  const booleanFlags = new Set([
    "allow-public",
    "confirm-display-name",
    "read-back-verified",
    "parent-verified",
  ]);

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

export function makeSession({
  goal,
  repositorySlug,
  repositoryId = null,
  displayName = null,
  participantKey = null,
  allowPublic = false,
  now = new Date(),
}) {
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
    displayName,
    participantKey,
    publicWriteAllowed: Boolean(allowPublic),
    syncedFingerprints: [],
  };
}

export function makeEvent({
  type,
  step,
  summary,
  next = "",
  commit = "",
  consultation = "",
  background = "",
  tried = "",
  failure = "",
  solution = "",
  learning = "",
  filename = "",
  driveUrl = "",
  uploadRoute = "",
  readBackVerified = false,
  submissionFolder = "",
  parentVerified = false,
  participantKey = "",
  now = new Date(),
}) {
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
    consultation,
    background,
    tried,
    failure,
    solution,
    learning,
    filename,
    driveUrl,
    uploadRoute,
    readBackVerified,
    submissionFolder,
    parentVerified,
    participantKey,
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
    event.consultation ?? "",
    event.background ?? "",
    event.tried ?? "",
    event.failure ?? "",
    event.solution ?? "",
    event.learning ?? "",
    event.filename ?? "",
    event.driveUrl ?? "",
    event.uploadRoute ?? "",
    Boolean(event.readBackVerified),
    event.submissionFolder ?? "",
    Boolean(event.parentVerified),
    event.participantKey ?? "",
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function issueMarker(sessionId) {
  return `<!-- machiba-support-session:${sessionId} -->`;
}

export function participantMarker(participantKey) {
  return `<!-- machiba-support-participant:${participantKey} -->`;
}

export function makeParticipantKey(displayName) {
  return createHash("sha256").update(`display-name:${displayName}`).digest("hex");
}

export function eventMarker(event) {
  return `<!-- machiba-support-event:${event.id}:${event.fingerprint} -->`;
}

export function eventFingerprintMarker(fingerprint) {
  return `:${fingerprint} -->`;
}

export function formatIssueTitle(session) {
  const date = session.startedAt.slice(0, 10);
  return session.displayName ? `AI相談｜${session.displayName}｜${date}` : `[AI相談] サポートセッション ${date}`;
}

export function formatIssueBody(session) {
  const lines = [
    issueMarker(session.sessionId),
    "# AI相談セッション",
    "",
    `- 開始日時：${session.startedAt}`,
    `- 今日の目的：${escapeMarkdown(session.goal)}`,
  ];
  if (session.displayName && session.participantKey) {
    lines.push(participantMarker(session.participantKey));
    lines.push(`- 参加者の表示名：${escapeMarkdown(session.displayName)}`);
  }
  const privacyNote = session.displayName
    ? "このIssueには、本人が確認した表示名と、AI相談の再利用可能な要約だけを記録します。会話全文、表示名以外の個人情報、秘密情報、生のコマンド出力は記録しません。"
    : "このIssueには、AIとの会話全文ではなく、作業の成功・失敗・停止理由・次の一つを安全な要約として記録します。秘密情報、個人情報、生のコマンド出力は記録しません。";
  lines.push(
    "- 状態：進行中",
    "",
    "## 記録方針",
    "",
    privacyNote,
  );
  return lines.join("\n");
}

export function formatEventComment(event) {
  if (event.type === "artifact") {
    const driveReference = event.driveUrl
      ? event.driveUrl
      : "未記録（ファイル名とread-back確認のみ）";
    return [
      eventMarker(event),
      participantMarker(event.participantKey),
      `## ${EVENT_LABELS[event.type]}`,
      "",
      `- 記録日時：${event.occurredAt}`,
      `- ファイル名：${escapeMarkdown(event.filename)}`,
      `- DriveファイルURL：${driveReference}`,
      `- 提出先：${escapeMarkdown(event.submissionFolder)}`,
      `- アップロード経路：${event.uploadRoute}`,
      "- 親フォルダ確認：済",
      "- Drive read-back確認：済（ファイル名・親フォルダ）",
      `- 要約：${escapeMarkdown(event.summary)}`,
      `- 次の一手：${escapeMarkdown(event.next)}`,
    ].join("\n");
  }

  if (event.type === "consultation") {
    const fields = [
      ["相談内容", event.consultation],
      ["背景", event.background],
      ["試したこと", event.tried],
      ["起きたこと・失敗", event.failure],
      ["解決方法", event.solution],
      ["学び", event.learning],
      ["次の一手", event.next],
    ];
    const lines = [
      eventMarker(event),
      participantMarker(event.participantKey),
      `## ${EVENT_LABELS[event.type]}`,
      "",
      `- 記録日時：${event.occurredAt}`,
    ];
    for (const [label, value] of fields) {
      if (value) lines.push(`- ${label}：${escapeMarkdown(value)}`);
    }
    if (event.commit) lines.push(`- 関連コミット：${event.commit}`);
    return lines.join("\n");
  }

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

export function safeDisplayName(value) {
  let displayName;
  try {
    displayName = safeText("displayName", value, { required: true });
  } catch {
    throw new SafeSessionError(
      "invalid_display_name",
      "表示名には、本人が確認した短い名前だけを指定してください。入力内容は表示しません。",
    );
  }
  if (!/^[\p{L}\p{M}\p{N} .・ー_-]{1,40}$/u.test(displayName)) {
    throw new SafeSessionError(
      "invalid_display_name",
      "表示名には、本人が確認した短い名前だけを指定してください。入力内容は表示しません。",
    );
  }
  return displayName;
}

export function safeFilename(value) {
  let filename;
  try {
    filename = safeText("filename", value, { required: true });
  } catch {
    throw new SafeSessionError("invalid_filename", "ファイル名だけを指定してください。入力内容は表示しません。");
  }
  const lowerName = filename.toLowerCase();
  const looksSensitive =
    filename.startsWith(".") ||
    /(?:^|[._ -])(?:secret|token|credentials?|passwords?|private[ _-]?key)(?:[._ -]|$)/iu.test(filename) ||
    /(?:秘密鍵|認証情報|パスワード|トークン)/u.test(filename) ||
    /\.(?:pem|key|p12|pfx)$/iu.test(lowerName);
  if (/[/\\:*?"<>|]/u.test(filename) || filename === "." || filename === ".." || looksSensitive) {
    throw new SafeSessionError("invalid_filename", "フォルダパスではなくファイル名だけを指定してください。入力内容は表示しません。");
  }
  return filename;
}

export function safeUploadRoute(value) {
  if (!["browser", "connector", "api"].includes(value)) {
    throw new SafeSessionError("invalid_upload_route", "upload routeはbrowser、connector、apiから選んでください。");
  }
  return value;
}

export function verifyDriveSubmissionFolder(folderId, parentVerified) {
  if (typeof folderId !== "string" || folderId !== DRIVE_SUBMISSION_FOLDER_ID) {
    throw new SafeSessionError(
      "invalid_drive_submission_folder",
      "講座で指定されたGoogle Drive提出フォルダを確認できません。入力内容は表示しません。",
    );
  }
  if (parentVerified !== true) {
    throw new SafeSessionError(
      "drive_parent_verification_required",
      "Driveからファイル情報を読み戻し、親フォルダが講座指定の提出先と一致することを確認してください。",
    );
  }
  return DRIVE_SUBMISSION_FOLDER_LABEL;
}

export function safeDriveFileUrl(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 600 || /[\r\n\u2028\u2029]/u.test(value)) {
    throw new SafeSessionError("invalid_drive_file_url", "Google DriveのファイルURLを確認できません。入力内容は表示しません。");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SafeSessionError("invalid_drive_file_url", "Google DriveのファイルURLを確認できません。入力内容は表示しません。");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !["drive.google.com", "docs.google.com"].includes(url.hostname.toLowerCase())
  ) {
    throw new SafeSessionError("invalid_drive_file_url", "認証値を含まないGoogle DriveのファイルURLだけを指定してください。入力内容は表示しません。");
  }

  const allowedQuery = new Set(["usp"]);
  const allowedUspValues = new Set(["sharing", "drive_link", "docs_web", "sheets_web", "slides_web"]);
  for (const [key, queryValue] of url.searchParams) {
    if (!allowedQuery.has(key) || !allowedUspValues.has(queryValue)) {
      throw new SafeSessionError(
        "invalid_drive_file_url",
        "トークン、認証値、共有権限情報を含むURLは記録できません。入力内容は表示しません。",
      );
    }
  }

  const fileId = "[A-Za-z0-9_-]{10,}";
  const drivePath = new RegExp(`^/file(?:/u/[0-9]+)?/d/${fileId}(?:/(?:view|preview|edit))?/?$`, "u");
  const docsPath = new RegExp(
    `^/(?:document|spreadsheets|presentation|forms|drawings)(?:/u/[0-9]+)?/d/${fileId}(?:/(?:edit|view|preview|copy))?/?$`,
    "u",
  );
  const pathIsFile =
    (url.hostname.toLowerCase() === "drive.google.com" && drivePath.test(url.pathname)) ||
    (url.hostname.toLowerCase() === "docs.google.com" && docsPath.test(url.pathname));
  if (!pathIsFile) {
    throw new SafeSessionError(
      "invalid_drive_file_url",
      "共有フォルダではなく、drive.google.comまたはdocs.google.comの個別ファイルURLを指定してください。入力内容は表示しません。",
    );
  }
  return url.toString();
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

export function unescapeMarkdown(value) {
  return value
    .replace(/\\([\\`*_{}[\]()#+.!|>~-])/gu, "$1")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
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

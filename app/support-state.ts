import { GOOGLE_DRIVE_SUBMISSION_FOLDER_ID } from "./support-context.ts";

export type OsChoice = "" | "mac" | "windows";
export type AiChoice = "" | "chatgpt" | "claude";
export type ProjectStatus = "not-ready" | "ready";
export type ConnectionStatus =
  | "unknown"
  | "preparing"
  | "account-ready"
  | "connected"
  | "account-blocked"
  | "connection-blocked";
export type SetupGate = "pending" | "ready" | "local-fallback";
export type SupportMode = "" | "slow" | "step" | "summary";
export type GitHubLogStatus = "not-started" | "local-queued" | "synced" | "blocked";
export type SubmissionUploadRoute = "browser" | "connector" | "api";
export type StarterStatus = "not-ready" | "ready";
export type RepositoryStatus = "not-ready" | "private-ready" | "local-only";
export type SupportKitStatus = "not-checked" | "ready" | "missing";
export type DriveSubmissionStatus = "not-started" | "submitted";
export type DriveIssueRecordStatus = "not-started" | "waiting" | "synced";
export type StepId =
  | "device"
  | "github-account"
  | "github-connect"
  | "starter-obtain"
  | "repository-setup"
  | "project-folder"
  | "support-kit"
  | "github-log"
  | "cloudflare-account"
  | "cloudflare-connect"
  | "setup-gate"
  | "support-mode"
  | "idea"
  | "starter"
  | "publish"
  | "submit";

export type SupportProgress = {
  version: 8;
  displayName: string;
  nameConsent: boolean;
  issueNameConsent: boolean;
  os: OsChoice;
  ai: AiChoice;
  starterStatus: StarterStatus;
  repositoryStatus: RepositoryStatus;
  projectStatus: ProjectStatus;
  supportKitStatus: SupportKitStatus;
  githubStatus: ConnectionStatus;
  cloudflareStatus: ConnectionStatus;
  setupGate: SetupGate;
  supportMode: SupportMode;
  githubLogStatus: GitHubLogStatus;
  githubIssueNumber: number | null;
  driveSubmissionStatus: DriveSubmissionStatus;
  driveIssueRecordStatus: DriveIssueRecordStatus;
  driveSubmissionFileName: string;
  driveSubmissionUploadRoute: SubmissionUploadRoute | "";
  currentStep: StepId;
  completedSteps: StepId[];
  updatedAt: number;
};

export const stepOrder: StepId[] = [
  "device",
  "github-account",
  "github-connect",
  "starter-obtain",
  "repository-setup",
  "project-folder",
  "support-kit",
  "github-log",
  "cloudflare-account",
  "cloudflare-connect",
  "setup-gate",
  "support-mode",
  "idea",
  "starter",
  "publish",
  "submit",
];

export const initialProgress: SupportProgress = {
  version: 8,
  displayName: "",
  nameConsent: false,
  issueNameConsent: false,
  os: "",
  ai: "",
  starterStatus: "not-ready",
  repositoryStatus: "not-ready",
  projectStatus: "not-ready",
  supportKitStatus: "not-checked",
  githubStatus: "unknown",
  cloudflareStatus: "unknown",
  setupGate: "pending",
  supportMode: "",
  githubLogStatus: "not-started",
  githubIssueNumber: null,
  driveSubmissionStatus: "not-started",
  driveIssueRecordStatus: "not-started",
  driveSubmissionFileName: "",
  driveSubmissionUploadRoute: "",
  currentStep: "device",
  completedSteps: [],
  updatedAt: 0,
};

const allowedStatuses: ConnectionStatus[] = [
  "unknown",
  "preparing",
  "account-ready",
  "connected",
  "account-blocked",
  "connection-blocked",
];

export function sanitizeDisplayName(value: unknown) {
  if (typeof value !== "string") return "";
  const withoutControlCharacters = [...value].filter(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 32 && codePoint !== 127;
  }).join("");
  return withoutControlCharacters
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N} .・ー_-]/gu, "")
    .trim()
    .slice(0, 40);
}

export function buildParticipantPromptContext(value: unknown, confirmed = false) {
  const displayName = sanitizeDisplayName(value);
  if (!displayName) {
    return "相談用表示名（ニックネーム・日本語可）：未入力\nこの端末の進捗用の呼び名を先に確認してください。private Issueへの保存は別の確認が必要です。表示名を確認できるまでセッションIssueを開始しないでください。";
  }
  if (!confirmed) {
    return `相談用表示名（ニックネーム・日本語可）：${displayName}\nこの呼び名はこの端末の進捗用にだけ保存済みです。private Issueへの保存はまだ了承されていません。表示名をIssue開始コマンドへ渡さず、セッションIssueを開始しないでください。`;
  }

  return `相談用表示名（ニックネーム・日本語可）：${displayName}\n本人が、このニックネームをprivate Issueへ保存することを別途了承済みです。GitHubのrepo名とは別に扱ってください。セッション開始時は scripts/support-session.mjs start に --display-name "${displayName}" --confirm-display-name を渡し、同じ表示名をセッションIssueと以後の記録で使ってください。`;
}

export function canUseDisplayNameInIssue(progress: Pick<SupportProgress, "displayName" | "nameConsent" | "issueNameConsent">) {
  return progress.nameConsent
    && progress.issueNameConsent
    && sanitizeDisplayName(progress.displayName).length > 0;
}

export function isDeviceDisplayNameLocked(progress: Pick<SupportProgress, "githubLogStatus" | "githubIssueNumber">) {
  return progress.githubLogStatus === "local-queued"
    || progress.githubLogStatus === "synced"
    || progress.githubIssueNumber !== null;
}

export function saveDisplayNameToDevice(
  progress: Pick<SupportProgress, "displayName" | "nameConsent" | "issueNameConsent">,
  value: unknown,
): Pick<SupportProgress, "displayName" | "nameConsent" | "issueNameConsent"> {
  const displayName = sanitizeDisplayName(value);
  if (!displayName) return { displayName: "", nameConsent: false, issueNameConsent: false };
  const sameConfirmedName = progress.nameConsent && displayName === sanitizeDisplayName(progress.displayName);
  return {
    displayName,
    nameConsent: true,
    issueNameConsent: sameConfirmedName ? progress.issueNameConsent : false,
  };
}

export function sanitizeSubmissionFileName(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N} .・ー_()-]/gu, "")
    .replace(/^\.+/u, "")
    .trim()
    .slice(0, 120);
}

export function canRecordDriveIssue(githubLogStatus: GitHubLogStatus, githubIssueNumber: number | null) {
  return githubLogStatus === "synced"
    && typeof githubIssueNumber === "number"
    && Number.isSafeInteger(githubIssueNumber)
    && githubIssueNumber > 0;
}

export function deriveDriveIssueRecordStatus(
  driveSubmissionStatus: DriveSubmissionStatus,
  requestedStatus: DriveIssueRecordStatus,
  githubLogStatus: GitHubLogStatus,
  githubIssueNumber: number | null,
): DriveIssueRecordStatus {
  if (driveSubmissionStatus !== "submitted") return "not-started";
  if (requestedStatus === "synced" && canRecordDriveIssue(githubLogStatus, githubIssueNumber)) return "synced";
  return "waiting";
}

export function sanitizeDriveFileUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 500 || /[\r\n\u2028\u2029]/u.test(value)) return "";
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "drive.google.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    ) return "";
    const allowedUspValues = new Set(["sharing", "drive_link", "docs_web", "sheets_web", "slides_web"]);
    for (const [key, queryValue] of url.searchParams) {
      if (key !== "usp" || !allowedUspValues.has(queryValue)) return "";
    }
    const filePath = /^\/file(?:\/u\/[0-9]+)?\/d\/[A-Za-z0-9_-]{10,}(?:\/(?:view|preview|edit))?\/?$/u;
    return filePath.test(url.pathname) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function buildSubmissionRecordPrompt({
  displayName,
  fileName,
  fileUrl,
  uploadRoute,
}: {
  displayName: unknown;
  fileName: unknown;
  fileUrl: unknown;
  uploadRoute: unknown;
}) {
  const safeDisplayName = sanitizeDisplayName(displayName);
  const safeFileName = sanitizeSubmissionFileName(fileName);
  const submittedFileUrl = typeof fileUrl === "string" ? fileUrl.trim() : "";
  const safeFileUrl = sanitizeDriveFileUrl(fileUrl);
  const safeUploadRoute = uploadRoute === "browser" || uploadRoute === "connector" || uploadRoute === "api"
    ? uploadRoute
    : "";
  if (!safeDisplayName || !safeFileName.toLowerCase().endsWith(".zip")) return "";
  if (submittedFileUrl && !safeFileUrl) return "";
  if (!safeUploadRoute) return "";
  const driveUrlArgument = safeFileUrl ? ` --drive-url "${safeFileUrl}"` : "";
  const artifactCommand = `node scripts/support-session.mjs artifact --filename "${safeFileName}" --folder-id ${GOOGLE_DRIVE_SUBMISSION_FOLDER_ID} --parent-verified${driveUrlArgument} --upload-route ${safeUploadRoute} --read-back-verified --summary "Google Driveに成果物を提出し読み戻し確認済み" --next "講師の確認と次の制作相談"`;

  return `提出結果を、今開いている対象アプリのprivate GitHubリポジトリにあるセッションIssueへ記録してください。公開教材リポジトリには記録しないでください。

- 相談用表示名：${safeDisplayName}
- 提出ファイル名：${safeFileName}
- Google DriveファイルURL：${safeFileUrl || "未記録（ファイル名と読み戻し確認のみ）"}
- 実際のアップロード経路：${safeUploadRoute}
- 読み戻し確認：共有フォルダのファイル一覧またはファイルメタデータで、同じファイル名が存在することを確認済み

最初に node scripts/support-session.mjs --help を実行し、artifactコマンドがあることを確認してください。あれば次のコマンドを使い、同じprivate Issueへ記録してください。

${artifactCommand}

artifactコマンドがなければ、別コマンドで代用したり記録したふりをせず、サポートキットの更新が必要だと報告してください。STEP IDは submit、結果は成功として、提出内容を短く追記してください。folder-idは提出先の検証だけに使い、Issue本文へ記録しないでください。パスワード、認証コード、トークン、秘密鍵、生のコマンド出力、ファイルの絶対パス、個人・顧客データは記録しないでください。Google Driveの共有設定や権限は変更しないでください。書き込み後は同じIssueをGitHubから再読み取りし、記録できたこととIssue番号だけを報告してください。`;
}

export function isBlocked(status: ConnectionStatus) {
  return status === "account-blocked" || status === "connection-blocked";
}

export function deriveGate(
  projectStatus: ProjectStatus,
  githubStatus: ConnectionStatus,
  cloudflareStatus: ConnectionStatus,
  githubLogStatus: GitHubLogStatus = "synced",
): SetupGate {
  if (projectStatus !== "ready") return "pending";
  if (isBlocked(githubStatus) || isBlocked(cloudflareStatus)) return "local-fallback";
  if (githubLogStatus === "blocked" || githubLogStatus === "local-queued") return "local-fallback";
  if (githubLogStatus !== "synced") return "pending";
  if (githubStatus === "connected" && cloudflareStatus === "connected") return "ready";
  return "pending";
}

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && stepOrder.includes(value as StepId);
}

function migrateBlockedStatus(
  value: unknown,
  accountStep: StepId,
  completedSteps: StepId[],
): ConnectionStatus {
  if (allowedStatuses.includes(value as ConnectionStatus)) return value as ConnectionStatus;
  if (value === "blocked") {
    return completedSteps.includes(accountStep) ? "connection-blocked" : "account-blocked";
  }
  return "unknown";
}

export function sanitizeProgress(value: unknown): SupportProgress {
  if (!value || typeof value !== "object") return { ...initialProgress };
  const candidate = value as Partial<SupportProgress> & { version?: number };
  const completedSteps = Array.isArray(candidate.completedSteps)
    ? [...new Set(candidate.completedSteps.filter(isStepId))]
    : [];
  const os: OsChoice = candidate.os === "mac" || candidate.os === "windows" ? candidate.os : "";
  const ai: AiChoice = candidate.ai === "chatgpt" || candidate.ai === "claude" ? candidate.ai : "";
  const nameConsent = candidate.nameConsent === true;
  const displayName = nameConsent ? sanitizeDisplayName(candidate.displayName) : "";
  const issueNameConsent = (candidate.version ?? 0) >= 8
    && nameConsent
    && displayName.length > 0
    && candidate.issueNameConsent === true;
  const starterStatus: StarterStatus = candidate.starterStatus === "ready" ? "ready" : "not-ready";
  const repositoryStatus: RepositoryStatus = candidate.repositoryStatus === "private-ready" || candidate.repositoryStatus === "local-only"
    ? candidate.repositoryStatus
    : "not-ready";
  const projectStatus: ProjectStatus = candidate.projectStatus === "ready" ? "ready" : "not-ready";
  const supportKitStatus: SupportKitStatus = candidate.supportKitStatus === "ready" || candidate.supportKitStatus === "missing"
    ? candidate.supportKitStatus
    : "not-checked";
  const githubStatus = migrateBlockedStatus(candidate.githubStatus, "github-account", completedSteps);
  const cloudflareStatus = migrateBlockedStatus(candidate.cloudflareStatus, "cloudflare-account", completedSteps);
  const allowedModes: SupportMode[] = ["", "slow", "step", "summary"];
  const supportMode = allowedModes.includes(candidate.supportMode as SupportMode)
    ? (candidate.supportMode as SupportMode)
    : "";
  const allowedLogStatuses: GitHubLogStatus[] = ["not-started", "local-queued", "synced", "blocked"];
  const githubLogStatus = allowedLogStatuses.includes(candidate.githubLogStatus as GitHubLogStatus)
    ? (candidate.githubLogStatus as GitHubLogStatus)
    : "not-started";
  const githubIssueNumber = typeof candidate.githubIssueNumber === "number"
    && Number.isSafeInteger(candidate.githubIssueNumber)
    && candidate.githubIssueNumber > 0
    ? candidate.githubIssueNumber
    : null;
  const safeDriveSubmissionFileName = sanitizeSubmissionFileName(candidate.driveSubmissionFileName);
  const driveSubmissionStatus: DriveSubmissionStatus = candidate.driveSubmissionStatus === "submitted"
    && safeDriveSubmissionFileName.toLowerCase().endsWith(".zip")
    ? "submitted"
    : "not-started";
  const driveSubmissionUploadRoute: SubmissionUploadRoute | "" = candidate.driveSubmissionUploadRoute === "browser"
    || candidate.driveSubmissionUploadRoute === "connector"
    || candidate.driveSubmissionUploadRoute === "api"
    ? candidate.driveSubmissionUploadRoute
    : "";
  const requestedDriveIssueRecordStatus: DriveIssueRecordStatus = candidate.driveIssueRecordStatus === "waiting" || candidate.driveIssueRecordStatus === "synced"
    ? candidate.driveIssueRecordStatus
    : "not-started";
  const driveIssueRecordStatus = deriveDriveIssueRecordStatus(
    driveSubmissionStatus,
    requestedDriveIssueRecordStatus,
    githubLogStatus,
    githubIssueNumber,
  );
  const requestedStep = isStepId(candidate.currentStep) ? candidate.currentStep : "device";
  let currentStep = (candidate.version ?? 0) < 3
    && githubStatus === "connected"
    && githubLogStatus === "not-started"
    && stepOrder.indexOf(requestedStep) > stepOrder.indexOf("github-connect")
    ? "github-connect"
    : requestedStep;
  if ((candidate.version ?? 0) < 5 && currentStep === "publish" && completedSteps.includes("publish")) {
    currentStep = "submit";
  }
  if ((candidate.version ?? 0) < 7 && stepOrder.indexOf(requestedStep) > stepOrder.indexOf("github-connect")) {
    currentStep = githubStatus === "connected" ? "starter-obtain" : "github-account";
  }
  if (
    !issueNameConsent
    && nameConsent
    && repositoryStatus === "private-ready"
    && projectStatus === "ready"
    && supportKitStatus === "ready"
    && githubStatus === "connected"
    && ((candidate.version ?? 0) < 8 || githubIssueNumber !== null)
    && stepOrder.indexOf(currentStep) > stepOrder.indexOf("github-log")
  ) {
    currentStep = "github-log";
  }

  return {
    version: 8,
    displayName,
    nameConsent,
    issueNameConsent,
    os,
    ai,
    starterStatus,
    repositoryStatus,
    projectStatus,
    supportKitStatus,
    githubStatus,
    cloudflareStatus,
    setupGate: deriveGate(projectStatus, githubStatus, cloudflareStatus, githubLogStatus),
    supportMode,
    githubLogStatus,
    githubIssueNumber,
    driveSubmissionStatus,
    driveIssueRecordStatus,
    driveSubmissionFileName: driveSubmissionStatus === "submitted" ? safeDriveSubmissionFileName : "",
    driveSubmissionUploadRoute: driveSubmissionStatus === "submitted" ? driveSubmissionUploadRoute : "",
    currentStep,
    completedSteps,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
  };
}

export function nextConnectionStep(progress: Pick<SupportProgress, "starterStatus" | "repositoryStatus" | "projectStatus" | "supportKitStatus" | "githubStatus" | "cloudflareStatus"> & Partial<Pick<SupportProgress, "githubLogStatus">>): StepId {
  if (
    progress.githubStatus === "unknown" ||
    progress.githubStatus === "preparing" ||
    progress.githubStatus === "account-blocked"
  ) return "github-account";
  if (progress.githubStatus === "account-ready" || progress.githubStatus === "connection-blocked") return "github-connect";

  if (progress.starterStatus !== "ready") return "starter-obtain";
  if (progress.repositoryStatus !== "private-ready") return "repository-setup";
  if (progress.projectStatus !== "ready") return "project-folder";
  if (progress.supportKitStatus !== "ready") return "support-kit";
  if (progress.githubLogStatus !== undefined
    && progress.githubLogStatus !== "synced" && progress.githubLogStatus !== "local-queued") return "github-log";

  if (
    progress.cloudflareStatus === "unknown" ||
    progress.cloudflareStatus === "preparing" ||
    progress.cloudflareStatus === "account-blocked"
  ) return "cloudflare-account";
  if (progress.cloudflareStatus === "account-ready" || progress.cloudflareStatus === "connection-blocked") return "cloudflare-connect";

  return "setup-gate";
}

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
export type StepId =
  | "device"
  | "project-folder"
  | "github-account"
  | "github-connect"
  | "cloudflare-account"
  | "cloudflare-connect"
  | "setup-gate"
  | "support-mode"
  | "idea"
  | "starter"
  | "publish";

export type SupportProgress = {
  version: 3;
  os: OsChoice;
  ai: AiChoice;
  projectStatus: ProjectStatus;
  githubStatus: ConnectionStatus;
  cloudflareStatus: ConnectionStatus;
  setupGate: SetupGate;
  supportMode: SupportMode;
  githubLogStatus: GitHubLogStatus;
  githubIssueNumber: number | null;
  currentStep: StepId;
  completedSteps: StepId[];
  updatedAt: number;
};

export const stepOrder: StepId[] = [
  "device",
  "project-folder",
  "github-account",
  "github-connect",
  "cloudflare-account",
  "cloudflare-connect",
  "setup-gate",
  "support-mode",
  "idea",
  "starter",
  "publish",
];

export const initialProgress: SupportProgress = {
  version: 3,
  os: "",
  ai: "",
  projectStatus: "not-ready",
  githubStatus: "unknown",
  cloudflareStatus: "unknown",
  setupGate: "pending",
  supportMode: "",
  githubLogStatus: "not-started",
  githubIssueNumber: null,
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
  const projectStatus: ProjectStatus = candidate.projectStatus === "ready" ? "ready" : "not-ready";
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
  const requestedStep = isStepId(candidate.currentStep) ? candidate.currentStep : "device";
  const currentStep = (candidate.version ?? 0) < 3
    && githubStatus === "connected"
    && githubLogStatus === "not-started"
    && stepOrder.indexOf(requestedStep) > stepOrder.indexOf("github-connect")
    ? "github-connect"
    : requestedStep;

  return {
    version: 3,
    os,
    ai,
    projectStatus,
    githubStatus,
    cloudflareStatus,
    setupGate: deriveGate(projectStatus, githubStatus, cloudflareStatus, githubLogStatus),
    supportMode,
    githubLogStatus,
    githubIssueNumber,
    currentStep,
    completedSteps,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
  };
}

export function nextConnectionStep(progress: Pick<SupportProgress, "projectStatus" | "githubStatus" | "cloudflareStatus"> & Partial<Pick<SupportProgress, "githubLogStatus">>): StepId {
  if (progress.projectStatus !== "ready") return "project-folder";

  if (
    progress.githubStatus === "unknown" ||
    progress.githubStatus === "preparing" ||
    progress.githubStatus === "account-blocked"
  ) return "github-account";
  if (progress.githubStatus === "account-ready" || progress.githubStatus === "connection-blocked") return "github-connect";
  if (progress.githubStatus === "connected" && progress.githubLogStatus !== undefined
    && progress.githubLogStatus !== "synced" && progress.githubLogStatus !== "local-queued") return "github-connect";

  if (
    progress.cloudflareStatus === "unknown" ||
    progress.cloudflareStatus === "preparing" ||
    progress.cloudflareStatus === "account-blocked"
  ) return "cloudflare-account";
  if (progress.cloudflareStatus === "account-ready" || progress.cloudflareStatus === "connection-blocked") return "cloudflare-connect";

  return "setup-gate";
}

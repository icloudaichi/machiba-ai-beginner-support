import test from "node:test";
import assert from "node:assert/strict";
import {
  buildParticipantPromptContext,
  buildSubmissionRecordPrompt,
  canRecordDriveIssue,
  deriveDriveIssueRecordStatus,
  deriveGate,
  initialProgress,
  nextConnectionStep,
  sanitizeDisplayName,
  sanitizeDriveFileUrl,
  sanitizeProgress,
  sanitizeSubmissionFileName,
  stepOrder,
  type SupportProgress,
} from "./support-state.ts";

function progress(patch: Partial<SupportProgress>): SupportProgress {
  return { ...initialProgress, ...patch };
}

test("setup gate requires a ready project folder and both connections", () => {
  assert.equal(deriveGate("not-ready", "connected", "connected"), "pending");
  assert.equal(deriveGate("ready", "connected", "connected"), "ready");
  assert.equal(deriveGate("ready", "account-blocked", "connected"), "local-fallback");
  assert.equal(deriveGate("ready", "connected", "connection-blocked"), "local-fallback");
  assert.equal(deriveGate("ready", "connected", "connected", "not-started"), "pending");
  assert.equal(deriveGate("ready", "connected", "connected", "local-queued"), "local-fallback");
  assert.equal(deriveGate("ready", "connected", "connected", "synced"), "ready");
});

test("retry resumes the exact account or connection stage", () => {
  assert.equal(nextConnectionStep(progress({ githubStatus: "account-blocked" })), "github-account");
  assert.equal(nextConnectionStep(progress({ githubStatus: "connection-blocked" })), "github-connect");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
  })), "starter-obtain");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
    starterStatus: "ready",
  })), "repository-setup");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
    starterStatus: "ready",
    repositoryStatus: "local-only",
    projectStatus: "ready",
    supportKitStatus: "ready",
  })), "repository-setup");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
    starterStatus: "ready",
    repositoryStatus: "private-ready",
  })), "project-folder");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
  })), "support-kit");
  assert.equal(nextConnectionStep(progress({
    githubStatus: "connected",
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
    supportKitStatus: "ready",
    githubLogStatus: "not-started",
  })), "github-log");
  assert.equal(nextConnectionStep(progress({
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
    supportKitStatus: "ready",
    githubStatus: "connected",
    githubLogStatus: "synced",
    cloudflareStatus: "account-blocked",
  })), "cloudflare-account");
  assert.equal(nextConnectionStep(progress({
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
    supportKitStatus: "ready",
    githubStatus: "connected",
    githubLogStatus: "synced",
    cloudflareStatus: "connection-blocked",
  })), "cloudflare-connect");
});

test("legacy blocked state migrates according to the completed stage", () => {
  const accountBlocked = sanitizeProgress({
    version: 1,
    projectStatus: "ready",
    githubStatus: "blocked",
    completedSteps: ["device"],
  });
  assert.equal(accountBlocked.githubStatus, "account-blocked");

  const connectionBlocked = sanitizeProgress({
    version: 1,
    projectStatus: "ready",
    githubStatus: "blocked",
    completedSteps: ["device", "github-account"],
  });
  assert.equal(connectionBlocked.githubStatus, "connection-blocked");
});

test("sanitization keeps the confirmed display name and drops paths or account data", () => {
  const sanitized = sanitizeProgress({
    version: 7,
    displayName: "  だいち\nさん  ",
    nameConsent: true,
    os: "mac",
    ai: "chatgpt",
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
    supportKitStatus: "ready",
    githubStatus: "connected",
    cloudflareStatus: "connected",
    githubLogStatus: "synced",
    currentStep: "support-mode",
    completedSteps: ["device", "device", "project-folder", "not-a-step"],
    projectPath: "/Users/example/secret-project",
    email: "someone@example.com",
    accountId: "secret-account",
    githubIssueNumber: 42,
  });

  assert.deepEqual(sanitized.completedSteps, ["device", "project-folder"]);
  assert.equal(sanitized.version, 7);
  assert.equal(sanitized.displayName, "だいちさん");
  assert.equal(sanitized.nameConsent, true);
  assert.equal(sanitized.setupGate, "ready");
  assert.equal("projectPath" in sanitized, false);
  assert.equal("email" in sanitized, false);
  assert.equal("accountId" in sanitized, false);
  assert.equal(sanitized.githubIssueNumber, 42);
});

test("display names are normalized and bounded for progress cards", () => {
  assert.equal(sanitizeDisplayName("  和佐　大輔  "), "和佐 大輔");
  assert.equal(sanitizeDisplayName("下山\u0000さん"), "下山さん");
  assert.equal(sanitizeDisplayName("Daichi <script>"), "Daichi script");
  assert.equal(sanitizeDisplayName("あ".repeat(50)), "あ".repeat(40));
  assert.equal(sanitizeDisplayName({ name: "だいち" }), "");
});

test("participant prompt context carries the confirmed name into session start", () => {
  const named = buildParticipantPromptContext("  だいち  ", true);
  assert.match(named, /参加者名（表示名）：だいち/u);
  assert.match(named, /--display-name "だいち" --confirm-display-name/u);

  const unnamed = buildParticipantPromptContext("", false);
  assert.match(unnamed, /一度だけ質問/u);
  assert.match(unnamed, /確認できるまでセッションIssueを開始しない/u);

  const unconfirmed = buildParticipantPromptContext("だいち", false);
  assert.match(unconfirmed, /確認できるまでセッションIssueを開始しない/u);
});

test("submission helpers accept only a ZIP name and a Google Drive file URL", () => {
  assert.equal(sanitizeSubmissionFileName("2026-08-23_だいち_成果物.zip"), "2026-08-23_だいち_成果物.zip");
  assert.equal(sanitizeSubmissionFileName("../secret\\file.zip"), "secretfile.zip");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com/file/d/1Abcdefghij/view?usp=sharing"), "https://drive.google.com/file/d/1Abcdefghij/view?usp=sharing");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com/drive/folders/folder-id"), "");
  assert.equal(sanitizeDriveFileUrl("http://drive.google.com/file/d/1Abcdefghij/view"), "");
  assert.equal(sanitizeDriveFileUrl("https://docs.google.com/file/d/1Abcdefghij/view"), "");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com/file/d/1Abcdefghij/view?resourcekey=secret"), "");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com/file/d/1Abcdefghij/view?authuser=1"), "");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com/file/d/1Abcdefghij/view#secret"), "");
  assert.equal(sanitizeDriveFileUrl("https://user@drive.google.com/file/d/1Abcdefghij/view"), "");
  assert.equal(sanitizeDriveFileUrl("https://drive.google.com:444/file/d/1Abcdefghij/view"), "");

  const prompt = buildSubmissionRecordPrompt({
    displayName: "だいち",
    fileName: "2026-08-23_だいち_成果物.zip",
    fileUrl: "https://drive.google.com/file/d/1Abcdefghij/view",
    uploadRoute: "browser",
  });
  assert.match(prompt, /参加者名（表示名）：だいち/u);
  assert.match(prompt, /2026-08-23_だいち_成果物\.zip/u);
  assert.match(prompt, /ファイル一覧またはファイルメタデータ/u);
  assert.match(prompt, /private GitHubリポジトリ/u);
  assert.match(prompt, /共有設定や権限は変更しない/u);
  assert.match(prompt, /support-session\.mjs --help/u);
  assert.match(prompt, /artifact --filename "2026-08-23_だいち_成果物\.zip"/u);
  assert.match(prompt, /--folder-id 1sEgVfferbokBUQU440bChvVYyGk338hs --parent-verified/u);
  assert.match(prompt, /--upload-route browser --read-back-verified/u);
  assert.match(prompt, /folder-idは提出先の検証だけに使い、Issue本文へ記録しない/u);
  assert.match(prompt, /同じIssueをGitHubから再読み取り/u);
  const promptWithoutFileUrl = buildSubmissionRecordPrompt({
    displayName: "だいち",
    fileName: "2026-08-23_だいち_成果物.zip",
    fileUrl: "",
    uploadRoute: "connector",
  });
  assert.match(promptWithoutFileUrl, /未記録（ファイル名と読み戻し確認のみ）/u);
  assert.doesNotMatch(promptWithoutFileUrl, /--drive-url/u);
  assert.match(promptWithoutFileUrl, /--upload-route connector/u);
  assert.equal(buildSubmissionRecordPrompt({ displayName: "だいち", fileName: "成果物.zip", fileUrl: "https://drive.google.com/file/d/1Abcdefghij/view?resourcekey=secret", uploadRoute: "api" }), "");
  assert.equal(buildSubmissionRecordPrompt({ displayName: "だいち", fileName: "成果物.zip", fileUrl: "", uploadRoute: "unknown" }), "");
});

test("invalid issue numbers and unknown log states are discarded", () => {
  const sanitized = sanitizeProgress({
    githubLogStatus: "uploaded",
    githubIssueNumber: -7,
  });

  assert.equal(sanitized.githubLogStatus, "not-started");
  assert.equal(sanitized.githubIssueNumber, null);
});

test("legacy progress returns to the starter handoff before Issue logging", () => {
  const migrated = sanitizeProgress({
    version: 2,
    projectStatus: "ready",
    githubStatus: "connected",
    cloudflareStatus: "connected",
    currentStep: "idea",
    completedSteps: ["device", "project-folder", "github-account", "github-connect"],
  });

  assert.equal(migrated.currentStep, "starter-obtain");
  assert.equal(migrated.githubLogStatus, "not-started");
  assert.equal(migrated.setupGate, "pending");
});

test("version 7 progress keeps a fully prepared current step", () => {
  const migrated = sanitizeProgress({
    version: 7,
    os: "windows",
    ai: "claude",
    starterStatus: "ready",
    repositoryStatus: "private-ready",
    projectStatus: "ready",
    supportKitStatus: "ready",
    githubStatus: "connected",
    cloudflareStatus: "connected",
    githubLogStatus: "synced",
    currentStep: "idea",
    completedSteps: ["device", "project-folder", "github-account", "github-connect"],
    githubIssueNumber: 18,
  });

  assert.equal(migrated.version, 7);
  assert.equal(migrated.displayName, "");
  assert.equal(migrated.nameConsent, false);
  assert.equal(migrated.currentStep, "idea");
  assert.equal(migrated.githubIssueNumber, 18);
});

test("submit is the final step and old publishing progress restarts at safe setup", () => {
  assert.equal(stepOrder.at(-1), "submit");
  const migrated = sanitizeProgress({
    version: 4,
    displayName: "だいち",
    currentStep: "publish",
    completedSteps: ["device", "project-folder", "publish"],
  });

  assert.equal(migrated.version, 7);
  assert.equal(migrated.currentStep, "github-account");
  assert.ok(migrated.completedSteps.includes("publish"));
});

test("unconfirmed names are not retained in persisted progress", () => {
  const migrated = sanitizeProgress({
    version: 5,
    displayName: "だいち",
    nameConsent: false,
    currentStep: "device",
  });

  assert.equal(migrated.version, 7);
  assert.equal(migrated.displayName, "");
  assert.equal(migrated.nameConsent, false);
});

test("Drive submission and private Issue recording remain separate", () => {
  assert.equal(canRecordDriveIssue("synced", 12), true);
  assert.equal(canRecordDriveIssue("synced", null), false);
  assert.equal(canRecordDriveIssue("local-queued", 12), false);

  assert.equal(deriveDriveIssueRecordStatus("submitted", "synced", "local-queued", 12), "waiting");
  assert.equal(deriveDriveIssueRecordStatus("submitted", "synced", "synced", null), "waiting");
  assert.equal(deriveDriveIssueRecordStatus("submitted", "synced", "synced", 12), "synced");
  assert.equal(deriveDriveIssueRecordStatus("not-started", "synced", "synced", 12), "not-started");
});

test("Drive progress stores a safe filename but never stores a Drive URL", () => {
  const waiting = sanitizeProgress({
    version: 7,
    driveSubmissionStatus: "submitted",
    driveIssueRecordStatus: "synced",
    driveSubmissionFileName: "2026-08-23_だいち_成果物.zip",
    driveSubmissionUploadRoute: "connector",
    driveFileUrl: "https://drive.google.com/file/d/1Abcdefghij/view",
    githubLogStatus: "local-queued",
    githubIssueNumber: 12,
  });

  assert.equal(waiting.driveSubmissionStatus, "submitted");
  assert.equal(waiting.driveIssueRecordStatus, "waiting");
  assert.equal(waiting.driveSubmissionFileName, "2026-08-23_だいち_成果物.zip");
  assert.equal(waiting.driveSubmissionUploadRoute, "connector");
  assert.equal("driveFileUrl" in waiting, false);

  const synced = sanitizeProgress({
    ...waiting,
    githubLogStatus: "synced",
    driveIssueRecordStatus: "synced",
  });
  assert.equal(synced.driveIssueRecordStatus, "synced");
});

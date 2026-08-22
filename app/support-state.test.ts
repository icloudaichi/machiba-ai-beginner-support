import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveGate,
  initialProgress,
  nextConnectionStep,
  sanitizeProgress,
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
  assert.equal(nextConnectionStep(progress({ projectStatus: "not-ready" })), "project-folder");
  assert.equal(nextConnectionStep(progress({ projectStatus: "ready", githubStatus: "account-blocked" })), "github-account");
  assert.equal(nextConnectionStep(progress({ projectStatus: "ready", githubStatus: "connection-blocked" })), "github-connect");
  assert.equal(nextConnectionStep(progress({
    projectStatus: "ready",
    githubStatus: "connected",
    githubLogStatus: "not-started",
  })), "github-connect");
  assert.equal(nextConnectionStep(progress({
    projectStatus: "ready",
    githubStatus: "connected",
    githubLogStatus: "synced",
    cloudflareStatus: "account-blocked",
  })), "cloudflare-account");
  assert.equal(nextConnectionStep(progress({
    projectStatus: "ready",
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

test("sanitization keeps only enumerated progress and drops paths or account data", () => {
  const sanitized = sanitizeProgress({
    version: 3,
    os: "mac",
    ai: "chatgpt",
    projectStatus: "ready",
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
  assert.equal(sanitized.setupGate, "ready");
  assert.equal("projectPath" in sanitized, false);
  assert.equal("email" in sanitized, false);
  assert.equal("accountId" in sanitized, false);
  assert.equal(sanitized.githubIssueNumber, 42);
});

test("invalid issue numbers and unknown log states are discarded", () => {
  const sanitized = sanitizeProgress({
    githubLogStatus: "uploaded",
    githubIssueNumber: -7,
  });

  assert.equal(sanitized.githubLogStatus, "not-started");
  assert.equal(sanitized.githubIssueNumber, null);
});

test("version 2 progress returns to GitHub logging before later steps", () => {
  const migrated = sanitizeProgress({
    version: 2,
    projectStatus: "ready",
    githubStatus: "connected",
    cloudflareStatus: "connected",
    currentStep: "idea",
    completedSteps: ["device", "project-folder", "github-account", "github-connect"],
  });

  assert.equal(migrated.currentStep, "github-connect");
  assert.equal(migrated.githubLogStatus, "not-started");
  assert.equal(migrated.setupGate, "pending");
});

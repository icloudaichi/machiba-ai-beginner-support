import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const CLI_PATH = resolve(import.meta.dirname, "support-session.mjs");

async function run(command, args, { cwd, env = {} } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

async function makeFixture({ visibility = "PUBLIC", fail = false } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "machiba-support-test-"));
  const repo = resolve(root, "repo");
  const bin = resolve(root, "bin");
  const ghState = resolve(root, "gh-state.json");
  await mkdir(repo);
  await mkdir(bin);
  await writeFile(
    ghState,
    `${JSON.stringify({
      visibility,
      fail,
      repository: { id: "R_test_repository_1", nameWithOwner: "test-owner/test-repo" },
      issues: [],
      calls: [],
    })}\n`,
  );

  const gitInit = await run("git", ["init", "--initial-branch=main"], { cwd: repo });
  assert.equal(gitInit.code, 0);
  assert.equal(
    (await run("git", ["remote", "add", "origin", "https://github.com/test-owner/test-repo.git"], { cwd: repo })).code,
    0,
  );

  const fakeGh = `#!/usr/bin/env node
const fs = require("node:fs");
const path = process.env.FAKE_GH_STATE;
const state = JSON.parse(fs.readFileSync(path, "utf8"));
const args = process.argv.slice(2);
state.calls.push(args);
const save = () => fs.writeFileSync(path, JSON.stringify(state));
if (state.fail) { save(); process.exit(1); }
if (args[0] === "repo" && args[1] === "view") {
  save(); process.stdout.write(JSON.stringify({ ...state.repository, visibility: state.visibility })); process.exit(0);
}
if (args[0] === "issue" && args[1] === "list") {
  save(); process.stdout.write(JSON.stringify(state.issues.map(({ number, body }) => ({ number, body })))); process.exit(0);
}
if (args[0] === "issue" && args[1] === "create") {
  const title = args[args.indexOf("--title") + 1];
  const body = args[args.indexOf("--body") + 1];
  const issue = { number: state.issues.length + 1, title, body, state: "OPEN", comments: [] };
  state.issues.push(issue); save();
  process.stdout.write("https://example.invalid/very-secret-owner/very-secret-repo/issues/" + issue.number + "\\n"); process.exit(0);
}
if (args[0] === "issue" && args[1] === "view") {
  const issue = state.issues.find((candidate) => candidate.number === Number(args[2]));
  if (!issue) { save(); process.exit(1); }
  save(); process.stdout.write(JSON.stringify(issue)); process.exit(0);
}
if (args[0] === "issue" && args[1] === "comment") {
  const issue = state.issues.find((candidate) => candidate.number === Number(args[2]));
  const body = args[args.indexOf("--body") + 1];
  if (!issue) { save(); process.exit(1); }
  if (state.dropNextComment) {
    state.dropNextComment = false; save();
    process.stdout.write("https://example.invalid/very-secret-owner/very-secret-repo/issues/" + issue.number + "#comment\\n"); process.exit(0);
  }
  issue.comments.push({ body }); save();
  process.stdout.write("https://example.invalid/very-secret-owner/very-secret-repo/issues/" + issue.number + "#comment\\n"); process.exit(0);
}
if (args[0] === "issue" && args[1] === "close") {
  const issue = state.issues.find((candidate) => candidate.number === Number(args[2]));
  if (!issue) { save(); process.exit(1); }
  issue.state = "CLOSED"; save(); process.stdout.write("closed\\n"); process.exit(0);
}
save(); process.exit(1);
`;
  const fakeGhPath = resolve(bin, "gh");
  await writeFile(fakeGhPath, fakeGh);
  await chmod(fakeGhPath, 0o755);

  const env = {
    FAKE_GH_STATE: ghState,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
  };
  return { root, repo, ghState, env };
}

async function runCli(fixture, args) {
  const result = await run(process.execPath, [CLI_PATH, ...args], {
    cwd: fixture.repo,
    env: fixture.env,
  });
  assert.equal(result.stderr, "");
  return { ...result, json: JSON.parse(result.stdout) };
}

async function loadGhState(fixture) {
  return JSON.parse(await readFile(fixture.ghState, "utf8"));
}

async function makePushedCommit(fixture) {
  const remote = resolve(fixture.root, "remote.git");
  assert.equal((await run("git", ["init", "--bare", remote], { cwd: fixture.root })).code, 0);
  assert.equal((await run("git", ["config", "user.name", "Test User"], { cwd: fixture.repo })).code, 0);
  assert.equal((await run("git", ["config", "user.email", "test@example.invalid"], { cwd: fixture.repo })).code, 0);
  await writeFile(resolve(fixture.repo, "README.md"), "test\n");
  assert.equal((await run("git", ["add", "README.md"], { cwd: fixture.repo })).code, 0);
  assert.equal((await run("git", ["commit", "-m", "test"], { cwd: fixture.repo })).code, 0);
  assert.equal(
    (
      await run(
        "git",
        ["config", `url.file://${remote}.insteadOf`, "https://github.com/test-owner/test-repo.git"],
        { cwd: fixture.repo },
      )
    ).code,
    0,
  );
  assert.equal((await run("git", ["push", "-u", "origin", "main"], { cwd: fixture.repo })).code, 0);
  const sha = await run("git", ["rev-parse", "HEAD"], { cwd: fixture.repo });
  assert.equal(sha.code, 0);
  return sha.stdout.trim();
}

test("public repositories queue locally until --allow-public, then verify the Issue", async () => {
  const fixture = await makeFixture();
  const started = await runCli(fixture, ["start", "--goal", "接続準備を確認する"]);
  assert.equal(started.code, 2);
  assert.equal(started.json.github, "blocked-public");
  assert.equal(started.json.issueNumber, null);
  assert.equal((await loadGhState(fixture)).issues.length, 0);

  const localState = JSON.parse(
    await readFile(resolve(fixture.repo, ".git", "machiba-support-session", "session.json"), "utf8"),
  ).state;
  assert.equal(localState.phase, "active");
  assert.equal(localState.publicWriteAllowed, false);

  const synced = await runCli(fixture, ["sync", "--allow-public"]);
  assert.equal(synced.code, 0);
  assert.equal(synced.json.github, "synced");
  assert.equal(synced.json.issueNumber, 1);
  assert.equal(synced.stdout.includes("very-secret-owner"), false);
  assert.equal(synced.stdout.includes("very-secret-repo"), false);
  const ghState = await loadGhState(fixture);
  assert.equal(ghState.issues.length, 1);
  for (const call of ghState.calls.filter((candidate) => candidate[0] === "issue")) {
    assert.ok(call.includes("--repo"));
    assert.ok(call.includes("test-owner/test-repo"));
  }
});

test("--help works without a Git repository and documents only safe commands", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "machiba-support-help-"));
  const result = await run(process.execPath, [CLI_PATH, "--help"], { cwd: root });
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.command, "help");
  assert.equal(payload.usage.length, 6);
  assert.match(payload.publicRepository, /--allow-public/u);
});

test("events are read back and duplicate structured events are not posted twice", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "接続準備を確認する", "--allow-public"])).code, 0);

  const args = [
    "event",
    "--type",
    "success",
    "--step",
    "GitHub接続",
    "--summary",
    "接続を確認しました",
    "--next",
    "Cloudflare接続を確認します",
  ];
  const first = await runCli(fixture, args);
  const duplicate = await runCli(fixture, args);
  assert.equal(first.code, 0);
  assert.equal(first.json.issueNumber, 1);
  assert.equal(duplicate.code, 0);
  assert.equal(duplicate.json.duplicate, true);

  const state = await loadGhState(fixture);
  assert.equal(state.issues[0].comments.length, 1);
  assert.match(state.issues[0].comments[0].body, /machiba-support-event:/u);
  const viewCalls = state.calls.filter((call) => call[0] === "issue" && call[1] === "view");
  assert.ok(viewCalls.length >= 3);
});

test("resume restores the Issue and fingerprints in a new clone without public write permission", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "接続記録を残す", "--allow-public"])).code, 0);
  assert.equal(
    (
      await runCli(fixture, [
        "event",
        "--type",
        "success",
        "--step",
        "GitHub接続",
        "--summary",
        "接続を確認しました",
      ])
    ).code,
    0,
  );

  const newClone = resolve(fixture.root, "new-clone");
  await mkdir(newClone);
  assert.equal((await run("git", ["init", "--initial-branch=main"], { cwd: newClone })).code, 0);
  assert.equal(
    (await run("git", ["remote", "add", "origin", "https://github.com/test-owner/test-repo.git"], { cwd: newClone })).code,
    0,
  );
  const resumedFixture = { ...fixture, repo: newClone };
  const resumed = await runCli(resumedFixture, ["resume", "--issue", "1"]);
  assert.equal(resumed.code, 0);
  assert.equal(resumed.json.issueNumber, 1);

  const localState = JSON.parse(
    await readFile(resolve(newClone, ".git", "machiba-support-session", "session.json"), "utf8"),
  ).state;
  assert.equal(localState.syncedFingerprints.length, 1);
  assert.equal(localState.publicWriteAllowed, false);

  const queued = await runCli(resumedFixture, [
    "event",
    "--type",
    "info",
    "--step",
    "再開",
    "--summary",
    "別の作業場所から再開しました",
  ]);
  assert.equal(queued.code, 2);
  assert.equal(queued.json.github, "blocked-public");
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 1);
});

test("worktrees share session state through the common Git directory", async () => {
  const fixture = await makeFixture();
  await makePushedCommit(fixture);
  const worktree = resolve(fixture.root, "secondary-worktree");
  assert.equal((await run("git", ["worktree", "add", "-b", "secondary", worktree], { cwd: fixture.repo })).code, 0);
  assert.equal((await runCli(fixture, ["start", "--goal", "worktree間で再開する", "--allow-public"])).code, 0);

  const shared = await runCli({ ...fixture, repo: worktree }, ["status"]);
  assert.equal(shared.code, 0);
  assert.equal(shared.json.session, "active");
  assert.equal(shared.json.issueNumber, 1);
  await assert.rejects(readFile(resolve(worktree, ".git", "machiba-support-session", "session.json"), "utf8"));
});

test("a pushed full commit SHA is verified and linked in the structured comment", async () => {
  const fixture = await makeFixture();
  const sha = await makePushedCommit(fixture);
  assert.equal((await runCli(fixture, ["start", "--goal", "変更結果を記録する", "--allow-public"])).code, 0);
  const recorded = await runCli(fixture, [
    "event",
    "--type",
    "success",
    "--step",
    "コード変更",
    "--summary",
    "変更と確認が完了しました",
    "--commit",
    sha,
  ]);
  assert.equal(recorded.code, 0);
  const state = await loadGhState(fixture);
  assert.ok(state.issues[0].comments[0].body.includes(`関連コミット：${sha}`));

  await writeFile(resolve(fixture.repo, "README.md"), "not pushed\n");
  assert.equal((await run("git", ["add", "README.md"], { cwd: fixture.repo })).code, 0);
  assert.equal((await run("git", ["commit", "-m", "not pushed"], { cwd: fixture.repo })).code, 0);
  const unpushed = (await run("git", ["rev-parse", "HEAD"], { cwd: fixture.repo })).stdout.trim();
  const rejected = await runCli(fixture, [
    "event",
    "--type",
    "success",
    "--step",
    "追加変更",
    "--summary",
    "ローカルだけの変更です",
    "--commit",
    unpushed,
  ]);
  assert.equal(rejected.code, 1);
  assert.equal(rejected.json.code, "commit_not_pushed");
  assert.equal(rejected.stdout.includes(unpushed), false);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 1);
});

test("repository identity changes fail closed without leaking identity", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "接続準備", "--allow-public"])).code, 0);
  assert.equal(
    (
      await run("git", ["config", "remote.origin.url", "https://github.com/other-owner/other-repo.git"], {
        cwd: fixture.repo,
      })
    ).code,
    0,
  );
  const rejected = await runCli(fixture, [
    "event",
    "--type",
    "info",
    "--step",
    "確認",
    "--summary",
    "現在地を確認しました",
  ]);
  assert.equal(rejected.code, 1);
  assert.equal(rejected.json.code, "repository_mismatch");
  assert.equal(rejected.stdout.includes("other-owner"), false);
  assert.equal(rejected.stdout.includes("test-owner"), false);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 0);
});

test("repository immutable ID changes fail closed", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "接続準備", "--allow-public"])).code, 0);
  const ghState = await loadGhState(fixture);
  ghState.repository.id = "R_replaced_repository_2";
  await writeFile(fixture.ghState, JSON.stringify(ghState));
  const rejected = await runCli(fixture, [
    "event",
    "--type",
    "info",
    "--step",
    "確認",
    "--summary",
    "現在地を確認しました",
  ]);
  assert.equal(rejected.code, 1);
  assert.equal(rejected.json.code, "repository_mismatch");
  assert.equal(rejected.stdout.includes("R_replaced_repository_2"), false);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 0);
});

test("a comment is not marked synced until GitHub read-back confirms it", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "read-backを確認する", "--allow-public"])).code, 0);
  const ghState = await loadGhState(fixture);
  ghState.dropNextComment = true;
  await writeFile(fixture.ghState, JSON.stringify(ghState));

  const queued = await runCli(fixture, [
    "event",
    "--type",
    "success",
    "--step",
    "確認",
    "--summary",
    "安全な記録を確認しました",
  ]);
  assert.equal(queued.code, 2);
  assert.equal(queued.json.pending, 1);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 0);

  const synced = await runCli(fixture, ["sync"]);
  assert.equal(synced.code, 0);
  assert.equal(synced.json.pending, 0);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 1);
});

test("a disconnected gh queues safely and sync resumes later", async () => {
  const fixture = await makeFixture({ visibility: "PRIVATE", fail: true });
  const started = await runCli(fixture, ["start", "--goal", "ローカルで準備する"]);
  assert.equal(started.code, 2);
  assert.equal(started.json.github, "queued");

  const state = await loadGhState(fixture);
  state.fail = false;
  await writeFile(fixture.ghState, JSON.stringify(state));
  const synced = await runCli(fixture, ["sync"]);
  assert.equal(synced.code, 0);
  assert.equal((await loadGhState(fixture)).issues.length, 1);
});

test("complete posts a completion record, verifies it, and closes the Issue", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "初回準備", "--allow-public"])).code, 0);
  const completed = await runCli(fixture, ["complete", "--summary", "今日の準備が完了しました"]);
  assert.equal(completed.code, 0);
  assert.equal(completed.json.session, "completed");
  assert.equal(completed.json.issueNumber, 1);
  const state = await loadGhState(fixture);
  assert.equal(state.issues[0].state, "CLOSED");
  assert.match(state.issues[0].comments[0].body, /## 完了/u);
});

test("sensitive input is rejected without echo and is never queued", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, ["start", "--goal", "初回準備", "--allow-public"])).code, 0);
  const sensitive = "person@example.com";
  const rejected = await runCli(fixture, [
    "event",
    "--type",
    "failure",
    "--step",
    "認証",
    "--summary",
    sensitive,
  ]);
  assert.equal(rejected.code, 1);
  assert.equal(rejected.json.code, "unsafe_input");
  assert.equal(rejected.stdout.includes(sensitive), false);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 0);
});

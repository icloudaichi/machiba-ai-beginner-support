import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const CLI_PATH = resolve(import.meta.dirname, "support-session.mjs");
const DRIVE_SUBMISSION_FOLDER_ID = "1sEgVfferbokBUQU440bChvVYyGk338hs";

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

async function makeFixture({ visibility = "PRIVATE", fail = false } = {}) {
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

function startArgs(goal, ...extra) {
  return [
    "start",
    "--goal",
    goal,
    "--display-name",
    "だいち",
    "--confirm-display-name",
    ...extra,
  ];
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

test("public repositories reject confirmed names and consultation details even with --allow-public", async () => {
  const fixture = await makeFixture({ visibility: "PUBLIC" });
  const started = await runCli(fixture, startArgs("接続準備を確認する", "--allow-public"));
  assert.equal(started.code, 1);
  assert.equal(started.json.code, "private_repository_required");
  assert.equal(started.stdout.includes("だいち"), false);
  assert.equal((await loadGhState(fixture)).issues.length, 0);
});

test("--help works without a Git repository and documents only safe commands", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "machiba-support-help-"));
  const result = await run(process.execPath, [CLI_PATH, "--help"], { cwd: root });
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.command, "help");
  assert.equal(payload.usage.length, 9);
  assert.match(payload.publicRepository, /--allow-public/u);
  const artifactUsage = payload.usage.find((line) => line.includes(" artifact "));
  assert.match(artifactUsage, new RegExp(`--folder-id ${DRIVE_SUBMISSION_FOLDER_ID}`, "u"));
  assert.match(artifactUsage, /--parent-verified/u);
  assert.match(artifactUsage, /--read-back-verified/u);
});

test("start requires a participant-confirmed display name without echoing a rejected name", async () => {
  const fixture = await makeFixture();
  const missing = await runCli(fixture, ["start", "--goal", "相談記録を始める"]);
  assert.equal(missing.code, 1);
  assert.equal(missing.json.code, "display_name_confirmation_required");
  const displayName = "確認前の名前";
  const rejected = await runCli(fixture, [
    "start",
    "--goal",
    "相談記録を始める",
    "--display-name",
    displayName,
  ]);
  assert.equal(rejected.code, 1);
  assert.equal(rejected.json.code, "display_name_confirmation_required");
  assert.equal(rejected.stdout.includes(displayName), false);
  assert.equal((await loadGhState(fixture)).issues.length, 0);
});

test("private consultation sessions record and retrieve reusable structured history", async () => {
  const fixture = await makeFixture();
  const started = await runCli(fixture, startArgs("自分のアプリ公開について相談する"));
  assert.equal(started.code, 0);
  assert.equal(started.stdout.includes("だいち"), false);

  let ghState = await loadGhState(fixture);
  assert.match(ghState.issues[0].title, /^AI相談｜だいち｜\d{4}-\d{2}-\d{2}$/u);
  assert.ok(ghState.issues[0].body.includes("参加者の表示名：だいち"));
  assert.match(ghState.issues[0].body, /machiba-support-participant:[0-9a-f]{64}/u);

  const consultationArgs = [
    "consultation",
    "--consultation",
    "Cloudflareで自分のアプリを公開する順番を整理したい",
    "--background",
    "初めての公開作業で設定の役割を確認している",
    "--tried",
    "公開設定を開いて必要な接続項目を一つずつ確認した",
    "--failure",
    "保存先の準備が不足して設定を最後まで完了できなかった",
    "--solution",
    "保存先を先に準備してから公開設定をもう一度進めた",
    "--learning",
    "接続先を準備してから公開設定へ進むと迷いにくい",
    "--next",
    "公開前の確認項目を一つずつ試す",
  ];
  const recorded = await runCli(fixture, consultationArgs);
  assert.equal(recorded.code, 0);
  assert.equal(recorded.stdout.includes("Cloudflareで"), false);
  assert.equal(recorded.stdout.includes("だいち"), false);
  const duplicate = await runCli(fixture, consultationArgs);
  assert.equal(duplicate.code, 0);
  assert.equal(duplicate.json.duplicate, true);

  ghState = await loadGhState(fixture);
  assert.equal(ghState.issues[0].comments.length, 1);
  for (const label of ["相談内容", "背景", "試したこと", "起きたこと・失敗", "解決方法", "学び", "次の一手"]) {
    assert.ok(ghState.issues[0].comments[0].body.includes(`- ${label}：`));
  }

  assert.equal((await runCli(fixture, ["complete", "--summary", "今回の相談を終了する"])).code, 0);
  assert.equal((await runCli(fixture, startArgs("前回の学びを使って次の相談を始める"))).code, 0);
  const history = await runCli(fixture, ["history", "--query", "Cloudflare", "--limit", "3"]);
  assert.equal(history.code, 0);
  assert.equal(history.json.history.length, 1);
  assert.equal(history.json.history[0].issueNumber, 1);
  assert.match(history.json.history[0].solution, /保存先を先に準備/u);
  assert.match(history.json.history[0].learning, /迷いにくい/u);
  assert.equal(JSON.stringify(history.json).includes("だいち"), false);

  ghState = await loadGhState(fixture);
  ghState.issues[0].comments[0].body = ghState.issues[0].comments[0].body.replace(
    "保存先を先に準備してから公開設定をもう一度進めた",
    "後から書き換えられた解決方法",
  );
  await writeFile(fixture.ghState, JSON.stringify(ghState));
  const tampered = await runCli(fixture, ["history", "--query", "Cloudflare"]);
  assert.equal(tampered.code, 0);
  assert.equal(tampered.json.history.length, 0);

  ghState = await loadGhState(fixture);
  for (const call of ghState.calls.filter((candidate) => candidate[0] === "issue")) {
    assert.ok(call.includes("--repo"));
    assert.ok(call.includes("test-owner/test-repo"));
  }
});

test("private artifact records require Drive read-back and reject folder URLs", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, startArgs("成果物を提出して記録する"))).code, 0);
  const filename = "講座成果物.zip";
  const driveUrl = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing";
  const artifactArgs = [
    "artifact",
    "--filename",
    filename,
    "--folder-id",
    DRIVE_SUBMISSION_FOLDER_ID,
    "--parent-verified",
    "--drive-url",
    driveUrl,
    "--upload-route",
    "connector",
    "--read-back-verified",
    "--summary",
    "提出後にGoogle Driveからファイルを読み戻して内容を確認した",
    "--next",
    "講師へ確認を依頼する",
  ];
  const recorded = await runCli(fixture, artifactArgs);
  assert.equal(recorded.code, 0);
  assert.equal(recorded.stdout.includes(filename), false);
  assert.equal(recorded.stdout.includes(driveUrl), false);
  assert.equal(recorded.stdout.includes("だいち"), false);
  const duplicate = await runCli(fixture, artifactArgs);
  assert.equal(duplicate.code, 0);
  assert.equal(duplicate.json.duplicate, true);

  let ghState = await loadGhState(fixture);
  assert.equal(ghState.issues[0].comments.length, 1);
  const comment = ghState.issues[0].comments[0].body;
  assert.ok(comment.includes("## Google Drive成果物"));
  assert.ok(comment.includes(driveUrl));
  assert.ok(comment.includes("提出先：街場のAI屋さん・当日成果物フォルダ"));
  assert.ok(comment.includes("アップロード経路：connector"));
  assert.ok(comment.includes("親フォルダ確認：済"));
  assert.ok(comment.includes("Drive read-back確認：済（ファイル名・親フォルダ）"));
  assert.equal(comment.includes(DRIVE_SUBMISSION_FOLDER_ID), false);
  assert.match(comment, /machiba-support-participant:[0-9a-f]{64}/u);

  const noUrl = await runCli(fixture, [
    "artifact",
    "--filename",
    "確認メモ.pdf",
    "--folder-id",
    DRIVE_SUBMISSION_FOLDER_ID,
    "--parent-verified",
    "--upload-route",
    "browser",
    "--read-back-verified",
    "--summary",
    "ファイル名と読み戻し結果だけを記録する",
    "--next",
    "個別ファイルURLを確認できたら追加記録する",
  ]);
  assert.equal(noUrl.code, 0);
  ghState = await loadGhState(fixture);
  assert.ok(ghState.issues[0].comments[1].body.includes("未記録（ファイル名とread-back確認のみ）"));

  const folderUrl = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp";
  const rejectedFolder = await runCli(fixture, [
    "artifact",
    "--filename",
    "誤った提出.zip",
    "--folder-id",
    DRIVE_SUBMISSION_FOLDER_ID,
    "--parent-verified",
    "--drive-url",
    folderUrl,
    "--upload-route",
    "browser",
    "--read-back-verified",
    "--summary",
    "共有フォルダを指定してしまった",
    "--next",
    "個別ファイルURLを確認する",
  ]);
  assert.equal(rejectedFolder.code, 1);
  assert.equal(rejectedFolder.json.code, "invalid_drive_file_url");
  assert.equal(rejectedFolder.stdout.includes(folderUrl), false);

  const wrongDestinationId = "1WrongDestinationFolder1234567890";
  const wrongDestination = await runCli(fixture, [
    "artifact",
    "--filename",
    "別フォルダの成果物.zip",
    "--folder-id",
    wrongDestinationId,
    "--parent-verified",
    "--upload-route",
    "browser",
    "--read-back-verified",
    "--summary",
    "別の保存先を指定してしまった",
    "--next",
    "講座の提出先を確認する",
  ]);
  assert.equal(wrongDestination.code, 1);
  assert.equal(wrongDestination.json.code, "invalid_drive_submission_folder");
  assert.equal(wrongDestination.stdout.includes(wrongDestinationId), false);

  const missingDestination = await runCli(fixture, [
    "artifact",
    "--filename",
    "提出先未指定.zip",
    "--parent-verified",
    "--upload-route",
    "browser",
    "--read-back-verified",
    "--summary",
    "提出先の指定が不足した",
    "--next",
    "講座の提出先を確認する",
  ]);
  assert.equal(missingDestination.code, 1);
  assert.equal(missingDestination.json.code, "invalid_drive_submission_folder");

  const missingParentVerification = await runCli(fixture, [
    "artifact",
    "--filename",
    "親フォルダ未確認.zip",
    "--folder-id",
    DRIVE_SUBMISSION_FOLDER_ID,
    "--upload-route",
    "browser",
    "--read-back-verified",
    "--summary",
    "親フォルダの確認が不足した",
    "--next",
    "Driveのファイル情報を読み戻す",
  ]);
  assert.equal(missingParentVerification.code, 1);
  assert.equal(missingParentVerification.json.code, "drive_parent_verification_required");
  assert.equal(missingParentVerification.stdout.includes(DRIVE_SUBMISSION_FOLDER_ID), false);

  const missingReadBack = await runCli(fixture, [
    "artifact",
    "--filename",
    "未確認.zip",
    "--folder-id",
    DRIVE_SUBMISSION_FOLDER_ID,
    "--parent-verified",
    "--upload-route",
    "api",
    "--summary",
    "アップロードだけを実施した",
    "--next",
    "Driveから読み戻して確認する",
  ]);
  assert.equal(missingReadBack.code, 1);
  assert.equal(missingReadBack.json.code, "drive_read_back_required");
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 2);
});

test("events are read back and duplicate structured events are not posted twice", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, startArgs("接続準備を確認する"))).code, 0);

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

test("resume restores the Issue, participant, and fingerprints in a new clone", async () => {
  const fixture = await makeFixture();
  assert.equal((await runCli(fixture, startArgs("接続記録を残す"))).code, 0);
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
  assert.equal(localState.displayName, "だいち");

  const queued = await runCli(resumedFixture, [
    "event",
    "--type",
    "info",
    "--step",
    "再開",
    "--summary",
    "別の作業場所から再開しました",
  ]);
  assert.equal(queued.code, 0);
  assert.equal(queued.json.github, "synced");
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 2);
});

test("worktrees share session state through the common Git directory", async () => {
  const fixture = await makeFixture();
  await makePushedCommit(fixture);
  const worktree = resolve(fixture.root, "secondary-worktree");
  assert.equal((await run("git", ["worktree", "add", "-b", "secondary", worktree], { cwd: fixture.repo })).code, 0);
  assert.equal((await runCli(fixture, startArgs("worktree間で再開する"))).code, 0);

  const shared = await runCli({ ...fixture, repo: worktree }, ["status"]);
  assert.equal(shared.code, 0);
  assert.equal(shared.json.session, "active");
  assert.equal(shared.json.issueNumber, 1);
  await assert.rejects(readFile(resolve(worktree, ".git", "machiba-support-session", "session.json"), "utf8"));
});

test("a pushed full commit SHA is verified and linked in the structured comment", async () => {
  const fixture = await makeFixture();
  const sha = await makePushedCommit(fixture);
  assert.equal((await runCli(fixture, startArgs("変更結果を記録する"))).code, 0);
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
  assert.equal((await runCli(fixture, startArgs("接続準備"))).code, 0);
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
  assert.equal((await runCli(fixture, startArgs("接続準備"))).code, 0);
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
  assert.equal((await runCli(fixture, startArgs("read-backを確認する"))).code, 0);
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
  assert.equal(synced.code, 0, JSON.stringify(synced.json));
  assert.equal(synced.json.pending, 0);
  assert.equal((await loadGhState(fixture)).issues[0].comments.length, 1);
});

test("a disconnected gh queues safely and sync resumes later", async () => {
  const fixture = await makeFixture({ visibility: "PRIVATE", fail: true });
  const started = await runCli(fixture, startArgs("ローカルで準備する"));
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
  assert.equal((await runCli(fixture, startArgs("初回準備"))).code, 0);
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
  assert.equal((await runCli(fixture, startArgs("初回準備"))).code, 0);
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

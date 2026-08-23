import assert from "node:assert/strict";
import test from "node:test";
import {
  COURSE_EVENT_DATE,
  GOOGLE_DRIVE_SUBMISSION_FOLDER_ID,
  GOOGLE_DRIVE_SUBMISSION_FOLDER_URL,
  SUPPORT_REPOSITORY_URL,
  SUPPORT_SITE_URL,
  SUPPORT_SKILL_URL,
  withOfficialContext,
} from "./support-context.ts";

test("official context points to the public guide, repository, and canonical skill", () => {
  const prompt = withOfficialContext("github-connect/session-log", "制作スレッド", "次の一つを案内してください。");

  assert.match(prompt, new RegExp(SUPPORT_SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, new RegExp(SUPPORT_REPOSITORY_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, new RegExp(SUPPORT_SKILL_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /現在のSTEP ID：github-connect\/session-log/);
  assert.match(prompt, /貼り付け先：制作スレッド/);
});

test("submission folder points to the course Google Drive folder", () => {
  assert.equal(GOOGLE_DRIVE_SUBMISSION_FOLDER_ID, "1sEgVfferbokBUQU440bChvVYyGk338hs");
  assert.equal(
    GOOGLE_DRIVE_SUBMISSION_FOLDER_URL,
    "https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs",
  );
  assert.equal(COURSE_EVENT_DATE, "2026-08-23");
});

test("official context requires useful consultation history without raw secrets", () => {
  const prompt = withOfficialContext("starter", "制作スレッド", "変更してください。");

  assert.match(prompt, /参加者名（表示名）/);
  assert.match(prompt, /相談内容/);
  assert.match(prompt, /試したこと/);
  assert.match(prompt, /解決方法/);
  assert.match(prompt, /学び/);
  assert.match(prompt, /後から同じ問題を解決できる具体さ/);
  assert.match(prompt, /会話全文をそのまま転載せず/);
  assert.match(prompt, /再読み取りして確認/);
  assert.match(prompt, /ローカル待機/);
  assert.match(prompt, /記録できたふりをしない/);
  assert.match(prompt, /パスワード/);
  assert.match(prompt, /コマンドやエラーの生出力/);
});

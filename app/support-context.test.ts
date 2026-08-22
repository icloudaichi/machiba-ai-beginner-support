import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("official context requires verified GitHub logging without raw conversation data", () => {
  const prompt = withOfficialContext("starter", "制作スレッド", "変更してください。");

  assert.match(prompt, /会話全文ではなく/);
  assert.match(prompt, /再読み取りして確認/);
  assert.match(prompt, /ローカル待機/);
  assert.match(prompt, /記録できたふりをしない/);
  assert.match(prompt, /パスワード/);
  assert.match(prompt, /コマンドの生出力/);
});

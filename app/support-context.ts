export const SUPPORT_SITE_URL = "https://machiba-ai-beginner-guide.daichi-dev.workers.dev/";
export const SUPPORT_REPOSITORY_URL = "https://github.com/icloudaichi/machiba-ai-beginner-support";
export const SUPPORT_SKILL_URL =
  "https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md";

export type PromptTarget = "AI相談室" | "制作スレッド";

export function withOfficialContext(stepId: string, target: PromptTarget, instruction: string) {
  return `これは「街場のAI屋さん」の公式サポート手順です。

参加者向けガイド：
${SUPPORT_SITE_URL}

教材・スキルの正本：
${SUPPORT_REPOSITORY_URL}

AI向けサポート手順：
${SUPPORT_SKILL_URL}

現在のSTEP ID：${stepId}
貼り付け先：${target}

URLを読める場合は、上の公式資料を確認してください。読めない場合は、確認できなかったことを伝え、読んだふりをせず、この文章の指示だけで進めてください。

このプロジェクトに scripts/support-session.mjs がある場合は、現在のGitHub記録状態を安全に確認してください。記録が開始済みなら、操作結果が確定するたびに、会話全文ではなく「STEP ID・成功／失敗／保留・短い要約・次にする一つ」だけをセッションIssueへ記録し、書き込んだ内容を再読み取りして確認してください。GitHubへ書けない場合はローカル待機として残し、記録できたふりをしないでください。メールアドレス、ユーザー名、Account ID、ファイルの絶対パス、コマンドの生出力、パスワード、認証コード、トークン、秘密鍵、顧客情報は記録・表示しないでください。

${instruction}`;
}

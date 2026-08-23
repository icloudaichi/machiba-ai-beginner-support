export const SUPPORT_SITE_URL = "https://machiba-ai-beginner-guide.daichi-dev.workers.dev/";
export const SUPPORT_REPOSITORY_URL = "https://github.com/icloudaichi/machiba-ai-beginner-support";
export const STARTER_ZIP_URL = `${SUPPORT_REPOSITORY_URL}/archive/refs/heads/main.zip`;
export const SUPPORT_SKILL_URL =
  "https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md";
export const REPOSITORY_NAME_BASE = "machiba-ai-app";
export const REPOSITORY_NAME_EXAMPLE = REPOSITORY_NAME_BASE;
export const REPOSITORY_NAME_FALLBACKS = [`${REPOSITORY_NAME_BASE}-2`, `${REPOSITORY_NAME_BASE}-3`] as const;
export const GOOGLE_DRIVE_SUBMISSION_FOLDER_ID = "1sEgVfferbokBUQU440bChvVYyGk338hs";
export const GOOGLE_DRIVE_SUBMISSION_FOLDER_URL =
  `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_SUBMISSION_FOLDER_ID}`;
export const COURSE_EVENT_DATE = "2026-08-23";

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

相談用表示名は日本語も使えるニックネーム、GitHubのrepo名は別のASCII技術名です。本名、相談用表示名、メールアドレスをrepo名へ入れないでください。

このプロジェクトに scripts/support-session.mjs がある場合は、現在のGitHub記録状態を安全に確認してください。この端末の進捗用に呼び名が保存されていても、それだけではprivate Issueへ保存しません。記録開始時は、private Issueへの保存を本人が別途了承した相談用表示名だけを使ってください。記録が開始済みなら、意味のある相談や操作の結果が確定するたびに、会話全文をそのまま転載せず、「STEP ID・相談内容・状況や目的・試したこと・成功／失敗／保留・解決方法・学び・次にする一つ」のうち該当する項目を、後から同じ問題を解決できる具体さでセッションIssueへ記録してください。書き込んだ内容は同じIssueから再読み取りして確認してください。GitHubへ書けない場合はローカル待機として残し、記録できたふりをしないでください。相談用表示名以外の個人情報、メールアドレス、GitHubユーザー名、Account ID、ファイルの絶対パス、コマンドやエラーの生出力、パスワード、認証コード、トークン、秘密鍵、顧客情報は記録・表示しないでください。

${instruction}`;
}

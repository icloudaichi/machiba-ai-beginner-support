# 街場のAI屋さん｜初心者向け標準ガイド

AI・GitHub・Cloudflareを初めて知る人へ向けた、公開の学習・サポートリポジトリです。A4縦型のカリキュラム解説サイトと、本人が選び保存を了承したニックネームに紐づく相談・失敗・解決・学びを参加者自身のprivate GitHub repoへ安全に残すサポートスキルを収録しています。

## 公式URL

- サポートサイト：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/>
- 講座後ガイド：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/after-course>
- 投影スライド：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/lesson>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- AI向けスキル：<https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md>

## 内容

- Googleアカウントを最初の前提として案内
- ChatGPTデスクトップ＋Codexを基本に、Claudeデスクトップ＋Claude Codeも紹介
- GitHub、Cloudflare、D1の役割を身近な言葉で説明
- 対象プロジェクトを開いたCodex／Claude CodeによるAI相談室
- 1相談案件1 Issueの、再利用できる相談・失敗・解決・学び
- 2026年8月23日のGoogle Drive成果物提出とprivate Issueへの確認記録
- 音声で作りたいものを話す6項目
- 2026年8月23日の5時間カリキュラム
- 安全上の注意、持ち物、初心者向けQ&A

## AIにセットアップを相談する

初心者サポートは、対象プロジェクトを開いたCodexまたはClaude CodeのスレッドそのものをAI相談室として使います。標準の開始順は、GitHubアカウントとPC接続の確認、スターター取得、参加者自身のprivate GitHub repo作成・Git初期化・`main`・`origin`・初回push、制作AIでそのrepoを開く、同梱`support-session`のhelp確認、ニックネームの保存了承とIssue開始、Cloudflare接続です。相談内容、背景、試したこと、失敗、解決方法、学び、次の一手を構造化し、次の相談で再利用します。

参加者向けサイトで最初に確認するニックネームは、この端末の進捗表示に使います。private Issueへ同じ名前を保存するかは、正しいprivate repoと記録ツールを確認した後、見える相手を説明して別に了承を取ります。

同じcloneやその別worktreeでは`status`から続けられます。別cloneまたはローカル状態を失った場合は、明示されたIssue番号を`resume --issue`へ渡し、GitHubから再開します。似たIssueを推測で選びません。

- Codex：`$machiba-beginner-support`を使う
- Claude Code：`/machiba-beginner-support`を使う
- 標準開始文：[AI相談室の開始プロンプト](./docs/participants/adviser-room-prompt.md)を貼り付ける

質問例：

```text
$machiba-beginner-support を使って、このprivate repoの初回pushと同梱support-sessionを確認した後、私が選ぶニックネームの保存了承を取り、相談履歴を始めてください。
```

ここでいう接続は、GitHubとCloudflareを直接つなぐことではありません。

- PC・CodexまたはClaude CodeからGitHubへ接続できること
- 対象プロジェクトからWranglerでCloudflareへ接続できること

D1作成や公開は、最初の接続確認が終わった後の工程です。標準プロンプトが継続して許可するのは、本人が選び保存を了承したニックネーム、安全な相談履歴、read-back済み成果物提出結果のprivate Issueへの作成・追記・検索・read-backと、目的完了時のIssue closeだけです。コード変更、collaborator招待、merge、Cloudflare公開、Google Driveへのアップロードは含みません。

2026年8月23日の成果物は、[受講者共有用Google Driveフォルダ](https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs)へ提出します。リンク所持者が閲覧・追加できるため、標準はブラウザからの手動アップロードとし、接続承認とアップロード承認を分けます。Driveで親とファイル名を確認できた状態と、private Issueで提出記録をread-backできた状態も分けて報告します。2026年8月23日18:00の講座終了後、運営は新規追加を止めるため共有権限を見直します。詳しくは[成果物提出ガイド](./docs/participants/drive-submission.md)を確認してください。

普通のChatGPT・Claudeは用語説明や目的整理だけに使い、GitHubコネクタの有無にかかわらず、この自動相談履歴は作りません。接続済み・記録済みと推測させないでください。

詳しい使い方は[公開サポート資料](./docs/README.md)を確認してください。

講座用スターターを作る運営者は、[配布スターターへのサポートキット同梱](./docs/operations/starter-support-kit.md)に従い、記録ツールとCodex／Claude Code向けスキルを同じ版で配布してください。公開repoに置いただけでは、参加者のプロジェクトへ自動導入されません。

## Codex・Claude Codeで共同編集する

このリポジトリの`main`は公開中の確定版です。CodexとClaude Codeは、それぞれ別のブランチと別のworktreeで作業します。変更はDraft Pull Requestで共有し、`npm test`、差分レビュー、squash mergeを終えてから`main`へ取り込みます。直接`main`へpushしません。

- Codexのブランチ：`codex/<Issue番号または短い説明>`
- Claude Codeのブランチ：`claude/<Issue番号または短い説明>`
- Pull Requestテンプレート：`.github/PULL_REQUEST_TEMPLATE.md`
- 自動確認：`.github/workflows/validate.yml`
- 詳しい作業手順：[共同編集の進め方](./CONTRIBUTING.md)

同じworktreeを複数のAIで共有せず、作業開始時とcommit前に`git status`を確認します。担当外の変更は削除、上書き、巻き戻しません。merge後のCloudflare deployは別工程であり、明示された場合だけ行います。

## 安全

パスワード、認証コード、トークン、秘密鍵、カード情報、会話全文、コマンドの生出力、保存了承済みニックネーム以外の個人情報をチャットやIssueへ入れないでください。Drive提出ZIPにも`.env`、`node_modules`、`.wrangler`、個人・顧客データを入れません。参加者のニックネーム、相談履歴、提出記録は、本人了承後に本人のprivate app repoへ保存し、この公開教材repoへは投稿しません。詳しくは[安全に使うために](./SECURITY.md)を確認してください。

## ローカル確認

```bash
npm install
npm run dev
npm run lint
npm run build
```

Cloudflareへの公開前確認と本番公開は、次のコマンドで行います。

```bash
npm run deploy:cloudflare:dry-run
npm run deploy:cloudflare
```

画面右上の「A4で印刷」から、各ページをA4縦で印刷またはPDF保存できます。

## 編集する場所

- 本文：`app/page.tsx`
- 見た目・印刷設定：`app/globals.css`
- ページ情報：`app/layout.tsx`
- 共有画像：`public/og.png`
- Codex向け初心者サポート：`.agents/skills/machiba-beginner-support/`
- Claude Code向け入口：`.claude/skills/machiba-beginner-support/`
- 公開サポート資料：`docs/`
- Codex・Claude Code共同編集：[CONTRIBUTING.md](./CONTRIBUTING.md)

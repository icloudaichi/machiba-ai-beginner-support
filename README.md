# 街場のAI屋さん｜初心者向け標準ガイド

AI・GitHub・Cloudflareを初めて知る人へ向けた、公開の学習・サポートリポジトリです。A4縦型のカリキュラム解説サイトと、参加者自身のGitHubへ成功・失敗・次の一手を安全に記録する初心者サポートスキルを収録しています。

## 公式URL

- サポートサイト：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- AI向けスキル：<https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md>

## 内容

- Googleアカウントを最初の前提として案内
- ChatGPTデスクトップ＋Codexを基本に、Claudeデスクトップ＋Claude Codeも紹介
- GitHub、Cloudflare、D1の役割を身近な言葉で説明
- 対象プロジェクトを開いたCodex／Claude CodeによるAI相談室
- 1相談案件1 Issueの安全な成功・失敗ログ
- 音声で作りたいものを話す6項目
- 2026年8月23日の5時間カリキュラム
- 安全上の注意、持ち物、初心者向けQ&A

## AIにセットアップを相談する

初心者サポートは、対象プロジェクトを開いたCodexまたはClaude Codeで使います。最初に長いレベル確認をせず、GitHub接続を確認した後、参加者自身の非公開アプリrepoに1つの進行中の相談案件につき1 Issueを作成・再開します。その後、Cloudflare接続を一つずつ確認し、成功・失敗・次の一手を構造化して記録します。

同じcloneやその別worktreeでは`status`から続けられます。別cloneまたはローカル状態を失った場合は、明示されたIssue番号を`resume --issue`へ渡し、GitHubから再開します。似たIssueを推測で選びません。

- Codex：`$machiba-beginner-support`を使う
- Claude Code：`/machiba-beginner-support`を使う
- 標準開始文：[AI相談室の開始プロンプト](./docs/participants/adviser-room-prompt.md)を貼り付ける

質問例：

```text
$machiba-beginner-support を使って、このプロジェクトのGitHub記録を始め、接続準備から一操作ずつ案内してください。
```

ここでいう接続は、GitHubとCloudflareを直接つなぐことではありません。

- PC・CodexまたはClaude CodeからGitHubへ接続できること
- 対象プロジェクトからWranglerでCloudflareへ接続できること

D1作成や公開は、最初の接続確認が終わった後の工程です。標準プロンプトが継続して許可するのは、安全なセッションIssueの作成・追記・read-backと、目的完了時のIssue closeだけです。コード変更、merge、Cloudflare公開は含みません。

普通のChatGPT・Claudeは用語説明や目的整理だけに使い、GitHubコネクタの有無にかかわらず、この自動セッション記録は行いません。接続済み・記録済みと推測させないでください。

詳しい使い方は[公開サポート資料](./docs/README.md)を確認してください。

講座用スターターを作る運営者は、[配布スターターへのサポートキット同梱](./docs/operations/starter-support-kit.md)に従い、記録ツールとCodex／Claude Code向けスキルを同じ版で配布してください。公開repoに置いただけでは、参加者のプロジェクトへ自動導入されません。

## 安全

パスワード、認証コード、トークン、秘密鍵、カード情報、個人情報、会話全文、コマンドの生出力をチャットやIssueへ入れないでください。参加者ログは参加者自身のprivate app repoへ保存し、この公開教材repoへは投稿しません。詳しくは[安全に使うために](./SECURITY.md)を確認してください。

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

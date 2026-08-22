# 街場のAI屋さん｜初心者向け標準ガイド

AI・GitHub・Cloudflareを初めて知る人へ向けた、公開の学習・サポートリポジトリです。A4縦型のカリキュラム解説サイトと、質問スレッドで使える初心者サポートスキルを収録しています。

## 内容

- Googleアカウントを最初の前提として案内
- ChatGPTデスクトップ＋Codexを基本に、Claudeデスクトップ＋Claude Codeも紹介
- GitHub、Cloudflare、D1の役割を身近な言葉で説明
- AI相談室と制作室の使い分け
- 音声で作りたいものを話す6項目
- 2026年8月23日の5時間カリキュラム
- 安全上の注意、持ち物、初心者向けQ&A

## AIにセットアップを相談する

初心者サポートは、最初に長いレベル確認をせず、PCからGitHubとCloudflareへ接続できる状態かを一つずつ確認します。両方の準備後、実際の操作の様子から説明の細かさを提案します。

- Codex：`$machiba-beginner-support`を使う
- Claude Code：`/machiba-beginner-support`を使う
- 普通のAIチャット：[AI相談室の初期プロンプト](./docs/participants/adviser-room-prompt.md)を貼り付ける

質問例：

```text
$machiba-beginner-support を使って、GitHubとCloudflareの接続準備から一つずつ確認してください。
```

ここでいう接続は、GitHubとCloudflareを直接つなぐことではありません。

- PC・CodexまたはClaude CodeからGitHubへ接続できること
- 対象プロジェクトからWranglerでCloudflareへ接続できること

D1作成や公開は、最初の接続確認が終わった後の工程です。

詳しい使い方は[公開サポート資料](./docs/README.md)を確認してください。

## 安全

パスワード、認証コード、トークン、秘密鍵、カード情報、個人情報をチャットやリポジトリへ入れないでください。詳しくは[安全に使うために](./SECURITY.md)を確認してください。

## ローカル確認

```bash
npm install
npm run dev
npm run lint
npm run build
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

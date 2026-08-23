---
name: machiba-beginner-support
description: 対象プロジェクトを開いたCodexまたはClaude Codeで、本人確認済みの表示名に紐づく相談・失敗・解決・学び・成果物提出をprivate repoの1相談案件1 Issueへ記録し、過去履歴を再利用しながら初心者を伴走する。普通のAIチャットでは自動記録しない。
---

# 街場のAI屋さん・初心者サポート

対象プロジェクトを開いたCodexまたはClaude Codeのスレッド自体を、標準の「AI相談室」として使う。相談室と制作担当を別チャットに分けず、同じprivate app repoの相談履歴を読み書きしながら、一操作ずつ説明・制作・再開を行う。

## 正本

- 参加者向けサイト：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- このスキルの公開版：<https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md>

公開版を読めない場合は読めたふりをせず、プロジェクト内のこのスキルを正本として使う。

## 開始順

長い経験確認から始めない。会話またはプロジェクトから分かる項目は聞き直さず、次の順で進める。

1. スターター取得済みで、参加者自身のprivate GitHub repoとしてGit初期化、`main`、`origin`、初回pushまで確認済みかを確かめる。未完了なら、CloudflareやIssueへ進まず一つずつ準備する。
2. CodexまたはClaude Codeが、そのprivate repoのフォルダを開いていることを確認する。公開教材repoや別repoなら停止する。
3. PCからGitHubへ接続できるか、安全な読み取り確認をする。
4. `scripts/support-session.mjs`とローカルスキルが同梱されているか確認し、`node scripts/support-session.mjs --help`を実行する。helpにないコマンドや引数を推測しない。
5. 相談履歴に保存する表示名だけを尋ねる。本名は不要で、private repoのcollaboratorにも見えると説明する。
6. 表示名を聞き取ったら、その名前をprivate repoへ保存してよいか明確に確認する。
7. 限定承認を確認し、`status`で進行中の相談を確認する。なければ本人確認済み表示名でIssueを開始し、別cloneで状態を失った場合だけ明示されたIssue番号から再開する。書き込み後はGitHubからread-backする。
8. Issueをread-backできた後で、対象プロジェクトからCloudflareへ接続できるか安全に確認する。未接続なら一度に一操作だけ案内する。
9. 相談内容と背景を一項目ずつ確認し、過去の同じ表示名の相談履歴に似た失敗・解決がないか調べる。
10. 接続中に見えた具体的な操作から案内方法を提案し、相談・制作を同じスレッドで進める。
11. 成果物提出を希望した場合だけ、共有範囲と提出用表示名を別に確認し、ブラウザからGoogle Driveへ提出する。本人が希望し、時間と環境が許す場合は、Google公式OAuth／公式コネクタによるAI提出を発展として一操作ずつ案内できる。

接続の意味と無出力の確認方法は、確認するときだけ[接続確認](references/connection-check.md)を読む。GitHubとCloudflareを直接つなぐ設定ではない。

## GitHubを外部記憶にする

1つの進行中の相談案件につき、参加者自身の**非公開アプリリポジトリ**に1つのIssueを使う。1つのrepoでは同時に1つのサポートセッションだけを進行させる。同じ相談を別のCodex／Claude Codeスレッドや同一cloneの別worktreeで続ける場合は、同じIssueを再利用し、重複作成しない。完了後に別の目的を始める場合だけ、新しいIssueを作る。

本人が確認した表示名、相談内容、背景、試したこと、失敗、解決方法、学び、次の一手を、分かった時点で構造化して継続記録する。過去の失敗と解決を、同じ本人の次の相談で再利用できる「相談履歴」にする。

会話全文、思考過程、コマンドの生出力、ファイル全文、ローカルパス、メールアドレス、認証コード、アカウントID、秘密情報は記録しない。表示名以外の個人情報を保存しない。

記録項目、表示名確認、履歴再利用は[相談履歴](references/consultation-history.md)を読む。限定承認、read-back、commit連携は[GitHubセッション記録](references/github-session-recording.md)を読む。成果物を提出するときだけ[Google Driveへの成果物提出](references/drive-submission.md)を読む。

- 標準開始プロンプトの限定承認は、本人確認済み表示名、安全な相談履歴、別途承認済みでread-backできた成果物提出結果を、参加者自身のprivate app repoにある1つのIssueへ作成・再開・追記・read-backし、目的完了時にcloseすることを継続して許可する。
- この承認はコード変更、merge、Cloudflare公開、Google Driveへのアップロード、外部送信を許可しない。
- コード変更を本人が依頼した場合だけ、その依頼範囲のcommit・pushを行い、remoteで確認できたcommit SHAをIssueへ記録する。
- mergeとdeployは別の明示的な依頼があるまで行わない。
- 表示名を含む相談履歴は公開リポジトリへ作らない。対象がpublicならprivate repoの準備へ戻る。
- 公開教材リポジトリは、参加者ログではなく教材改善Issueだけを受け付ける。

## 自動記録ツール

対象プロジェクトに`scripts/support-session.mjs`がある場合だけ、最初に`node scripts/support-session.mjs --help`を読み、表示されたコマンドと引数だけを使う。

- 表示名付きで開始：`node scripts/support-session.mjs start --goal "目的" --display-name "本人確認済み表示名" --confirm-display-name`
- 別cloneで再開：`node scripts/support-session.mjs resume --issue "Issue番号"`
- 現在地：`node scripts/support-session.mjs status`
- 補助的な状態変化：`node scripts/support-session.mjs event --type success|failure|blocked|info --step "対象工程" --summary "短い要約" --next "次の一つ" [--commit "push済みの40桁full SHA"]`
- 相談履歴：`node scripts/support-session.mjs consultation --consultation "相談内容" [--background "背景"] [--tried "試したこと"] [--failure "失敗"] [--solution "解決方法"] [--learning "学び"] --next "次の一つ" [--commit "push済みの40桁full SHA"]`
- 成果物提出：`node scripts/support-session.mjs artifact --filename "確認済みファイル名" --folder-id "1sEgVfferbokBUQU440bChvVYyGk338hs" --parent-verified [--drive-url "read-back済みの個別ファイルURL"] --upload-route browser|connector|api --read-back-verified --summary "確認結果" --next "次の一つ"`
- 過去履歴：`node scripts/support-session.mjs history --query "相談語" [--limit "1から10"]`
- 完了：`node scripts/support-session.mjs complete --summary "短い完了要約" [--commit "push済みの40桁full SHA"]`
- 未反映分の再同期：`node scripts/support-session.mjs sync`

同一cloneのworktreeはGit共通領域の状態を共有するため、最初に`status`を使う。別cloneまたはローカル状態消失時は、本人が示したIssue番号だけを`resume --issue`へ渡す。タイトルが似たIssueを推測で選ばない。安全なJSON出力に含まれるIssue番号は再開に使ってよいが、owner、repo URL、個人情報は出力しない。

表示名付き`start`、`consultation`、`artifact`、`history`、表示名付きセッションの`resume`はprivate repoだけで使う。公開repoでは標準の相談記録を開始・再開しない。

終了コード`0`はGitHub read-back済みまたは履歴読取済み、`2`はローカル保存済みだがGitHub未確認、`1`は入力・状態・private repo条件のエラーとして扱う。

ツールが存在しない、実行できない、または`--help`とこの説明が一致しない場合は、コマンドを推測しない。「自動記録ツールを利用できない」と伝え、GitHubへ記録できたふりをせず、[再開カード](references/resume-card.md)をローカルな引き継ぎ用に作る。

## 毎回の返答

原則として、一度に一問または一操作だけ提示する。

```text
記録状態：未開始／記録済み／未反映
表示名：未確認／確認済み
GitHub：未確認／準備中／接続済み
Cloudflare：未確認／準備中／接続済み
Google Drive提出：未準備／確認待ち／アップロード中／Drive確認済み
GitHub提出記録：未記録／同期待ち／Issue確認済み

今の状況：
次にすること：一つだけ
うまくいけば表示されるもの：
終わったら教えてほしいこと：一つだけ
```

必要に応じて「できました」「画面が違います」「エラーが出ました」「分かりません」を示す。

## 準備後の案内方法

接続中に確認できた操作は聞き直さない。コピー、メール認証、フォルダ操作、表示共有、結果報告のうち、不足する具体的な動作だけを一問ずつ確認する。準備完了後にだけ[案内方法](references/interview-routing.md)を読み、本人へ提案する。人をレベル番号で呼ばない。

## 安全と停止条件

- 表示名は本人へ用途と閲覧範囲を説明し、明確な了承後だけprivate repoへ保存する。メールアドレスやアカウントIDを表示名にしない。
- パスワード、認証コード、トークン、秘密鍵、カード情報、表示名以外の個人情報を要求・保存・復唱しない。
- 接続診断は標準出力と標準エラーを捨て、終了コードだけで判定する。
- GitHubへの書き込み後は必ずread-backし、読めなければ「未反映」とする。
- Google Driveへの提出はブラウザを標準とする。コネクタ/APIを初回講座の必須設定にしない。本人が発展として希望した場合は、使用中のAIとOSを確認し、Google公式OAuth／公式コネクタを一操作ずつ案内する。
- Drive接続の権限画面ごとに目的、アクセス範囲、影響を説明し、本人の確認を得る。APIキー、認証コード、トークンを貼らせない。画面名を固定せず、現在の表示を確認する。
- 同じ接続操作で3回または約7分止まったら、接続を必須にせずブラウザ提出へ戻る。接続の承認をアップロードの承認として扱わない。
- Drive書き込み前に対象ファイル、提出先、共有範囲への影響を説明し、GitHub記録とは別に本人の明確な了承を得る。
- 提出用表示名は共有フォルダ内の参加者やリンク所持者にも見えると説明し、private Issue用表示名とは別にファイル名への使用を確認する。
- 提出先は指定された「受講者共有用」フォルダへ固定し、自分のファイルの新規追加だけを行う。既存ファイルや共有権限を変更しない。
- アップロード後は一覧またはメタデータをread-backし、確認できなければ「提出済み」としない。Drive URLを推測しない。
- `.env`、秘密鍵、`node_modules`、`.wrangler`、個人・顧客データを成果物ZIPへ含めない。
- 同じ場所で2回止まったら、秘密情報を除いた表示を確認する。
- 3回または約7分止まったら推測を止め、Issueへ`blocked`を記録する。Issueへ書けない場合は再開カードを作る。
- 認証で進めない場合は、ローカルのスターター変更へ切り替えられることを案内する。

事故対応と引き継ぎでは[安全と引き継ぎ](references/safety-and-escalation.md)を読む。

## 普通のChatGPT・Claude

普通のChatGPT・Claudeは説明専用とし、GitHubコネクタの有無にかかわらず、この自動相談履歴を作らない。用語説明、目的整理、次の一問、対象repoを開いたCodex／Claude Codeへ渡す文章の作成だけを行う。GitHub接続を確認した、自動記録した、Issueを再開したとは言わない。

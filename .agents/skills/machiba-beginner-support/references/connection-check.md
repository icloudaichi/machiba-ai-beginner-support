# 接続確認

## 原則

- 最初にOSと対象プロジェクトを確認する。
- 接続状態の確認は読み取りだけで行う。
- コマンドをまとめて実行せず、GitHub、Cloudflareの順に確認する。
- 成功した段階をやり直さない。
- 既定の診断では標準出力と標準エラーを両方捨て、終了コードだけを使う。
- ユーザー名、メールアドレス、アカウントIDをAIのツール実行記録へ出さない。
- 失敗時も、同じコマンドを出力ありで再実行しない。
- `npx`で未導入のパッケージを自動取得しない。導入は説明と本人確認を挟む。

## GitHub

状態は次の語で整理する。

```text
未確認 → アカウント確認済み → メール認証確認済み
       → GitHub CLI利用可能 → PCから接続済み
```

ただし、`gh auth status`で有効な接続を確認できた場合、途中の質問を繰り返さず「接続済み」としてよい。

### 安全な確認

1. GitHub CLIが利用可能か、出力を表示せず終了コードだけで確認する。
   - macOS・Linux：`command -v gh >/dev/null 2>&1`
   - Windows PowerShell：`if (Get-Command gh -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }`
2. 利用可能なら、認証状態も出力を表示せず終了コードだけで確認する。
   - macOS・Linux：`gh auth status >/dev/null 2>&1`
   - Windows PowerShell：`gh auth status *> $null; exit $LASTEXITCODE`
3. 終了コードが0なら、出力を取得せず「PCからGitHubへ接続済み」と要約する。

### 接続後

GitHub接続を確認したら、Cloudflare確認へ進む前にセッション記録を開始する。

1. 対象がGitリポジトリであり、GitHub remoteを1つに特定できることを確認する。
2. repo名と公開範囲だけを確認する。remote URL、生の設定出力、ローカルパスを会話やIssueへ記録しない。
3. 参加者自身の非公開アプリrepoなら、標準開始プロンプトの限定承認に基づきセッションIssueを開始または再開する。
4. 公開repoなら自動的に開始しない。公開される内容と対象repoを本人へ示し、明示許可を得た場合だけツールの`--allow-public`を使う。
5. 公開教材repo`icloudaichi/machiba-ai-beginner-support`には参加者ログを作らない。
6. Issue作成・再開後はread-backし、確認できた場合だけ「記録済み」とする。

詳細は[GitHubセッション記録](github-session-recording.md)を読む。

### 未接続の場合

原因を一つに絞り、次の一操作だけを案内する。

診断が失敗しても、`gh auth status`を出力ありで再実行しない。まずCLIの有無という一段階だけを上記の無出力コマンドで判定する。

- アカウントがない：公式サイトでアカウントを作る
- メール認証が未完了：届いた認証メールを確認する
- CLIがない：OSに合う公式手順で導入する
- CLIはあるが未ログイン：`gh auth login`でブラウザ認証する
- 認証後：無出力の`gh auth status`でもう一度終了コードだけを確認する

CLIはあるのに再確認も失敗する場合、ツール側で未加工の出力を取得しない。必要なら本人の端末で表示を確認してもらい、ユーザー名、メールアドレス、アカウントID、トークンを除いた一般的な状態だけを一つ尋ねる。全文やスクリーンショットを貼らせない。

対象プロジェクトを開いたAI相談スレッドでは、そのままセットアップを続けられる。導入やログインの前に、操作の目的、変わること、ブラウザが開くことを説明し、本人の確認後に一操作ずつ進める。結果はセッションIssueへ安全な要約として記録する。

次は接続確認に使わない。

- `gh auth token`
- トークンの表示・コピー
- リポジトリ作成やpush

セッションIssueの作成・追記は接続診断ではなく、限定承認済みの記録工程として別に扱う。

## Cloudflare

状態は次の語で整理する。

```text
未確認 → アカウント確認済み → メール認証確認済み
       → Wrangler利用可能 → PCから接続済み
```

Wranglerは対象プロジェクトから確認する。接続確認だけのために新しいWranglerを自動取得しない。

### 安全な確認

1. `package.json`にWranglerが含まれるか確認する。ファイルの内容から秘密情報を探したり表示したりしない。
2. プロジェクトの依存関係が導入済みか、出力を表示せず終了コードだけで確認する。
   - macOS・Linux：`test -x ./node_modules/.bin/wrangler`
   - Windows PowerShell：`if (Test-Path .\node_modules\.bin\wrangler.cmd) { exit 0 } else { exit 1 }`
3. ローカルWranglerが利用可能なら、認証状態も出力を表示せず終了コードだけで確認する。
   - macOS・Linux：`./node_modules/.bin/wrangler whoami >/dev/null 2>&1`
   - Windows PowerShell：`& .\node_modules\.bin\wrangler.cmd whoami *> $null; exit $LASTEXITCODE`
4. グローバルWranglerを使う構成では、最初に無出力で利用可能か確認する。
   - macOS・Linux：`command -v wrangler >/dev/null 2>&1`
   - Windows PowerShell：`if (Get-Command wrangler -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }`
5. 利用可能なら、認証状態も出力を表示せず終了コードだけで確認する。
   - macOS・Linux：`wrangler whoami >/dev/null 2>&1`
   - Windows PowerShell：`wrangler whoami *> $null; exit $LASTEXITCODE`
6. 終了コードが0なら、出力を取得せず「対象プロジェクトからCloudflareへ接続済み」と要約する。

### 未接続の場合

原因を一つに絞り、次の一操作だけを案内する。

診断が失敗しても、`whoami`を出力ありで再実行しない。まずローカルまたはグローバルWranglerの有無という一段階だけを、上記の無出力コマンドで判定する。

- アカウントがない：公式サイトでアカウントを作る
- メール認証が未完了：届いた認証メールを確認する
- プロジェクトの準備がない：対象フォルダを確認する
- Wranglerがない：プロジェクトの公式手順に沿って導入する
- Wranglerはあるが未ログイン：`wrangler login`でブラウザ認証する
- 認証後：無出力の`whoami`でもう一度終了コードだけを確認する

Wranglerはあるのに再確認も失敗する場合、ツール側で未加工の出力を取得しない。必要なら本人の端末で表示を確認してもらい、ユーザー名、メールアドレス、アカウントIDを除いた一般的な状態だけを一つ尋ねる。全文やスクリーンショットを貼らせない。

接続確認では次を行わない。

- APIトークンの発行・貼り付け
- D1データベースの作成
- アプリの公開
- GitHubからCloudflareへの自動デプロイ設定

## セットアップゲート

次を満たしたら接続準備完了とする。

- GitHub：PCから接続済み
- Cloudflare：対象プロジェクトから接続済み

片方だけ接続済みなら、済んだ側を保持し、もう片方だけを案内する。両方未接続でも、同時に二つの操作を依頼しない。

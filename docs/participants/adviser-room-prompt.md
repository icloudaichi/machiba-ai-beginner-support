# AI相談室を始める

標準のAI相談室は、作りたいアプリのプロジェクトを開いた**CodexまたはClaude Codeのスレッド**です。1つの進行中の相談案件について、成功・失敗・次の一手を、参加者自身の非公開GitHubリポジトリにある1つのIssueへ記録します。同じ相談を別のAIスレッドや同一cloneの別worktreeで続ける場合も、同じIssueを読みます。完了後に別の目的を始める場合だけ、新しいIssueを使います。

## 公式の参照先

- サポートサイト：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- AI向けスキル：<https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md>

## Codexで始める

作りたいアプリのフォルダをCodexで開き、新しいスレッドへ次を貼ります。

```text
$machiba-beginner-support を使って、このプロジェクトのAI相談室を始めてください。

公式サポートサイト：
https://machiba-ai-beginner-guide.daichi-dev.workers.dev/

公開教材リポジトリ：
https://github.com/icloudaichi/machiba-ai-beginner-support

AI向けスキルの公開版：
https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md

プロジェクト内に同じスキルがあれば、ローカルのスキルを正本として使ってください。
公開版を開けない場合は、読めたふりをしないでください。

この文章を送信することで、私は、このスレッドについて次のGitHub操作だけを継続して行うことを承認します。

- 参加者である私自身の非公開アプリリポジトリに、セッションIssueを1件作成または再開する
- 成功、失敗、blocked、現在地、次の一手を、秘密情報を含まない構造化ログとして追記する
- 書き込み後にIssueを読み戻し、反映を確認する
- 今日の目的が完了したことを確認した後、完了記録を残し、Issueを閉じてその状態を読み戻す

この承認には、コード変更、commit、push、merge、Cloudflare公開、D1作成、外部送信は含みません。私が別にコード変更を依頼した場合だけ、その依頼範囲を変更・検証・commit・pushしてください。mergeとdeployは、私が明示的に依頼するまで行わないでください。

公開リポジトリには自動記録しないでください。対象が公開リポジトリなら、repo名、公開される記録の範囲、--allow-publicが必要なことを説明し、私の明示許可を待ってください。公開教材リポジトリ machiba-ai-beginner-support は参加者ログの記録先にしないでください。

会話全文、思考過程、コマンドの生出力、ファイル全文、ローカルパス、ユーザー名、メールアドレス、アカウントID、個人情報、パスワード、認証コード、トークン、秘密鍵はGitHubへ書かないでください。

最初は次の順で、一度に一問または一操作だけ進めてください。

1. OSとプロジェクトフォルダを確認する
2. PCからGitHubへ接続できるか、出力を表示せず確認する
3. 接続後、対象repoと公開範囲を確認する
4. scripts/support-session.mjsがある場合だけ、--helpを確認する
5. 同じcloneではstatusから進行中のIssueを確認する
6. 進行中の相談がなければstart、別cloneで再開するなら私が示したIssue番号でresumeする
7. 対象プロジェクトからCloudflareへ接続できるか、出力を表示せず確認する
8. できたこと、できなかったこと、次の一手をIssueへ記録してread-backする

記録ツールがなければコマンドを推測せず、自動記録できないと伝えてください。GitHubへ記録できたふりをしないでください。

同じcloneの別worktreeでは記録状態が共有されます。別cloneまたはローカル状態を失った場合は、私が示したIssue番号だけを resume --issue へ渡してください。似たタイトルのIssueを推測で選ばないでください。公開repoでもresumeによる読み取りはできますが、追記・同期・完了には私の明示許可と --allow-public が必要です。

開始または再開できたら、安全なJSONから確認できたIssue番号だけを教えてください。owner名、repo URL、ローカルパス、個人情報は表示しないでください。開始時のGitHub repo identityをセッションへ結び付け、以後の操作で別repoへ変わっていたら書き込まず停止してください。

毎回、次の形式で答えてください。

記録状態：未開始／記録済み／未反映
GitHub：未確認／準備中／接続済み
Cloudflare：未確認／準備中／接続済み

今の状況：
次にすること：一つだけ
うまくいけば表示されるもの：
終わったら教えてほしいこと：一つだけ
```

## Claude Codeで始める

同じフォルダをClaude Codeで開き、上の文章の1行目だけを次へ置き換えます。

```text
/machiba-beginner-support を使って、このプロジェクトのAI相談室を始めてください。
```

それ以外の限定承認と安全ルールは同じです。

## 普通のChatGPT・Claudeで質問する場合

普通のChatGPT・Claudeは説明専用です。GitHubコネクタが利用できる場合でも、この自動セッション記録は行いません。対象プロジェクトのローカル状態と記録ツールを確認できないため、自動GitHub記録の標準AI相談室にはなりません。

```text
あなたは「街場のAI屋さん」の説明担当です。

参加者向けサイト：
https://machiba-ai-beginner-guide.daichi-dev.workers.dev/

公開教材リポジトリ：
https://github.com/icloudaichi/machiba-ai-beginner-support

分からない言葉を普段の日本語で説明し、一度に一問だけしてください。
私のPC、GitHub接続、Issueを確認・操作したとは言わないでください。
GitHubコネクタが利用できても、セッションIssueを自動作成・更新しないでください。
接続済み、自動記録済み、Issue再開済みと推測しないでください。

実作業が必要になったら、対象プロジェクトを開いたCodexまたはClaude Codeへ貼る文章を作ってください。
パスワード、認証コード、トークン、秘密鍵、個人情報は要求しないでください。

最初に、今日は何が分からないかを一つだけ質問してください。
```

普通のAIチャットで整理した内容は、必要な部分だけをCodex／Claude Codeのスレッドへ渡します。会話全文はGitHubへ保存しません。

## 記録されるもの・されないもの

記録されるのは、次のような短い状態だけです。

- `GitHub接続を確認できた`
- `Wrangler未導入のためCloudflare確認で停止した`
- `次はWranglerの導入方法を確認する`
- `変更をremote commit abc1234で確認した`

次は記録しません。

- AIとの会話全文
- コマンドやエラーの生出力
- スクリーンショット
- メールアドレス、ユーザー名、アカウントID
- 端末名やローカルフォルダの絶対パス
- パスワード、認証コード、トークン、秘密鍵

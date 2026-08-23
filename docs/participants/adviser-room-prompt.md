# AI相談室を始める

標準のAI相談室は、作りたいアプリのプロジェクトを開いた**CodexまたはClaude Codeのスレッドそのもの**です。質問だけを別のAIチャットへ渡すのではなく、相談、セットアップ、制作、振り返りを同じprivate app repoの相談履歴へ残します。

1つの進行中の相談案件について、本人が確認した表示名、相談内容、背景、試したこと、失敗、解決方法、学び、次の一手を1つのIssueへ記録します。会話全文ではなく、次回に再利用できる問題解決の要点だけを残します。

この文章を使う前に、スターター取得、参加者自身のprivate GitHub repo作成、Git初期化、`main`、`origin`、初回push、そのrepoをCodexまたはClaude Codeで開く操作まで完了してください。AI相談室を開いたら、表示名を聞く前に同梱`support-session --help`を確認します。

## 公式の参照先

- サポートサイト：<https://machiba-ai-beginner-guide.daichi-dev.workers.dev/>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- AI向けスキル：<https://raw.githubusercontent.com/icloudaichi/machiba-ai-beginner-support/main/.agents/skills/machiba-beginner-support/SKILL.md>
- 2026年8月23日の成果物提出先：<https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs>

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

2026年8月23日の成果物提出先：
https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs

プロジェクト内に同じスキルがあれば、ローカルのスキルを正本として使ってください。
公開版を開けない場合は、読めたふりをしないでください。

この文章を送信することで、私は、この相談案件について次のGitHub操作だけを継続して行うことを承認します。

- 本人である私が確認した表示名を、私自身のprivate app repoのセッションIssueへ保存する
- 相談内容、背景、試したこと、失敗、解決方法、学び、次の一手を、秘密情報を含まない構造化された相談履歴として追記する
- 同じ表示名の過去の構造化相談履歴を検索し、今回に使えそうな失敗・解決・学びを提示する
- 私が別途承認したGoogle Drive提出について、指定フォルダの親とファイル名をread-backできた後、ファイル名、個別Drive URLまたは未記録、経路、確認結果、次の一手を同じprivate Issueへ追記する
- 書き込み後にIssueを読み戻し、反映を確認する
- 今日の目的が完了したことを確認した後、完了記録を残し、Issueを閉じてその状態を読み戻す

この承認には、コード変更、commit、push、collaborator招待、merge、Cloudflare公開、D1作成、Google Driveへのアップロード、外部送信は含みません。私が別にコード変更を依頼した場合だけ、その依頼範囲を変更・検証・commit・pushしてください。mergeとdeployは、私が明示的に依頼するまで行わないでください。

最初に、今開いている場所が初回push済みの私自身のprivate app repoであることと、scripts/support-session.mjsおよびローカルスキルが同梱されていることを確認してください。公開教材repo、public repo、別repoなら停止してください。`node scripts/support-session.mjs --help`を実行し、実在するコマンドと引数を確認してください。ここまで確認できた後の最初の質問で、相談履歴に表示する名前だけを聞いてください。本名でなくニックネームでよいこと、その名前はprivate repoのIssueに保存され、私が招待したcollaboratorにも見えることを説明してください。

私が表示名を答えたら、保存前に「表示名を〇〇としてprivate repoへ保存してよいですか？」と一問だけ確認してください。私が明確に了承した後だけ、startへ --display-name と --confirm-display-name を一緒に指定してください。メールアドレス、電話番号、住所、GitHubユーザー名、アカウントIDを表示名にしないでください。

表示名と相談詳細はprivate repoだけに保存してください。対象repoがpublicなら、参加者自身のprivate app repoを準備するところへ戻ってください。公開教材repo machiba-ai-beginner-support には個人ログを書かないでください。

AIとの会話全文、思考過程、コマンドやエラーの生出力、ファイル全文、スクリーンショット、ローカルパス、表示名以外の個人情報、パスワード、認証コード、トークン、秘密鍵はGitHubへ書かないでください。

次の順で、一度に一問または一操作だけ進めてください。

1. スターターが私自身のprivate repoとしてGit初期化・main・origin・初回push済みか確認する
2. CodexまたはClaude Codeがそのprivate repoを開いているか確認する
3. PCからGitHubへ接続できるか、出力を表示せず確認する
4. scripts/support-session.mjsとローカルスキルを確認し、--helpを実行する
5. 表示名を尋ねる
6. その表示名をprivate repoへ保存してよいか確認する
7. 同じcloneではstatusから進行中のIssueを確認する
8. 新規なら本人確認済み表示名でstartし、別cloneなら私が示したIssue番号でresumeする
9. IssueをGitHubからread-backできた後に、対象プロジェクトからCloudflareへ接続できるか確認する
10. 相談内容と背景を一項目ずつ聞き、consultationで記録する
11. historyで同じ表示名の似た相談を検索し、使えそうな失敗・解決・学びがあれば一つずつ確認する
12. 試行、失敗、解決、学び、次の一手が分かった節目ごとにconsultationを追記し、read-backする
13. 私が成果物提出を希望した場合だけ、共有フォルダで表示名が見えることを説明し、ファイル名への使用を別に確認する
14. 安全なZIPを作り、ブラウザ提出を標準として、対象ファイル・提出先・影響を示して直前確認を得る
15. Google Driveで指定フォルダの親とファイル名をread-backする
16. --helpにartifactがある場合だけ、--folder-id 1sEgVfferbokBUQU440bChvVYyGk338hs --parent-verifiedを付けてprivate Issueへ提出結果を記録し、Issueもread-backする

履歴が見つかっても、過去の解決方法を自動実行しないでください。現在にも使えるか私へ一問ずつ確認してください。履歴がなければ、見つかったふりをしないでください。

記録ツールがなければコマンドを推測せず、自動記録できないと伝えてください。GitHubへ記録できたふりをしないでください。

同じcloneの別worktreeでは記録状態が共有されます。別cloneまたはローカル状態を失った場合は、私が示したIssue番号だけを resume --issue へ渡してください。似たタイトルのIssueを推測で選ばないでください。

開始または再開できたら、安全なJSONから確認できたIssue番号だけを教えてください。owner名、repo URL、ローカルパス、表示名を通常のstatus出力へ追加しないでください。開始時のGitHub repo identityをセッションへ結び付け、別repoへ変わっていたら書き込まず停止してください。

毎回、次の形式で答えてください。

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

成果物を提出するときは、[Google Drive提出ガイド](./drive-submission.md)のAI相談室用または制作タスク用プロンプトを続けて使ってください。標準はブラウザからの手動アップロードです。Google Driveコネクタ/APIは初回講座の必須設定ではありませんが、本人が希望し時間と環境が許す場合は「AIからDriveへ提出できるよう接続してみる」発展を選べます。

## Claude Codeで始める

同じフォルダをClaude Codeで開き、上の文章の1行目だけを次へ置き換えます。

```text
/machiba-beginner-support を使って、このプロジェクトのAI相談室を始めてください。
```

それ以外の限定承認、表示名確認、相談履歴、安全ルールは同じです。

## 普通のChatGPT・Claudeで質問する場合

普通のChatGPT・Claudeは説明専用です。GitHubコネクタが利用できる場合でも、この自動相談履歴は作りません。対象プロジェクトのローカル状態と記録ツールを確認できないため、標準のAI相談室にはなりません。

```text
あなたは「街場のAI屋さん」の説明担当です。

参加者向けサイト：
https://machiba-ai-beginner-guide.daichi-dev.workers.dev/

公開教材リポジトリ：
https://github.com/icloudaichi/machiba-ai-beginner-support

分からない言葉を普段の日本語で説明し、一度に一問だけしてください。
私のPC、GitHub接続、Issueを確認・操作したとは言わないでください。
GitHubコネクタが利用できても、個人の相談履歴を自動作成・更新・検索しないでください。

実作業や相談履歴が必要になったら、対象プロジェクトを開いたCodexまたはClaude Codeへ貼る文章を作ってください。
パスワード、認証コード、トークン、秘密鍵、個人情報は要求しないでください。

最初に、今日は何が分からないかを一つだけ質問してください。
```

## 記録される例

```text
表示名：だいち
相談内容：Cloudflareへの接続方法を知りたい
背景：スターターアプリを公開する準備をしている
試したこと：Wranglerが利用できるか確認した
失敗：Wranglerを利用できなかった
解決方法：プロジェクトへWranglerを追加した
学び：接続確認の前に、対象プロジェクトのWranglerを確認する
次の一手：Cloudflareのログイン状態を確認する
```

記録しないもの：

- AIとの会話全文や思考過程
- コマンド、ログ、エラーの生出力
- スクリーンショットやファイル全文
- 表示名以外の個人情報
- メールアドレス、GitHubユーザー名、アカウントID
- 端末名やローカルフォルダの絶対パス
- パスワード、認証コード、トークン、秘密鍵

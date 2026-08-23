# GitHubセッション記録

## 記録先と境界

- 標準の記録先は、参加者自身の非公開アプリリポジトリ。
- 保存了承済みニックネームを含む詳細な相談履歴と成果物提出記録はprivate repoだけで扱い、公開repoでは作成・検索しない。
- 1つの進行中の相談案件につき1つのIssueを使い、1 repoでは同時に1セッションだけを進行させる。
- 同じ相談を別のAIスレッドや同一cloneの別worktreeで続ける場合は、同じIssueを使う。
- 開始・再開時にGitHubのcanonical repo名と不変repo IDをローカル状態へ結び付け、以降の全コマンドで現在repoと一致することを確認する。
- GitHub操作には結び付けたrepoを明示し、originや作業フォルダが別repoへ変わった場合は書き込まない。公開許可もこのrepoだけに適用する。
- 公開教材リポジトリ`icloudaichi/machiba-ai-beginner-support`は、参加者ログの記録先にしない。
- 標準の相談履歴はpublic repoへ記録しない。対象がpublicなら、参加者自身のprivate app repoを準備してから開始する。
- 書き込み先、公開範囲、Issue番号を確認できない場合はfail closedとし、書き込まない。

## 限定承認

標準開始プロンプトを本人が送信したことで、次だけを同じ相談案件中の継続承認として扱う。

- 本人が自由に選び、保存を了承したニックネームでセッションIssueを1件作成、または同じ相談案件のIssueを再開する。
- 相談内容、背景、試したこと、失敗、解決方法、学び、次の一手を安全な構造化ログとして追記する。
- 別途本人が承認したGoogle Drive提出をread-backできた後、ファイル名、個別Drive URLまたは未記録、経路、確認結果、次の一手を追記する。
- 書き込み後に同じIssueを読み戻し、反映を確認する。
- 目的の完了を確認した後、完了イベントを記録し、Issueをcloseしてread-backする。

この限定承認に、コード変更、commit、push、merge、Cloudflare公開、D1作成、Google Driveへのアップロード、外部送信は含まれない。Driveへ書き込む直前に、対象ファイル、提出先、影響を示して別の明示確認を得る。本人がコード変更を依頼した場合、その依頼は対象コードの変更・検証・commit・pushを行う別の根拠になる。mergeとdeployは常に別の明示依頼を必要とする。目的が完了していない段階でIssueをcloseしない。

標準プロンプトを使っていない場合は、最初の書き込み前に同じ範囲の承認を一度だけ確認する。イベントごとに承認を聞き直さない。

## Issue本文

Issue本文はセッションの識別、保存了承済みニックネーム、開始時刻、目的、記録方針を保持する。CLI上は互換性のため「表示名」と表記するが、値は本人が講座で使いたいニックネームであり、運営上の氏名やrepo名ではない。private repoのIssueタイトルは`AI相談｜表示名｜日付`とし、ニックネームを公開Issueへ出さない。現在地の履歴は相談コメントへ追加し、本文を毎回書き換えない。秘密情報を含まない短い値だけを使う。

```markdown
## AI相談セッション

- 参加者の表示名：
- 開始日時：
- 今日の目的：
- 状態：進行中

## 記録方針

このIssueには会話全文ではなく、相談内容・背景・試行・失敗・解決方法・学び・次の一つを安全な要約として記録します。
```

表示名欄には、本人が保存を明確に了承したニックネームだけを使う。本名は不要で、日本語でもよい。運営上の氏名を申込情報から転記しない。OS名は必要な場合だけ`macOS`または`Windows`と記録してよい。端末名、GitHubユーザー名、メールアドレス、ローカルパスは記録しない。

## 相談コメント

意味のある相談の開始、失敗、解決、学び、次の一手の変更だけをコメントする。小さな会話や同じ状態の再説明は記録しない。

```markdown
## 相談履歴

- 記録日時：
- 相談内容：
- 背景：分かっている場合だけ
- 試したこと：分かっている場合だけ
- 失敗：起きた場合だけ、安全な原因分類または要約
- 解決方法：解決した場合だけ
- 学び：再利用できる場合だけ
- 次の一手：
- 関連コミット：コード変更がある場合だけ、push済みの40桁full SHA
```

全項目を埋めるために推測しない。エラーは`認証未完了`、`CLI未導入`、`権限不足`のように分類する。コマンド、スタックトレース、生のエラーメッセージ、スクリーンショット、会話全文は貼らない。

対象プロジェクトに記録ツールがある場合は、分かっている項目だけを指定する。`consultation`と`next`は必須。

```bash
node scripts/support-session.mjs consultation \
  --consultation "Cloudflareへの接続方法を知りたい" \
  --background "スターターアプリを公開する準備をしている" \
  --tried "Wranglerが利用できるか確認した" \
  --failure "Wranglerを利用できなかった" \
  --next "導入方法を一つ確認する"
```

解決後は、同じ相談内容に解決方法と学びを加えた新しい相談記録を残す。同一の記録はfingerprintで重複投稿しない。

## 成果物提出コメント

Google Driveへの書き込みを本人が別途承認し、一覧またはメタデータでread-backできた後だけ、提出結果を同じprivate Issueへ記録する。Driveへの書き込み承認と、GitHubへの構造化結果記録は混同しない。

```markdown
## 成果物提出

- 参加者：セッションの保存了承済みニックネーム
- ファイル名：
- 成果物Drive URL：read-back済み個別URL、または未記録
- アップロード経路：ブラウザ／コネクタ／API
- 確認結果：
- Drive確認：指定フォルダの親とファイル名をread-back済み
- GitHub記録：Issue read-back済み／未反映
- 次の一手：
```

対象プロジェクトの`--help`に`artifact`が表示される場合だけ使う。

```bash
node scripts/support-session.mjs artifact \
  --filename "2026-08-23_表示名_成果物.zip" \
  --folder-id "1sEgVfferbokBUQU440bChvVYyGk338hs" \
  --parent-verified \
  --drive-url "read-backで確認した個別ファイルURL" \
  --upload-route "browser" \
  --read-back-verified \
  --summary "受講者共有用フォルダへの提出を確認" \
  --next "講師へ提出完了を伝える"
```

`--folder-id`は指定値に完全一致させる。`--parent-verified`は、Driveからファイルの親とファイル名の両方を確認できた場合だけ付ける。`--drive-url`には個別ファイルURLだけを渡す。提出先フォルダURL、認証情報付きURL、推測URLを使わない。個別URLを確認できない場合は引数を省略し、Issue上で`未記録`と分かる状態を残す。Issue本文には生のフォルダIDを残さず、`街場のAI屋さん・当日成果物フォルダ`と親確認済み状態を記録する。`artifact`は保存了承済みニックネームを持つprivateセッションだけで使う。Driveのファイル名へ同じニックネームを使うかは別に確認する。

Drive確認済みとGitHub Issue確認済みを一つの状態へまとめない。Drive確認済み・Issue未反映なら再アップロードせず、GitHub記録だけを同期する。

実際のアップロードと安全確認は[Google Driveへの成果物提出](drive-submission.md)に従う。

## 過去の相談履歴

ニックネーム付きセッションを開始または再開した後、現在の相談を短い検索語へ要約して履歴を確認できる。

```bash
node scripts/support-session.mjs history --query "Wrangler 接続" --limit "5"
```

履歴検索は、現在のprivate repoで同じニックネームのmarkerを持つ過去セッションのうち、CLIが生成した相談コメントだけを安全なJSONへ変換する。ニックネームだけを根拠に別repoの人物を同一人物と推測しない。Issue本文や一般コメントの全文を返さない。返される項目はIssue番号、記録日時、相談内容、背景、試したこと、失敗、解決方法、学び、次の一手に限る。

履歴は参考情報であり、過去の解決方法を自動実行する許可ではない。現在の環境にも適用できるか本人へ一問ずつ確認する。

## 書き込みとread-back

1. 書き込む前に、現在repoのcanonical名・不変IDが、開始時に結び付けたrepoと一致することを確認する。
2. 記録内容をallowlistの項目だけで組み立て、保存了承済みニックネーム以外の個人情報、運営上の氏名、秘密、生出力がないことを確認する。
3. Issue作成、本文更新、またはコメント追記を行う。
4. 同じrepoとIssueをもう一度読み、ツールが付けた相談記録識別子が存在することを確認する。
5. 読み戻せた場合だけ`記録済み`と報告する。書き込み成功らしい表示だけでは完了にしない。
6. 読み戻せなければ再送を繰り返さず`未反映`とし、再開カードへ残す。

対象プロジェクトに`scripts/support-session.mjs`がある場合は、その`--help`に書かれた方法でこの操作を行う。なければ、存在しないサブコマンドや引数を推測しない。

## コード変更とcommit

本人が依頼したコード変更がある場合だけ、次の順で処理する。

1. 依頼範囲だけを変更し、必要な検証を行う。
2. 秘密情報、生成物、範囲外の変更がstageされていないことを確認する。
3. 対象変更をcommitし、作業中のbranchへpushする。
4. remote上でcommit SHAを読み戻す。
5. 確認できた40桁full SHAを`--commit`へ渡し、短い変更要約とともにセッションIssueへ追記する。
6. Issueコメントもread-backする。

```bash
node scripts/support-session.mjs consultation \
  --consultation "依頼された画面変更をGitHubへ保存したい" \
  --tried "変更とテストを完了し、作業branchへpushした" \
  --solution "live remoteでcommitを確認できた" \
  --learning "保存済みの判断にはremote確認が必要" \
  --next "次の希望を確認する" \
  --commit "push済みの40桁full SHA"
```

ツールはSHAが現在repoのcommitであること、現在branchのpush先がセッションを結び付けたGitHub repoと同じであること、`git ls-remote`で取得したlive remote branchにSHAが到達していることを無出力で確認する。pushできなかったcommitや、live remoteで確認できないSHAを「GitHubへ保存済み」と記録しない。mergeとdeployは行わない。

## 再開

同じcloneまたはその別worktreeでは、Git共通領域に保存された状態を共有する。新しいAIスレッドでも最初に`status`を使い、進行中のIssue番号と同期状態を確認する。

```bash
node scripts/support-session.mjs status
```

別cloneまたはローカル状態を失った環境では、本人が示したIssue番号だけを使ってGitHubから復元する。

```bash
node scripts/support-session.mjs resume --issue "Issue番号"
```

`resume`は現在repoのIssue本文にあるセッションmarkerとイベントfingerprintをread-backし、対応関係を復元する。タイトルの似たIssueを推測で選ばない。対応するIssue番号を確認できなければ、一問だけ本人へ尋ねる。

ニックネーム付きの標準セッションはprivate repoでだけ再開する。公開repoのIssueを標準相談履歴として読み書きしない。

Issueから最新の相談内容・試行・解決・学び・`次にする一つ`・`blocked`理由を読み、確認済みの操作を繰り返さない。

# GitHub記録型・初心者サポートの運用

このガイドは、参加者のプロジェクトを開いたCodex／Claude Codeと、講師が共通して使う運用手順です。そのスレッド自体をAI相談室として使い、GitHubをコード置き場だけでなく、過去の失敗と解決を再利用できる相談履歴にします。

## 全体像

```text
GitHubアカウントとPC接続を確認
  ↓
スターターを取得
  ↓
AIが提案した非個人ASCII名で参加者自身のprivate repoを作成し、Git初期化・main・origin・初回pushを確認
  ↓
そのprivate repoをCodexまたはClaude Codeで開く
  ↓
同梱されたsupport-sessionとスキルを確認し、--helpを実行
  ↓
端末内のニックネームを確認し、private repoへの保存了承を別に得る
  ↓
1相談案件1 Issueを開始／再開し、GitHubからread-back
  ↓
プロジェクトからCloudflareへ接続
  ↓
相談内容・背景・試行・失敗・解決・学び・次の一手を記録
  ↓
書き込み後にread-back
  ↓
依頼されたコード変更はcommit・pushし、remote SHAをIssueへ記録
  ↓
本人が希望した場合、成果物をGoogle Driveへ提出し、親とファイル名をread-back
  ↓
提出結果を同じIssueへ記録し、GitHubから別にread-back
  ↓
次のスレッドがIssueを読み、続きから再開
```

普通のChatGPT・Claudeは説明担当として利用します。GitHubコネクタの有無にかかわらず、この自動相談履歴は作りません。標準のAI相談室は、対象プロジェクトを開き、ローカル記録ツールを確認できるCodexまたはClaude Codeのスレッドそのものです。

## 正本

- [参加者向けサポートサイト](https://machiba-ai-beginner-guide.daichi-dev.workers.dev/)
- [公開教材リポジトリ](https://github.com/icloudaichi/machiba-ai-beginner-support)
- [標準開始プロンプト](../participants/adviser-room-prompt.md)
- [AI向けスキル](../../.agents/skills/machiba-beginner-support/SKILL.md)
- [GitHubセッション記録仕様](../../.agents/skills/machiba-beginner-support/references/github-session-recording.md)
- [相談履歴の記録と再利用](../../.agents/skills/machiba-beginner-support/references/consultation-history.md)
- [名前と保存先のAI判断規則](../../.agents/skills/machiba-beginner-support/references/naming-and-identity.md)
- [Google Driveへの成果物提出](../../.agents/skills/machiba-beginner-support/references/drive-submission.md)
- [参加者の名前と保管場所を分ける](./naming-and-identity.md)
- [運営collaboratorの招待](./private-repo-collaborators.md)

## 記録先

標準の記録先は、参加者自身の**非公開アプリリポジトリ**です。

| 内容 | 記録先 |
| --- | --- |
| 保存了承済みニックネーム、相談、失敗、解決、学び、次の一手 | 参加者自身のprivate app repoのセッションIssue |
| 申込時の氏名とprivate repoの対応 | 閲覧制限した申込情報・運営台帳 |
| 依頼されたコード変更 | 同じapp repoのcommitとpush |
| Google Drive提出の確認結果 | 同じapp repoのセッションIssue |
| サイトや教材そのものの改善提案 | 公開教材repoの[教材改善Issue Form](https://github.com/icloudaichi/machiba-ai-beginner-support/issues/new/choose) |
| 会話全文・生出力・秘密・個人情報 | どこにも記録しない |

公開教材repoやpublic repoへ参加者ログを投稿しません。対象repoがpublicなら、参加者自身のprivate app repoを準備してから標準相談履歴を開始します。

## 最初の接続とIssue開始

1. スターターを取得し、`README.md`、`scripts/support-session.mjs`、ローカルスキルが入っていることを確認する。
2. GitHub接続を安全に確認し、AIが`machiba-ai-app`を提案して参加者自身のprivate repoを作る。同名があれば`machiba-ai-app-2`のように連番を付け、本名やニックネームをrepo名へ入れない。
3. スターターでGitを初期化し、`main`、`origin`、初回push、GitHub上のPrivate表示とremote commitを確認する。
4. CodexまたはClaude Codeで、そのprivate repoのフォルダを開く。公開教材repoや別repoなら停止する。
5. `node scripts/support-session.mjs --help`を実行し、実在するコマンドと引数を確認する。
6. サイトの端末内進捗にニックネームがあれば候補として示し、なければ講座で何と呼ばれたいかを尋ねる。本名は不要、日本語でもよいと説明する。
7. そのニックネームをprivate repoへ保存するとcollaboratorにも見えることを説明し、端末保存とは別に明確な了承を得る。申込時の氏名をAIが取得・転記しない。
8. 標準開始プロンプトの限定承認を確認する。
9. 同じcloneでは`status`を実行し、進行中のIssue番号と同期状態を確認する。
10. 進行中のセッションがなければ、保存了承済みニックネームを`--display-name`へ渡して`start`する。別cloneで再開する場合は、本人が示したIssue番号で`resume`する。
11. 作成または再開されたIssueをread-backし、確認できた場合だけ「記録済み」と伝える。
12. その後にCloudflare接続確認と相談内容の確認へ進む。

記録ツールは開始・再開時にGitHubのcanonical repo名と不変repo IDをローカル状態へ結び付けます。その後の操作では現在のoriginとGitHub repo IDを照合し、別repoへ変わっていれば停止します。GitHub操作も結び付けたrepoを明示して行うため、同じIssue番号を持つ別repoへ誤記録しません。

### 記録ツール

対象プロジェクトにスクリプトがある場合だけ使います。

```bash
node scripts/support-session.mjs --help
node scripts/support-session.mjs status
node scripts/support-session.mjs start \
  --goal "秘密情報を含まない今日の目的" \
  --display-name "保存了承済みニックネーム" \
  --confirm-display-name
node scripts/support-session.mjs resume --issue "Issue番号"
```

主な操作は次の通りです。

```bash
node scripts/support-session.mjs consultation \
  --consultation "Cloudflareへの接続方法を知りたい" \
  --background "スターターを公開する準備をしている" \
  --next "Wranglerが利用できるか確認する"

node scripts/support-session.mjs history \
  --query "Cloudflare 接続" \
  --limit "5"

node scripts/support-session.mjs artifact \
  --filename "2026-08-23_表示名_成果物.zip" \
  --folder-id "1sEgVfferbokBUQU440bChvVYyGk338hs" \
  --parent-verified \
  --drive-url "read-backで確認した個別ファイルURL" \
  --upload-route "browser" \
  --read-back-verified \
  --summary "受講者共有用フォルダへの成果物提出を確認" \
  --next "講師へ提出完了を伝える"

node scripts/support-session.mjs complete \
  --summary "今日の目的を完了"
```

`status`の安全なJSON出力には、連携済みの場合だけIssue番号が含まれます。owner名、repo名、URL、個人情報は出力しません。

`complete`は今日の目的が完了したことを確認した後に使います。完了コメントをread-backし、Issueをcloseして、その状態もread-backします。このcloseは標準開始プロンプトの限定承認に含まれます。

ニックネーム付き`start`、`consultation`、`artifact`、`history`、ニックネーム付きセッションの`resume`はprivate repoだけで使います。public repoでは標準相談履歴を開始・再開しません。

終了コードの意味：

- `0`：GitHubでread-backまで確認済み、または安全な状態照会が成功
- `1`：入力またはセッション状態のエラー
- `2`：ローカルへ保存したが、GitHubでは未確認

終了コード`2`を「記録済み」と表示しません。接続が戻ったら次を使います。

```bash
node scripts/support-session.mjs sync
```

スクリプトがない、実行できない、または`--help`と手順が違う場合はコマンドを推測しません。GitHub自動記録は利用できないと伝え、[再開カード](../../.agents/skills/machiba-beginner-support/references/resume-card.md)へ切り替えます。

## 相談履歴の記録

会話のたびではなく、再利用できる情報が増えた次の節目だけ、`consultation`でIssueへ追記します。

- 相談内容と背景を確認できた
- 実際に試した操作が増えた
- 操作に失敗し、安全な原因分類または次の一手が変わった
- 実際に先へ進めた解決方法が分かった
- 次回も使える学びを本人と確認できた
- 同じ場所で3回または約7分止まり`blocked`になった
- remoteでcommit SHAを確認した
- 今日の目的を完了した

全項目を埋めるために推測しません。相談内容と次の一手は必須とし、背景、試したこと、失敗、解決方法、学び、commitは分かっている場合だけ指定します。生コマンド、生エラー、会話全文、スクリーンショット、保存了承済みニックネーム以外の個人情報、秘密情報は入れません。

過去履歴を調べるときは、現在の相談を短い検索語へ要約し、同じprivate repo内で同じニックネームのmarkerを持つCLI生成済み相談記録だけを`history`で読みます。同じニックネームだけで別repoの人物を同一人物と推測しません。過去の解決方法は、現在にも適用できるか本人へ一問ずつ確認してから使います。

## コードを変更した場合

セッション記録の限定承認だけではコードを変更しません。参加者が変更を依頼した場合にだけ、その依頼範囲で次を自動的に行います。

1. 変更と必要な検証を行う。
2. stage対象に秘密情報、生成物、範囲外の変更がないことを確認する。
3. commitし、作業中のbranchへpushする。
4. remote上で同じcommit SHAをread-backする。
5. 確認できた40桁full SHAを`--commit`へ渡し、短い変更要約とともにセッションIssueへ記録する。
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

ツールは40桁full SHAが現在repoに存在すること、現在branchのpush先がセッションのGitHub repoと同じこと、`git ls-remote`で確認したlive remote branchへSHAが到達していることを無出力で確認します。ローカルcommitだけ、手元のtracking refだけ、pushの成功表示だけでは「GitHubへ保存済み」にしません。mergeとCloudflare deployは、参加者が別に明示依頼するまで行いません。

## Google Driveへ成果物を提出する

2026年8月23日の提出先は[2026.8.23開催／受講者共有用](https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs)です。この直接URLだけを使い、名前が似た別フォルダを推測しません。

この共有フォルダでは、リンク所持者がファイル名や内容を見られます。private GitHub Issueへニックネームを保存する了承とは別に、同じ名前を使うか、提出用に別の名前を使うか、その名前をファイル名へ使ってよいか本人へ確認します。本名は不要です。

推奨ファイル名は`YYYY-MM-DD_表示名_成果物.zip`です。ZIPには`.env`、秘密鍵、トークン、認証コード、`node_modules`、`.wrangler`、`.git`のローカル状態、個人・顧客データを含めません。

標準経路はブラウザからの手動アップロードです。Google Driveコネクタ/APIは初回講座の必須設定にしません。本人が「AIからDriveへ提出できるよう接続してみたい」と希望し、時間と環境が許す場合だけ、発展課題として使用中のAIとOSを確認し、Google公式OAuthまたは公式コネクタを一操作ずつ案内します。

権限画面ごとに目的、アクセス範囲、影響を説明し、本人の確認を待ちます。APIキー、認証コード、トークンをチャットへ貼らせません。画面名やボタン名は変わり得るため、現在表示されている内容を確認します。同じ箇所で3回または約7分止まったら接続を中断し、ブラウザ提出へ戻ります。接続承認とアップロード承認は別です。

1. ZIPの除外内容とファイル名を確認する。
2. 対象ファイル、提出先、リンク所持者から見える影響を説明する。
3. 本人へ「この内容でアップロードしてよいですか？」と一問だけ確認する。
4. 指定フォルダへ本人の新規ファイルを1件だけ追加する。
5. 一覧またはファイルメタデータをread-backする。
6. 完全一致するファイル名と、親が指定フォルダIDであることを確認し、取得できる場合だけ個別Drive URLも確認する。
7. `--help`に`artifact`がある場合だけ、`--folder-id 1sEgVfferbokBUQU440bChvVYyGk338hs --parent-verified`を付け、確認済み結果を参加者自身のprivate Issueへ記録する。
8. GitHubのIssueコメントもread-backする。Issueには生のフォルダIDを残さず、`街場のAI屋さん・当日成果物フォルダ`と親確認済み状態を記録する。

共有権限を変更しません。ほかの参加者の既存ファイルを開く、更新する、移動する、改名する、削除する操作も行いません。アップロード表示だけで完全一致するファイル名を確認できなければ「提出済み」としません。個別URLを確認できない場合は推測せず、`artifact`の`--drive-url`を省略します。

Google Drive提出は標準開始プロンプトのGitHub記録承認には含まれません。書き込み直前の本人確認が必要です。具体的な参加者用プロンプトは[成果物をGoogle Driveへ提出する](../participants/drive-submission.md)を使います。

### 開催後の運営確認

提出先URLと書き込み権限は公開サイトや公開教材からも見えます。2026年8月23日18:00の講座終了後、運営は新規追加を止めるため共有権限を見直します。次回開催では同じwriterフォルダを使い回さず、新しい開催日フォルダと受講者共有用フォルダを用意し、教材内の直接URLを更新します。権限変更をAIが自動実行せず、対象、影響、実施時期を運営が確認してから行います。

## 一度に一つだけ進める

毎回の返答は次の形にします。

```text
記録状態：未開始／記録済み／未反映
ニックネーム：未確認／確認済み
GitHub：未確認／準備中／接続済み
Cloudflare：未確認／準備中／接続済み
Google Drive提出：未準備／確認待ち／アップロード中／Drive確認済み
GitHub提出記録：未記録／同期待ち／Issue確認済み

今の状況：
次にすること：一つだけ
うまくいけば表示されるもの：
終わったら教えてほしいこと：一つだけ
```

参加者は「できました」「画面が違います」「エラーが出ました」「分かりません」のいずれかで返せます。

## 再開

1つのrepoでは同時に1つのサポートセッションだけを進行させます。新しいAIスレッドでも、同じ相談目的を続けるなら新しいIssueを作りません。

同一cloneのworktreeはGit共通領域の状態を共有します。最初に`status`を実行し、Issue番号と同期状態を確認します。

別cloneまたはローカル状態消失時は、本人が示したIssue番号で再開します。

```bash
node scripts/support-session.mjs resume --issue "Issue番号"
```

`resume`は現在repoのIssue本文にあるセッションmarkerと、コメントのイベント識別子をGitHubから読み戻して復元します。タイトルが似ているだけのIssueを推測で選びません。Issue番号を確認できなければ、本人へ一問だけ尋ねます。

ニックネーム付きセッションはprivate repoでだけ再開できます。Issueをread-backし、最後の相談、失敗、解決、学び、`次にする一つ`から再開します。成功済みの操作を最初から繰り返しません。

## 運営が進捗を見る

和佐さん・下山さんなどの運営がニックネームごとの進捗を見るには、参加者が自分のprivate app repoへ、運営のGitHubアカウントをcollaboratorとして招待する必要があります。申込時の氏名との対応は閲覧制限した運営台帳で管理し、Issueやrepo名へ氏名を入れません。

collaboratorは相談Issueだけでなく、権限の範囲でrepo内のコードやほかのIssueにもアクセスできます。対象repo、正確なGitHubユーザー名、権限を参加者へ示し、別の明示了承を得てから招待します。標準の相談履歴承認には含めません。詳しくは[運営collaboratorの招待](./private-repo-collaborators.md)を確認します。

## 講師が確認すること

- 記録先が参加者のprivate app repoになっている
- 表示名を本人へ確認し、保存了承を得ている
- 表示名や相談詳細を公開repoへ書き込んでいない
- Issue番号とread-back済み状態を確認できる
- 会話全文、生出力、保存了承済みニックネーム以外の個人情報、秘密情報がIssueにない
- 失敗・解決方法・学び・次の一手が、分かる範囲で記録されている
- コード変更がある場合、remote commit SHAがIssueに記録されている
- Drive提出がある場合、共有ファイル名の表示名を別に確認し、安全なZIPだけを指定フォルダへ新規追加している
- Drive提出がある場合、一覧またはメタデータで指定フォルダの親と完全一致するファイル名をread-backしている
- Drive確認済みとGitHub Issue確認済みを分け、Issue未反映時に再アップロードしていない
- `artifact`へfolder IDとparent確認を渡し、Issueには生IDを残していない。個別URLは確認できた場合だけ記録している
- Driveの共有権限や、ほかの参加者の既存ファイルを変更していない
- 教材改善と参加者ログが混在していない
- 運営共有が必要な場合、本人了承済みの正しいGitHub collaboratorだけが招待されている

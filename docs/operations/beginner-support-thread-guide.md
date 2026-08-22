# GitHub記録型・初心者サポートの運用

このガイドは、参加者のプロジェクトを開いたCodex／Claude Codeと、講師が共通して使う運用手順です。GitHubをコード置き場だけでなく、AI相談スレッドの安全な外部記憶として使います。

## 全体像

```text
対象プロジェクトでAI相談スレッドを開始
  ↓
GitHub接続を安全に確認
  ↓
参加者自身のprivate repoに1相談案件1 Issueを開始／再開
  ↓
成功・失敗・blocked・次の一手を構造化して記録
  ↓
書き込み後にread-back
  ↓
依頼されたコード変更はcommit・pushし、remote SHAをIssueへ記録
  ↓
次のスレッドがIssueを読み、続きから再開
```

普通のChatGPT・Claudeは説明担当として利用します。GitHubコネクタの有無にかかわらず、この自動セッション記録は行いません。標準のAI相談室は、対象プロジェクトを開き、ローカル記録ツールを確認できるCodexまたはClaude Codeです。

## 正本

- [参加者向けサポートサイト](https://machiba-ai-beginner-guide.icloudaichi.chatgpt.site/)
- [公開教材リポジトリ](https://github.com/icloudaichi/machiba-ai-beginner-support)
- [標準開始プロンプト](../participants/adviser-room-prompt.md)
- [AI向けスキル](../../.agents/skills/machiba-beginner-support/SKILL.md)
- [GitHubセッション記録仕様](../../.agents/skills/machiba-beginner-support/references/github-session-recording.md)

## 記録先

標準の記録先は、参加者自身の**非公開アプリリポジトリ**です。

| 内容 | 記録先 |
| --- | --- |
| 参加者の成功・失敗・次の一手 | 参加者自身のprivate app repoのセッションIssue |
| 依頼されたコード変更 | 同じapp repoのcommitとpush |
| サイトや教材そのものの改善提案 | 公開教材repoの[教材改善Issue Form](https://github.com/icloudaichi/machiba-ai-beginner-support/issues/new/choose) |
| 会話全文・生出力・秘密・個人情報 | どこにも記録しない |

公開教材repoへ参加者ログを投稿しません。参加者のapp repoが公開の場合は、自動記録を止め、本人が公開範囲を理解して明示許可したときだけ`--allow-public`を使います。

## 最初の接続とIssue開始

1. OSと対象プロジェクトを確認する。
2. `gh auth status`を無出力で実行し、終了コードだけでGitHub接続を判定する。
3. GitHub接続後、対象repoと公開範囲を確認する。
4. 標準開始プロンプトの限定承認を確認する。
5. `scripts/support-session.mjs`がある場合だけ、`--help`を確認する。
6. 同じcloneでは`status`を実行し、進行中のIssue番号と同期状態を確認する。
7. 進行中のセッションがなければ`start`する。別cloneで再開する場合は、本人が示したIssue番号で`resume`する。
8. private repoなら作成または再開されたIssueをread-backする。
9. 読み戻せた場合だけ、参加者へ「記録済み」と伝える。
10. その後、Cloudflare接続確認へ進む。

記録ツールは開始・再開時にGitHubのcanonical repo名と不変repo IDをローカル状態へ結び付けます。その後の操作では現在のoriginとGitHub repo IDを照合し、別repoへ変わっていれば停止します。GitHub操作も結び付けたrepoを明示して行うため、同じIssue番号を持つ別repoへ誤記録しません。

### 記録ツール

対象プロジェクトにスクリプトがある場合だけ使います。

```bash
node scripts/support-session.mjs --help
node scripts/support-session.mjs status
node scripts/support-session.mjs start --goal "秘密情報を含まない今日の目的"
node scripts/support-session.mjs resume --issue "Issue番号"
```

主な操作は次の通りです。

```bash
node scripts/support-session.mjs event \
  --type success \
  --step "GitHub接続" \
  --summary "PCからGitHubへの接続を確認" \
  --next "Cloudflare接続を確認する"

node scripts/support-session.mjs event \
  --type failure \
  --step "Cloudflare接続" \
  --summary "Wranglerを利用できない" \
  --next "導入方法を一つ確認する"

node scripts/support-session.mjs event \
  --type blocked \
  --step "Cloudflare認証" \
  --summary "認証を完了できず中断" \
  --next "講師と画面を確認する"

node scripts/support-session.mjs complete \
  --summary "今日の目的を完了"
```

`status`の安全なJSON出力には、連携済みの場合だけIssue番号が含まれます。owner名、repo名、URL、個人情報は出力しません。

`complete`は今日の目的が完了したことを確認した後に使います。完了コメントをread-backし、Issueをcloseして、その状態もread-backします。このcloseは標準開始プロンプトの限定承認に含まれます。

公開repoでも`resume`によるIssueの読み取りはできます。ただし、その後の追記・同期・完了は、本人が公開範囲を理解して明示許可した場合だけ、該当操作へ`--allow-public`を付けます。一度許可すると、そのセッション中だけ許可状態が保持されます。

終了コードの意味：

- `0`：GitHubでread-backまで確認済み、または安全な状態照会が成功
- `1`：入力またはセッション状態のエラー
- `2`：ローカルへ保存したが、GitHubでは未確認

終了コード`2`を「記録済み」と表示しません。接続が戻ったら次を使います。

```bash
node scripts/support-session.mjs sync
```

スクリプトがない、実行できない、または`--help`と手順が違う場合はコマンドを推測しません。GitHub自動記録は利用できないと伝え、[再開カード](../../.agents/skills/machiba-beginner-support/references/resume-card.md)へ切り替えます。

## 状態変化の記録

会話のたびではなく、次の場合だけIssueへイベントを追記します。

- 接続、インストール、認証、テストなどが成功した
- 操作に失敗し、原因分類または次の一手が変わった
- 同じ場所で3回または約7分止まり`blocked`になった
- 中断した作業を再開した
- remoteでcommit SHAを確認した
- 今日の目的を完了した

イベントには、STEP、短い要約、確認方法の要約、次の一手だけを入れます。生コマンド、生エラー、会話全文、スクリーンショット、個人情報、秘密情報は入れません。

## コードを変更した場合

セッション記録の限定承認だけではコードを変更しません。参加者が変更を依頼した場合にだけ、その依頼範囲で次を自動的に行います。

1. 変更と必要な検証を行う。
2. stage対象に秘密情報、生成物、範囲外の変更がないことを確認する。
3. commitし、作業中のbranchへpushする。
4. remote上で同じcommit SHAをread-backする。
5. 確認できた40桁full SHAを`--commit`へ渡し、短い変更要約とともにセッションIssueへ記録する。
6. Issueコメントもread-backする。

```bash
node scripts/support-session.mjs event \
  --type success \
  --step "GitHub保存" \
  --summary "依頼された変更を検証し、作業branchへ保存" \
  --next "次の希望を確認する" \
  --commit "push済みの40桁full SHA"
```

ツールは40桁full SHAが現在repoに存在すること、現在branchのpush先がセッションのGitHub repoと同じこと、`git ls-remote`で確認したlive remote branchへSHAが到達していることを無出力で確認します。ローカルcommitだけ、手元のtracking refだけ、pushの成功表示だけでは「GitHubへ保存済み」にしません。mergeとCloudflare deployは、参加者が別に明示依頼するまで行いません。

## 一度に一つだけ進める

毎回の返答は次の形にします。

```text
記録状態：未開始／記録済み／未反映
GitHub：未確認／準備中／接続済み
Cloudflare：未確認／準備中／接続済み

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

Issueをread-backし、最後の成功、`blocked`理由、`次にする一つ`から再開します。成功済みの操作を最初から繰り返しません。

## 講師が確認すること

- 記録先が参加者のprivate app repoになっている
- 公開repoに`--allow-public`なしで書き込んでいない
- Issue番号とread-back済み状態を確認できる
- 会話全文、生出力、個人情報、秘密情報がIssueにない
- コード変更がある場合、remote commit SHAがIssueに記録されている
- 教材改善と参加者ログが混在していない

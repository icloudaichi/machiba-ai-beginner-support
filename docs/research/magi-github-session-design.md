# MAGIレビュー：GitHubをAI相談の外部記憶にする

## 対象と確認済み事実

2026年8月22日時点で、次を設計の前提として確認した。

- 公開サポートサイト：<https://machiba-ai-beginner-guide.icloudaichi.chatgpt.site/>
- 公開教材リポジトリ：<https://github.com/icloudaichi/machiba-ai-beginner-support>
- 標準のAI相談室は、対象プロジェクトを開いたCodexまたはClaude Codeのスレッド。
- 参加者の記録先は、参加者自身の非公開アプリrepo。
- 公開教材repoは、教材・サイト・スキル改善だけを受け付ける。

目的は会話を保存することではない。別のスレッドや講師が、最後の成功、現在の停止理由、次の一手を安全に復元できる状態を作ること。

## CASPAR：初心者が迷わず進められるか

◎ GitHub接続後にIssueを先に作ると、その後のCloudflare設定で止まっても現在地を残せる。

◎ 1つの進行中の相談案件を1 Issueに固定すると、別のAIスレッドやworktreeへ移っても「どの記録へ戻るか」を判断する回数を減らせる。

❌ 毎回の小さな会話まで記録すると、Issueが長くなり、次の一手が見つかりにくくなる。

❌ 普通のChatGPT・ClaudeとCodex／Claude Codeを同じ「AI相談室」と呼ぶだけでは、実行できる操作の違いが伝わらない。

判断：意味のある状態変化だけを記録する。普通のAIチャットは説明担当、対象プロジェクトを開いたCodex／Claude Codeを記録可能な標準相談室として明記する。

## BALTHASAR：学びが次回へ残るか

◎ 成功だけでなく、失敗の分類、`blocked`、次の一手を構造化すると、同じ説明や失敗を繰り返しにくい。

◎ コード変更をremote commit SHAと結び付けると、「説明上は完了」と「GitHubへ保存済み」を分けて確認できる。

❌ 書き込みコマンドが成功したように見えただけでは、GitHubに残った証拠にならない。

❌ 公開教材repoへ参加者ログを集めると、教材改善と個人の作業履歴が混ざり、公開範囲も誤りやすい。

判断：すべての書き込みをread-backで閉じる。参加者ログと教材改善Issueを、repoとIssue Formの両方で分離する。

## MELCHIOR：仕組みとして壊れにくいか

◎ `scripts/support-session.mjs`にIssue作成・明示Issue番号からの再開・イベント・同期・read-backを集約すると、AIごとのコマンド差を減らせる。

◎ 公開repoを初期拒否し、明示的な`--allow-public`がある場合だけ例外にすると、誤公開をfail closedにできる。

◎ セッションと公開許可をGitHubのcanonical repo名・不変repo IDへ結び付け、すべてのGitHub操作で明示repoを使うと、origin変更や別worktreeによる誤記録を防げる。

❌ スクリプトがない参加者repoで、AIが似たコマンドや引数を推測すると、記録先や状態を壊す可能性がある。

❌ Issueタイトルの類似だけで再開先を選ぶと、別スレッドの記録を混ぜる可能性がある。

判断：スクリプトが存在し、`--help`と手順が一致する場合だけ使用する。同じcloneではGit共通領域の状態を`status`で確認し、別cloneでは本人が示したIssue番号だけを`resume`へ渡す。対応Issueを証明できない場合は推測で選ばない。GitHub未確認時はローカル保存または再開カードへ退避し、`sync`後にread-backする。

## 相互批判

- CASPARの「操作を減らす」とBALTHASARの「証拠を増やす」は、すべての会話を残す方法では両立しない。状態変化だけをallowlist記録することで両立させる。
- BALTHASARの「失敗も蓄積する」は、MELCHIORの秘密・個人情報境界を越える可能性がある。生エラーではなく、`認証未完了`、`CLI未導入`、`権限不足`のような分類だけを残す。
- MELCHIORの自動化は、CASPARの初心者体験を複雑にし得る。参加者にはコマンド詳細より「記録済み／未反映」と次の一つだけを見せる。

## 不確実性に対する二つの仮説

### スクリプトを参加者repoで使えるか

- 仮説A：スターターに同梱され、標準どおり自動記録できる。
- 仮説B：別のrepoにはスクリプトがなく、自動記録できない。

決定：存在確認と`--help`確認をゲートにする。仮説Bではコマンドを推測せず、未利用であることを明示する。

### 記録先がprivateか

- 仮説A：参加者自身のprivate app repoであり、標準の限定承認を適用できる。
- 仮説B：学習用repoがpublicであり、状態や失敗が公開される。

決定：公開範囲を先に確認する。仮説Bでは自動記録を止め、本人の明示許可と`--allow-public`の両方を必要とする。

## 統合判断

| 優先度 | 実装 | 完了を示す証拠 |
| --- | --- | --- |
| P0 | private app repoを標準記録先にする | 対象repoとvisibilityを確認できる |
| P0 | 1相談案件1 Issueを作成・再開する | Issue番号を保持し、同じIssueをread-backできる |
| P0 | allowlistの状態変化だけを書く | Issueに会話全文・生出力・個人情報・秘密がない |
| P0 | 書き込み後にread-backする | イベント識別子または要約をGitHubから再取得できる |
| P0 | public repoを初期拒否する | `--allow-public`なしでは終了コード2となりGitHub未確認扱いになる |
| P0 | セッションをrepo identityへ結び付ける | originとGitHub repo IDの不一致で書き込みを停止する |
| P1 | コード変更をremote SHAへ結び付ける | remote commitとIssueコメントの両方をread-backできる |
| P1 | 教材改善Issueを分離する | 公開repoのIssue Formが教材改善専用になっている |

## 承認境界

標準開始プロンプトを送ることで承認されるのは、同じ相談案件のセッションIssue作成・再開、安全な構造化ログ追記、read-back、目的完了時のIssue closeだけ。コード変更、commit、push、merge、deploy、D1作成、外部送信は含まれない。

コード変更は本人から具体的な依頼があった場合だけ行う。その依頼範囲を検証し、commit・push・remote SHA確認まで行う。mergeとdeployは別の明示依頼を必要とする。

## 完了判定

次をすべて満たしたときだけ、GitHub記録型サポートを完了と扱う。

1. 対象repoと公開範囲を確認した。
2. 限定承認の範囲を確認した。
3. 正しいIssueを作成または再開した。
4. 最新イベントをGitHubからread-backした。
5. Issueに秘密・個人情報・生出力がない。
6. コード変更がある場合、remote commit SHAとIssue記録を両方確認した。
7. 次の一手、または完了状態が明確になっている。

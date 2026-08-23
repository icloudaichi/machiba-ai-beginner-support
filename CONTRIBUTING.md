# 共同編集の進め方

このリポジトリは、Codex、Claude Code、人間が同じ教材を安全に編集するため、作業場所と確認手順を分けます。GitHub上の`main`は公開中の確定版です。作業途中の変更を`main`へ直接pushしません。

## 言葉の役割

- **ブランチ**：一つの変更をまとめる作業名です。
- **worktree**：同じリポジトリから作る、エージェントごとの別作業フォルダです。
- **commit**：変更の途中経過を保存した記録です。
- **Draft Pull Request**：作業中の内容と確認状況をGitHubで共有する場所です。
- **review**：公開版へ取り込む前に、差分と確認結果を見る工程です。
- **squash merge**：一つの作業で生まれた複数のcommitを、一つの記録として`main`へ取り込む方法です。

## 基本ルール

1. 一つの作業は、一つのブランチ・一つのworktree・原則一つのPull Requestにまとめます。
2. CodexとClaude Codeは、同じブランチや同じworktreeを同時に使いません。
3. 作業開始時とcommit前に`git status`を確認し、自分の担当外の変更を削除、上書き、巻き戻しません。
4. `main`へ直接commitまたはpushしません。
5. 作業を共有するときは、最初にDraft Pull Requestを作ります。
6. Pull Requestをレビュー可能にする前に`npm test`を成功させます。
7. 差分、確認結果、秘密情報がないことをレビューしてからsquash mergeします。
8. merge後は、不要になったリモートブランチとworktreeを削除します。
9. Cloudflareへのdeployや外部サービスへの送信は、Pull Requestのmergeとは別の操作です。明示された場合だけ実行します。

GitHub側でブランチ保護が設定されていない場合も、このルールを手順として守ります。

## ブランチ名

- Codex：`codex/<Issue番号または短い説明>`
- Claude Code：`claude/<Issue番号または短い説明>`
- 人間：`human/<Issue番号または短い説明>`

例：

```text
codex/nickname-guidance
claude/review-nickname-guidance
```

既に同じ目的のブランチがある場合、名前を変えて別実装を始める前に、担当者と作業範囲を確認します。

## 作業を始める

リポジトリ本体で最新の`main`を確認します。

```bash
git fetch origin
git status --short --branch
```

未保存の変更がないことを確認してから、エージェント専用のworktreeを作ります。パスとブランチ名は作業に合わせて変更してください。

```bash
mkdir -p ../machiba-ai-worktrees
git worktree add ../machiba-ai-worktrees/codex-nickname \
  -b codex/nickname-guidance origin/main
```

Claude Codeでは`claude/`のブランチを使います。

```bash
git worktree add ../machiba-ai-worktrees/claude-nickname-review \
  -b claude/nickname-guidance origin/main
```

作成したworktreeをCodexまたはClaude Codeで開きます。別エージェントが使っているworktreeは開きません。

## 変更・確認・commit

作業中は、依頼された範囲だけを変更します。途中で担当外の変更が必要になった場合は、先にPull RequestまたはIssueへ理由を書き、範囲を確認します。

```bash
git status --short
git diff --check
npm test
```

確認後、自分の変更だけをstageしてcommitします。

```bash
git add <変更したファイル>
git diff --cached
git commit -m "docs: explain nickname handling"
git push -u origin <ブランチ名>
```

`git add .`を機械的に使わず、担当外の変更や生成物が含まれていないことを確認します。

## Draft Pull Requestを作る

最初はDraftで作成します。

```bash
gh pr create --draft --base main --head <ブランチ名>
```

Pull Request本文には、関連Issue、変更内容、変更しなかった範囲、`npm test`の結果、画面変更時のスクリーンショット、残課題を書きます。

追加修正は同じブランチへpushします。別のPull Requestを重ねて作りません。作業と検証が終わったらDraftを解除し、レビューを依頼します。

## レビューする

レビューでは、最低限次を確認します。

- 依頼の目的と差分が一致している
- 担当外のファイルを巻き戻していない
- 初心者向けの説明が一度に一操作になっている
- パスワード、トークン、秘密鍵、参加者情報が含まれていない
- `npm test`とGitHubの`validate`チェックが成功している
- UI変更では、デスクトップとスマートフォンの表示を確認している
- merge後に必要なdeployや運営作業が明記されている

修正が必要な場合は、Pull Request上で対象箇所と期待結果を伝えます。レビュー担当が作者のブランチを大きく書き換える場合は、先に共有します。

## mergeと後片付け

レビュー完了後はsquash mergeし、リモートブランチを削除します。

```bash
gh pr merge <PR番号> --squash --delete-branch
```

GitHub上でmerge済みを確認してから、作業を始めたリポジトリ本体でworktreeを片付けます。

```bash
git fetch origin
git pull --ff-only origin main
git worktree remove <worktreeのパス>
git branch --delete <ブランチ名>
```

未commitの変更があるworktreeは強制削除しません。必要な変更を保存・共有してから片付けます。squash mergeでは`git branch --delete`が安全のため拒否することがあります。その場合は、Pull Requestがmerge済みでリモートブランチも削除済みであることを確認してから、対象のローカル作業ブランチだけを削除します。

## 衝突したとき

- 他の人の変更を消して解決しません。
- どちらの意図を残すか分からない場合は、競合箇所と両方の意図をPull Requestへ書いて確認します。
- 自分の作業と無関係な差分は、そのまま保持します。
- `git reset --hard`や強制pushは、明示された復旧作業以外では使いません。

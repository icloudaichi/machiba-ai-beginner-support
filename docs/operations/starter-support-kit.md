# 配布スターターへのサポートキット同梱

公開教材リポジトリにスキルと記録ツールがあっても、参加者のアプリrepoへ自動的には入りません。運営は、講座で配るスターターへサポートキットを同梱し、参加者が対象プロジェクトを開いた直後から同じ手順を使える状態にします。

## 必須同梱物

次を**同じ公開教材repoの同じcommit**からまとめてコピーする。ファイルを個別の時点から寄せ集めない。

```text
参加者スターター/
├── scripts/
│   ├── support-session.mjs
│   └── support-session-lib.mjs
├── .agents/
│   └── skills/
│       └── machiba-beginner-support/
│           ├── SKILL.md
│           ├── agents/openai.yaml
│           └── references/*.md
└── .claude/
    └── skills/
        └── machiba-beginner-support/
            └── SKILL.md
```

Codex向けの正本は`.agents/skills/machiba-beginner-support/`、Claude Code向けは正本を読む薄い入口。どちらかだけを配布しない。

## 任意のpackage scripts

スターターがNode.jsの`package.json`を持つ場合は、次の入口を追加できる。

```json
{
  "scripts": {
    "support:help": "node scripts/support-session.mjs --help",
    "test:support-session": "node --test scripts/support-session*.test.mjs"
  }
}
```

`test:support-session`を追加する場合は、`scripts/support-session*.test.mjs`も開発・配布物へ含める。テストファイルを同梱しないスターターに、動かないtest scriptだけを残さない。

package scriptは便宜上の入口であり、記録ツール本体の動作には必須ではない。

## 同梱してはいけないもの

- `.git/machiba-support-session/`に生成されたローカルセッション状態
- Issue番号、repo ID、公開許可を含む別参加者の状態ファイル
- 別参加者のニックネーム、participant marker、相談履歴
- `.env`、`.env.local`、`.wrangler/`
- パスワード、認証コード、トークン、秘密鍵、アカウント情報
- 実際の参加者や顧客のデータ

セッション状態は、参加者が自分のGit repoで初めて`start`または`resume`したときに、Git共通領域へ生成される。テンプレートとしてコピーしない。

## 配布前チェックリスト

公開教材repoのクリーンなcloneまたは配布候補フォルダで確認する。

- [ ] 必須同梱物が同じcommit由来でそろっている
- [ ] `.agents`の正本と`.claude`の入口が両方ある
- [ ] `node scripts/support-session.mjs --help`が終了コード0になる
- [ ] helpに`start`、`resume`、`status`、`event`、`consultation`、`artifact`、`history`、`complete`、`sync`が表示される
- [ ] helpにニックネームを渡す表示名確認フラグ、終了コード0・1・2、詳細相談はprivate repo限定という条件が表示される
- [ ] `npm run test:support-session`または`node --test scripts/support-session*.test.mjs`が成功する
- [ ] ニックネームの明示確認、詳細相談のpublic拒否、同じニックネームmarkerの履歴検索、private同期、別cloneのresume、worktree共有、push済みSHA、repo不一致のテストを含む
- [ ] `artifact`のprivate限定、`--folder-id`完全一致、`--parent-verified`必須、read-back必須、個別Drive URL検証、フォルダURL・認証情報付きURL拒否のテストを含む
- [ ] [Codex向けスキル](../../.agents/skills/machiba-beginner-support/SKILL.md)のvalidatorが成功する
- [ ] [Claude Code向け入口](../../.claude/skills/machiba-beginner-support/SKILL.md)から正本への相対パスが解決できる
- [ ] Markdownの相対リンク切れがない
- [ ] セッション状態、参加者のニックネーム・相談履歴、運営上の氏名、秘密情報、個人情報、生成物が配布ZIPやGit追跡へ入っていない
- [ ] 成果物ZIPから`.env`、秘密鍵、`node_modules`、`.wrangler`、`.git`、個人・顧客データを除外する手順が参加者から確認できる

現在の公開教材repoでは、まとめて次を実行できる。

```bash
node scripts/support-session.mjs --help
npm run test:support-session
npm test
```

`npm test`には画面の状態テスト、サポートセッション専用テスト、lint、production buildが含まれる。表示上の成功だけでなく、終了コード0を確認する。

## 参加者へ渡した後の最初の確認

1. スターターを取得し、同梱物がそろっていることを確認する。
2. AIが`machiba-ai-app`、同名なら短い連番付きの非個人ASCII名を提案して参加者自身のprivate app repoを作成し、Git初期化、`main`、`origin`、初回push、Private表示とremote commitを確認する。本名やニックネームをrepo名へ入れない。
3. そのprivate repoをCodexまたはClaude Codeで開く。
4. 対象プロジェクトのルートで`node scripts/support-session.mjs --help`を実行する。
5. Codexでは`$machiba-beginner-support`、Claude Codeでは`/machiba-beginner-support`を呼び出す。
6. [AI相談室の開始プロンプト](../participants/adviser-room-prompt.md)を使い、限定承認の範囲を共有する。
7. サイトの端末内進捗にニックネームがあれば候補として示し、なければ講座で使いたいニックネームを聞く。日本語でもよいこと、private Issueへ保存するとcollaboratorにも見えることを説明し、端末保存とは別に了承を得る。
8. 同じcloneに進行中セッションがあれば`status`、新規なら保存了承済みニックネームを`--display-name`へ渡して`start`、別cloneからの続きなら明示Issue番号で`resume`し、Issueをread-backする。
9. Issue確認後にCloudflare接続へ進み、相談内容を`consultation`へ記録する。必要に応じて`history`で同じニックネームの過去履歴を確認する。
10. 成果物提出では、[Google Drive提出ガイド](../participants/drive-submission.md)を使い、Issueとは別に共有ファイル名へ使う名前、ZIP除外、書き込み直前承認、指定フォルダの親とファイル名のDrive read-backを確認する。
11. `--help`に`artifact`がある場合だけ、`--folder-id 1sEgVfferbokBUQU440bChvVYyGk338hs --parent-verified`を付けてprivate Issueへ記録し、Issue read-backを別に確認する。

スクリプトまたはスキルがない場合、AIに似たコマンドを推測させない。運営がスターターの同梱漏れを修正するか、自動記録なしのローカル体験へ切り替える。

## 更新するとき

サポートキットを更新するときも、公開教材repoの1つのcommitを基準にする。

1. 変更したスクリプト、lib、ニックネーム・相談履歴対応スキル、references、Claude入口を同じ版にそろえる。
2. 専用テストと`npm test`を実行する。
3. 新しいスターターZIPを生成する。
4. ZIPを別フォルダへ展開し、上の配布前チェックを繰り返す。
5. 確認したcommit SHAと配布日を運営記録へ残す。

## 開催日ごとのDrive提出先

2026年8月23日の提出先は、[2026.8.23開催／受講者共有用](https://drive.google.com/drive/folders/1sEgVfferbokBUQU440bChvVYyGk338hs)です。このURLと書き込み権限は公開サイトや公開教材から見えるため、2026年8月23日18:00の講座終了後、運営は新規追加を止めるため共有権限を見直します。

次回開催では同じwriterフォルダを使い回しません。新しい開催日フォルダと受講者共有用フォルダを作り、参加者ガイド、スキル参照、サイトにある直接URLを更新します。権限変更は自動化せず、対象フォルダ、現在の利用状況、参加者への影響、実施時期を運営が確認してから行います。

参加者repoの既存ファイルを更新する場合は、本人の作業内容を上書きしない。差分を確認し、サポートキットの対象ファイルだけを更新する。

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
- `.env`、`.env.local`、`.wrangler/`
- パスワード、認証コード、トークン、秘密鍵、アカウント情報
- 実際の参加者や顧客のデータ

セッション状態は、参加者が自分のGit repoで初めて`start`または`resume`したときに、Git共通領域へ生成される。テンプレートとしてコピーしない。

## 配布前チェックリスト

公開教材repoのクリーンなcloneまたは配布候補フォルダで確認する。

- [ ] 必須同梱物が同じcommit由来でそろっている
- [ ] `.agents`の正本と`.claude`の入口が両方ある
- [ ] `node scripts/support-session.mjs --help`が終了コード0になる
- [ ] helpに`start`、`resume`、`status`、`event`、`complete`、`sync`が表示される
- [ ] helpに終了コード0・1・2と、公開repoの`--allow-public`条件が表示される
- [ ] `npm run test:support-session`または`node --test scripts/support-session*.test.mjs`が成功する
- [ ] public拒否、private同期、別cloneのresume、worktree共有、push済みSHA、repo不一致のテストを含む
- [ ] [Codex向けスキル](../../.agents/skills/machiba-beginner-support/SKILL.md)のvalidatorが成功する
- [ ] [Claude Code向け入口](../../.claude/skills/machiba-beginner-support/SKILL.md)から正本への相対パスが解決できる
- [ ] Markdownの相対リンク切れがない
- [ ] セッション状態、秘密情報、個人情報、生成物が配布ZIPやGit追跡へ入っていない

現在の公開教材repoでは、まとめて次を実行できる。

```bash
node scripts/support-session.mjs --help
npm run test:support-session
npm test
```

`npm test`には画面の状態テスト、サポートセッション専用テスト、lint、production buildが含まれる。表示上の成功だけでなく、終了コード0を確認する。

## 参加者へ渡した後の最初の確認

1. 参加者自身のアプリrepoが対象であることを確認する。
2. 標準はprivate repoとし、公開repoなら自動記録を始めない。
3. 対象プロジェクトのルートで`node scripts/support-session.mjs --help`を実行する。
4. Codexでは`$machiba-beginner-support`、Claude Codeでは`/machiba-beginner-support`を呼び出す。
5. [AI相談室の開始プロンプト](../participants/adviser-room-prompt.md)を使い、限定承認の範囲を共有する。
6. 同じcloneに進行中セッションがあれば`status`、新規なら`start`、別cloneからの続きなら明示Issue番号で`resume`する。

スクリプトまたはスキルがない場合、AIに似たコマンドを推測させない。運営がスターターの同梱漏れを修正するか、自動記録なしのローカル体験へ切り替える。

## 更新するとき

サポートキットを更新するときも、公開教材repoの1つのcommitを基準にする。

1. 変更したスクリプト、lib、スキル、references、Claude入口を同じ版にそろえる。
2. 専用テストと`npm test`を実行する。
3. 新しいスターターZIPを生成する。
4. ZIPを別フォルダへ展開し、上の配布前チェックを繰り返す。
5. 確認したcommit SHAと配布日を運営記録へ残す。

参加者repoの既存ファイルを更新する場合は、本人の作業内容を上書きしない。差分を確認し、サポートキットの対象ファイルだけを更新する。

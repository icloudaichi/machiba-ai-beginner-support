import Link from "next/link";

const surveyUrl = "https://utage-system.com/p/67imqIfivQEy";

const uiReferences = [
  { name: "shadcn/ui Blocks", url: "https://ui.shadcn.com/blocks", use: "ダッシュボード、ログイン、一覧画面など、完成形に近い見本を探す" },
  { name: "Mobbin", url: "https://mobbin.com/explore/web", use: "実際のWebアプリやスマホアプリの画面と流れを見る" },
  { name: "SaaSFrame", url: "https://www.saasframe.io/", use: "業務アプリ、管理画面、ステップ表示の見本を探す" },
  { name: "UI Pocket", url: "https://www.ui-pocket.com/mobile", use: "日本のスマホアプリらしい画面や配色を見る" },
  { name: "CSS Stock", url: "https://pote-chil.com/css-stock/ja/loading", use: "ボタン、通知、読み込み中など、一つの部品の動きを探す" },
];

const videos = [
  { order: "01", title: "バイブコーディング超入門 第1回", note: "まず全体像をもう一度確認したいとき", url: "https://www.youtube.com/watch?v=frTURfI-WlU" },
  { order: "02", title: "初心者向け Git・GitHub解説", note: "GitHubを『作品と作業記録の保存場所』として理解したいとき", url: "https://www.youtube.com/watch?v=BNHrLHl1DKQ" },
  { order: "03", title: "バイブコーディング超入門 再生リスト", note: "分からないテーマだけ、順番に見たいとき", url: "https://www.youtube.com/playlist?list=PL3gzghX8RmGm7m-6qCsKJ9kqt0fCH8hkz" },
];

const recordPrompt = `今回の作業について、次の内容を整理してください。

1. 何を作りたかったか
2. 変更前はどうなっていたか
3. 今回試したこと
4. うまくいかなかったこと
5. どうやって解決したか、または今どこで止まっているか
6. 自分で確認した結果
7. 今回分かったこと
8. 次にする一つ

会話全文やエラーの生出力をそのまま貼らず、後から同じ問題を解決できる具体さで、現在のGitHub Issueへ記録してください。パスワード、認証コード、トークン、秘密鍵、個人情報、ローカルの絶対パスは記録しないでください。記録後は同じIssueを読み直し、反映されたことを確認してください。`;

const deployPrompt = `今の変更をインターネット上のアプリへ反映したいです。

まず、未保存の変更、GitHubへのpush状態、秘密情報が含まれていないこと、公開すると誰が見られるかを確認してください。「デプロイすると何が変わるか」を初心者向けに説明し、私の了承を待ってください。了承後だけCloudflareへデプロイし、成功した公開URLと確認した画面を教えてください。失敗した場合は成功したふりをせず、現在地と次に試す一つをGitHub Issueへ記録してください。`;

export default function AfterCoursePage() {
  return (
    <main className="after-course">
      <header className="after-course-bar">
        <Link href="/" className="after-course-brand"><span>街</span><b>街場のAI屋さん</b></Link>
        <a href={surveyUrl} className="after-course-survey" target="_blank" rel="noreferrer">受講後アンケート</a>
      </header>

      <section className="after-course-hero">
        <p>MACHIBA AI · AFTER COURSE GUIDE</p>
        <h1>今日の続きを、<br /><em>自分で始めよう。</em></h1>
        <span>一度に全部を作らなくて大丈夫です。前回の続きから、一つだけ変えて、見て、記録します。</span>
        <div><a href="#restart">続け方を見る</a><a href={surveyUrl} target="_blank" rel="noreferrer">感想を送る</a></div>
      </section>

      <section className="after-course-section" id="restart">
        <p className="after-course-label">01 · RESTART</p>
        <h2>一人で再開するときの、8つの順番</h2>
        <div className="after-course-steps">
          {[
            ["1", "同じフォルダを開く", "前回作ったアプリのフォルダをCodexまたはClaude Codeで開きます。"],
            ["2", "前回の記録を見る", "GitHub Issueまたは再開カードから、最後の成功と次の一つを確認します。"],
            ["3", "一つだけ頼む", "色、文字、項目、動きなど、今回変えたいことを一つ話します。"],
            ["4", "作業前に聞く", "AIに、何を変えるか、何が変わるかを説明してもらいます。"],
            ["5", "自分の目で見る", "画面を開いて、希望どおりか、別の場所が壊れていないか確認します。"],
            ["6", "結果を伝える", "できた、違う、エラーが出た、分からない、のどれかを返します。"],
            ["7", "GitHubへ残す", "成功も失敗も、次回に使える短い作業記録として保存します。"],
            ["8", "必要ならデプロイ", "公開してよい状態を確認してから、Cloudflareへ反映します。"],
          ].map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </div>
      </section>

      <section className="after-course-section terms">
        <p className="after-course-label">02 · WORDS</p>
        <h2>よく出てくる言葉は、こういう意味です</h2>
        <div className="after-course-terms">
          <article><b>コミット</b><h3>作業のセーブ</h3><p>ここまでの変更に名前を付けて残すことです。「何を変えたか」が分かる名前にします。</p></article>
          <article><b>Issue</b><h3>作業日誌</h3><p>目的、試したこと、失敗、解決方法、次にすることを残す場所です。</p></article>
          <article><b>プッシュ</b><h3>GitHubへ送る</h3><p>PCの中にあるセーブを、GitHubの非公開リポジトリへ反映します。</p></article>
          <article><b>デプロイ</b><h3>公開アプリへ反映</h3><p>PCで作った新しい状態をCloudflareへ送り、インターネット上で動く状態にします。</p></article>
        </div>
      </section>

      <section className="after-course-section prompt-section">
        <p className="after-course-label">03 · RECORD</p>
        <h2>GitHubへ、あとで役立つ記録を残す</h2>
        <p className="after-course-lead">「できました」だけで終わらせず、何を試して、なぜ直ったのかまで残すと、次のAI相談が早くなります。</p>
        <div className="after-course-prompt"><b>制作AIへコピーする文章</b><pre>{recordPrompt}</pre></div>
      </section>

      <section className="after-course-section prompt-section deploy-section">
        <p className="after-course-label">04 · DEPLOY</p>
        <h2>公開するときは、先に確認してから</h2>
        <p className="after-course-lead">デプロイは難しい暗号ではなく、「今の完成版をCloudflareへ反映する」という意味です。ただし、秘密情報や公開範囲は毎回確認します。</p>
        <div className="after-course-prompt"><b>デプロイを頼む文章</b><pre>{deployPrompt}</pre></div>
      </section>

      <section className="after-course-section">
        <p className="after-course-label">05 · UI REFERENCES</p>
        <h2>見た目に迷ったら、見本を選んで渡す</h2>
        <p className="after-course-lead">気に入った画面を見つけ、スクリーンショットをAIへ渡します。「全部同じ」ではなく、「配色だけ」「一覧部分だけ」と一つずつ頼みます。</p>
        <div className="after-course-links">
          {uiReferences.map(item => <a href={item.url} target="_blank" rel="noreferrer" key={item.name}><span>↗</span><div><h3>{item.name}</h3><p>{item.use}</p></div></a>)}
        </div>
      </section>

      <section className="after-course-section videos">
        <p className="after-course-label">06 · WATCH NEXT</p>
        <h2>動画は、分からないところから見る</h2>
        <div className="after-course-videos">
          {videos.map(video => <a href={video.url} target="_blank" rel="noreferrer" key={video.order}><span>{video.order}</span><div><h3>{video.title}</h3><p>{video.note}</p></div><b>再生する ↗</b></a>)}
        </div>
      </section>

      <section className="after-course-section after-course-finish">
        <p className="after-course-label">FEEDBACK</p>
        <h2>できたことも、困ったことも教えてください。</h2>
        <p>次回の講座とサポート教材を良くするためのアンケートです。率直な感想で大丈夫です。</p>
        <a href={surveyUrl} target="_blank" rel="noreferrer">受講後アンケートに回答する</a>
        <small>困ったときは、各コミュニティのAIサポート会コンテンツで平原をメンションしてください。</small>
      </section>
    </main>
  );
}

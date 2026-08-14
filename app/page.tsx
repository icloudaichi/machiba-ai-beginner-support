"use client";

import { useState } from "react";

const pages = [
  ["00", "はじめに"],
  ["01", "道具をそろえる"],
  ["02", "仕組みを知る"],
  ["03", "話してつくる"],
  ["04", "当日の流れ"],
  ["05", "困ったとき"],
] as const;

function PageNumber({ value }: { value: number }) {
  return <span className="page-number">{String(value).padStart(2, "0")}</span>;
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <div className="point">
      <span>POINT</span>
      <p>{children}</p>
    </div>
  );
}

function Chapter({ number, title, subtitle, tone }: { number: string; title: string; subtitle: string; tone: string }) {
  return (
    <section className={`sheet chapter ${tone}`} id={`chapter-${number}`}>
      <div className="chapter-orbit" aria-hidden="true" />
      <p className="eyebrow">CHAPTER</p>
      <strong className="chapter-number">{number}</strong>
      <h2>{title}</h2>
      <p className="chapter-subtitle">{subtitle}</p>
      <div className="chapter-dots" aria-hidden="true">● ● ●</div>
    </section>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main>
      <header className="site-bar">
        <a href="#top" className="brand" aria-label="最初のページへ">
          <span className="brand-mark">街</span>
          <span>街場のAI屋さん<br /><small>はじめてのアプリづくり</small></span>
        </a>
        <div className="site-actions">
          <button className="outline-button" onClick={() => window.print()}>A4で印刷</button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>目次</button>
        </div>
      </header>

      <nav className={menuOpen ? "toc open" : "toc"} aria-label="章の目次">
        {pages.map(([number, label]) => (
          <a key={number} href={number === "00" ? "#top" : `#chapter-${number}`} onClick={() => setMenuOpen(false)}>
            <span>{number}</span>{label}
          </a>
        ))}
      </nav>

      <div className="deck" id="top">
        <section className="sheet cover">
          <div className="cover-badge">はじめてでもわかる</div>
          <p className="cover-kicker">MACHIBA NO AI-YASAN</p>
          <h1>街場の<br /><em>AI屋さん</em></h1>
          <p className="cover-lead">AIと話して、<br />あなたが思うアプリをつくろう。</p>
          <div className="cover-illustration" aria-hidden="true">
            <div className="person">☺</div>
            <div className="speech">こんなものが<br />ほしいです</div>
            <div className="laptop"><span>AI</span></div>
          </div>
          <div className="cover-footer">超初心者向け 標準ガイド</div>
          <PageNumber value={1} />
        </section>

        <section className="sheet intro">
          <p className="eyebrow green">最初に</p>
          <h2>むずかしい操作より、<br /><em>「こんなものがほしい」</em>から。</h2>
          <p className="lead">AIに普段の言葉で相談し、出てきた画面を見ながら、少しずつ希望を伝えていきます。</p>
          <div className="three-benefits">
            <article><span>1</span><div className="icon">話</div><h3>話せる</h3><p>言い間違いを直さず、音声で思いつくまま相談できます。</p></article>
            <article><span>2</span><div className="icon">見</div><h3>見られる</h3><p>AIが作った画面を、すぐに自分の目で確かめられます。</p></article>
            <article><span>3</span><div className="icon">育</div><h3>育てられる</h3><p>色や項目を変えながら、自分のアプリに近づけられます。</p></article>
          </div>
          <Point>パソコンが得意でなくても大丈夫。思っていることを詳しく話せる力が、AIへの良い材料になります。</Point>
          <PageNumber value={2} />
        </section>

        <section className="sheet overview">
          <p className="eyebrow orange">今日のゴール</p>
          <h2>5時間で、ここまで体験します</h2>
          <div className="journey">
            {[
              ["知る", "アプリとAIの役割を知る"],
              ["準備", "使う道具を登録する"],
              ["相談", "AI相談室をつくる"],
              ["変更", "音声で一つ変える"],
              ["公開", "できる人はネットへ公開"],
            ].map(([title, text], index) => <div key={title}><b>{index + 1}</b><h3>{title}</h3><p>{text}</p></div>)}
          </div>
          <div className="goal-card">
            <strong>今日、持ち帰るもの</strong>
            <p>AIと一緒に作るときの役割分担と、次に自分で相談を続けるための「質問部屋」です。</p>
          </div>
          <PageNumber value={3} />
        </section>

        <Chapter number="01" title="まず、道具をそろえよう" subtitle="登録は一つずつ。分からない画面はAIに聞きながら進めます。" tone="yellow" />

        <section className="sheet howto">
          <p className="step-label">STEP 1</p>
          <h2>最初の鍵は、<em>Googleアカウント</em></h2>
          <p className="lead small">Googleのメールアドレス（Gmail）を一つ用意します。講座で使う各サービスの登録や、Googleの道具との連携に使えます。</p>
          <div className="mock-screen google-screen">
            <div className="browser-top"><i /><i /><i /><span>accounts.google.com</span></div>
            <div className="google-g">G</div>
            <h3>Google アカウントを作成</h3>
            <div className="fake-field">名前</div><div className="fake-field">希望するメールアドレス</div>
            <button>次へ</button>
            <div className="callout one">1</div><div className="callout two">2</div>
          </div>
          <div className="check-row"><span>□</span>ログインできる <span>□</span>Gmailを受け取れる <span>□</span>自分だけがパスワードを知っている</div>
          <Point>パスワードや確認コードは、講師やAIへ送らず、自分の画面だけに入力します。</Point>
          <PageNumber value={5} />
        </section>

        <section className="sheet choose-ai">
          <p className="step-label">STEP 2</p>
          <h2>一緒に作る<em>AI</em>を選びます</h2>
          <p className="lead small">最初はどちらか一つで大丈夫です。講座では、ふだん使っている人が多く、相談から制作へ進みやすいChatGPTを基本にします。</p>
          <div className="choice-grid">
            <article className="recommended"><span className="ribbon">講座の基本</span><div className="choice-logo dark">◎</div><h3>ChatGPT デスクトップ</h3><strong>制作：Codex</strong><p>質問と相談に慣れてから、そのままアプリ制作を始めます。</p></article>
            <article><div className="choice-logo coral">A</div><h3>Claude デスクトップ</h3><strong>制作：Claude Code</strong><p>Claudeを普段から使っている人はこちらでも進められます。</p></article>
          </div>
          <Point>AIの名前を覚えることが目的ではありません。「相談する場所」と「実際に作業する場所」がある、と分かれば十分です。</Point>
          <PageNumber value={6} />
        </section>

        <section className="sheet accounts">
          <p className="step-label">STEP 3</p>
          <h2>作品を置く場所を準備します</h2>
          <div className="account-cards">
            <article>
              <div className="service-icon github">GH</div><div><h3>GitHub</h3><p>AIが作ったファイルと、変更の記録を置く場所。</p></div>
              <ol><li>無料アカウントを作る</li><li>届いたメールを確認する</li><li>ユーザー名を控える</li></ol>
            </article>
            <article>
              <div className="service-icon cloudflare">CF</div><div><h3>Cloudflare</h3><p>アプリをインターネット上で動かす場所。</p></div>
              <ol><li>無料アカウントを作る</li><li>届いたメールを確認する</li><li>ログインできるか確かめる</li></ol>
            </article>
          </div>
          <div className="mini-tip"><b>登録で止まったら</b><p>画面のスクリーンショットを撮り、秘密の文字を隠してからAI相談室へ見せます。</p></div>
          <PageNumber value={7} />
        </section>

        <Chapter number="02" title="アプリの仕組みを知ろう" subtitle="サービス名を暗記せず、まず「何の役割か」を見ていきます。" tone="blue" />

        <section className="sheet app-basics">
          <p className="eyebrow blue-text">そもそも</p>
          <h2>アプリは、3つの組み合わせ</h2>
          <div className="app-parts">
            <article><div className="part-icon screen-icon"><span /></div><h3>見える画面</h3><p>文字、一覧、ボタン、入力欄、色や形。</p></article>
            <div className="plus">＋</div>
            <article><div className="part-icon motion-icon">↔</div><h3>動き</h3><p>押す、送る、検索する、計算する。</p></article>
            <div className="plus">＋</div>
            <article><div className="part-icon db-icon">▤</div><h3>覚える情報</h3><p>名前、予約、メモ、対応した記録。</p></article>
          </div>
          <div className="example-strip"><b>たとえば予約アプリなら</b><span>予約画面</span><i>＋</i><span>空き時間を探す動き</span><i>＋</i><span>予約内容</span></div>
          <Point>作りたいものを話すときも、この3つを順番に考えると伝わりやすくなります。</Point>
          <PageNumber value={9} />
        </section>

        <section className="sheet roles">
          <p className="eyebrow blue-text">4つの役割</p>
          <h2>裏側では、こんな役割がつながります</h2>
          <div className="concept-flow">
            <div className="flow-you"><b>あなた</b><small>目的・希望・感想</small></div><span>↔</span>
            <div className="flow-ai"><b>AIの作業担当</b><small>作る・直す・確認</small></div><span>→</span>
            <div className="flow-record"><b>設計図と記録</b><small>ファイルの保管</small></div><span>→</span>
            <div className="flow-web"><b>動くアプリ</b><small>ネットで見られる</small></div>
            <div className="flow-db"><b>情報の倉庫</b><small>必要な情報を保存</small></div>
          </div>
          <div className="house-note"><span>⌂</span><div><b>家づくりに例えると</b><p>あなたが施主、AIが相談相手と現場担当。設計図を保管し、土地に家を建て、倉庫へ物をしまいます。アプリは完成後も気軽に作り直せます。</p></div></div>
          <PageNumber value={10} />
        </section>

        <section className="sheet services">
          <p className="eyebrow purple">実際に使う名前</p>
          <h2>役割を、サービス名に置き換えると</h2>
          <div className="service-flow">
            <div className="sf human"><small>作りたい人</small><b>あなた</b></div><span>↔</span>
            <div className="sf codex"><small>AIの作業担当</small><b>Codex</b></div><span>→</span>
            <div className="sf gh"><small>設計図と記録</small><b>GitHub</b></div><span>→</span>
            <div className="sf cf"><small>動くアプリ</small><b>Cloudflare</b></div>
            <div className="db-link">↕</div>
            <div className="sf d1"><small>情報の倉庫</small><b>Cloudflare D1</b></div>
          </div>
          <div className="google-link"><b>Googleの道具</b><p>カレンダー、スプレッドシート、ドライブなどは、必要になったときにアプリとつなぎます。</p></div>
          <Point>最初から全部を自分で操作しません。Codexが作業し、あなたは質問に答え、結果を見て希望を伝えます。</Point>
          <PageNumber value={11} />
        </section>

        <section className="sheet rooms">
          <p className="eyebrow purple">AIとの付き合い方</p>
          <h2>「質問する部屋」と「作る部屋」を分けます</h2>
          <div className="room-grid">
            <article className="advice-room"><span>いつでも使う</span><div className="room-icon">?</div><h3>AI相談室</h3><p>言葉の意味を聞く。作りたいものを整理する。おすすめを一つずつ教えてもらう。</p><b>複数のアプリで共通</b></article>
            <div className="room-arrow">→</div>
            <article className="work-room"><span>作品ごとに作る</span><div className="room-icon">⌘</div><h3>制作室</h3><p>フォルダを開く。必要な道具を確認する。ファイルを作り、動かし、公開する。</p><b>アプリごとに別のタスク</b></article>
          </div>
          <div className="pin-prompt"><b>最初に作る名前</b><code>AI相談室｜はじめてのアプリづくり</code><p>あとで迷わないように、ピン留めしておきます。</p></div>
          <PageNumber value={12} />
        </section>

        <Chapter number="03" title="話して、つくって、確かめよう" subtitle="きれいに話す必要はありません。材料をたくさん渡すことが大切です。" tone="green-tone" />

        <section className="sheet voice">
          <p className="eyebrow green">音声入力</p>
          <h2>2分間、思いつくまま話してみよう</h2>
          <p className="lead small">言い間違い、言い直し、話の順番はそのままで大丈夫。次の6つを材料にします。</p>
          <div className="voice-topics">
            {[
              ["誰が", "誰が使うもの？"], ["いま", "今はどうしている？"], ["困る", "何が面倒？"],
              ["うれしい", "どうなったらうれしい？"], ["画面", "何を見たい？"], ["雰囲気", "色や参考は？"],
            ].map(([key, text], i) => <div key={key}><span>{i + 1}</span><b>{key}</b><p>{text}</p></div>)}
          </div>
          <blockquote>今話した内容を整理してください。分からないところがあれば、一度に一つずつ質問してください。</blockquote>
          <PageNumber value={14} />
        </section>

        <section className="sheet loop">
          <p className="eyebrow green">基本のくり返し</p>
          <h2>話す → 見る → 伝える → 確かめる</h2>
          <div className="loop-circle">
            <div className="loop-center">少しずつ<br /><b>自分のアプリへ</b></div>
            <div className="loop-item l1"><b>1 話す</b><p>まず希望を伝える</p></div>
            <div className="loop-item l2"><b>2 見る</b><p>出てきた画面を見る</p></div>
            <div className="loop-item l3"><b>3 伝える</b><p>感想と追加希望を話す</p></div>
            <div className="loop-item l4"><b>4 確かめる</b><p>動かして確認する</p></div>
          </div>
          <div className="remodel"><span>⌂</span><p><b>完璧な家も、一度の相談では決まりません。</b><br />モデルルームを見たり、間取りを直したりするように、アプリも見てから考えて大丈夫です。</p></div>
          <PageNumber value={15} />
        </section>

        <section className="sheet patterns">
          <p className="eyebrow orange">作り方の3パターン</p>
          <h2>ほしいものに合わせて、AIが道を選びます</h2>
          <div className="pattern-list">
            <article><span>01</span><div><h3>まずPCの中で動かす</h3><p>画面や使い心地を試す。外へ公開せず、小さく始めたいとき。</p></div><b>ローカル</b></article>
            <article><span>02</span><div><h3>Googleなどとつなぐ</h3><p>カレンダー、表、ドライブなど、今使っている情報を利用したいとき。</p></div><b>外部連携</b></article>
            <article><span>03</span><div><h3>インターネットで使う</h3><p>どこからでも開きたい。情報を保存し、他の人にも使ってもらいたいとき。</p></div><b>クラウド</b></article>
          </div>
          <Point>どれを選ぶか分からないときは「私の場合はどれがおすすめ？」とAI相談室へ聞けば大丈夫です。</Point>
          <PageNumber value={16} />
        </section>

        <Chapter number="04" title="当日の流れ" subtitle="2026年8月23日 13:00〜18:00｜全員の目標は「相談して、一つ変える」まで。" tone="orange-tone" />

        <section className="sheet schedule">
          <p className="eyebrow orange">5時間のカリキュラム</p>
          <h2>ゆっくり準備して、後半で一つ作ります</h2>
          <div className="timeline">
            <div><time>13:00</time><span /><p><b>知る</b>アプリ、バイブコーディング、役割分担</p></div>
            <div><time>14:05</time><span /><p><b>AIを準備</b>デスクトップアプリ、ログイン、AI相談室</p></div>
            <div><time>15:00</time><span /><p><b>休憩</b>15分。困っているところを個別確認</p></div>
            <div><time>15:15</time><span /><p><b>場所を準備</b>GitHub・Cloudflareの登録</p></div>
            <div><time>15:55</time><span /><p><b>制作室へ</b>スターター取得、環境の確認</p></div>
            <div><time>16:50</time><span /><p><b>一つ変える</b>タイトル、項目、色、用途を音声で依頼</p></div>
            <div><time>17:25</time><span /><p><b>公開・振り返り</b>できる人は公開URLを確認</p></div>
          </div>
          <div className="must-goal"><b>全員の成功</b><span>相談室を作る</span><span>アカウントを準備</span><span>アプリを一つ変える</span></div>
          <PageNumber value={18} />
        </section>

        <section className="sheet safety">
          <p className="eyebrow red">安心して使うために</p>
          <h2>秘密の情報は、渡さない</h2>
          <div className="safety-grid">
            <article className="safe"><h3>○ AIに見せてよいもの</h3><ul><li>作りたいものの説明</li><li>架空の練習データ</li><li>秘密を隠した画面写真</li><li>エラーメッセージ</li></ul></article>
            <article className="unsafe"><h3>× AIへ貼らないもの</h3><ul><li>パスワード・確認コード</li><li>カード情報・秘密鍵</li><li>本物のお客様情報</li><li>公開してはいけない資料</li></ul></article>
          </div>
          <div className="before-public"><b>公開の前に3つ確認</b><div><span>1</span>本物の個人情報がない</div><div><span>2</span>秘密の文字がない</div><div><span>3</span>講師と一緒に画面を見る</div></div>
          <PageNumber value={19} />
        </section>

        <Chapter number="05" title="困ったときも、AIに聞こう" subtitle="止まった画面は失敗ではなく、次の質問に使う材料です。" tone="purple-tone" />

        <section className="sheet qa">
          <p className="eyebrow purple">よくある質問</p>
          <h2>こんなときは、どうする？</h2>
          <div className="qa-list">
            <details open><summary><span>Q1</span>知らない言葉が出てきました</summary><p>「初心者にも分かる言葉で、たとえ話を使って説明してください」と相談します。</p></details>
            <details><summary><span>Q2</span>画面が説明と違います</summary><p>画面全体を撮り、パスワードやメールアドレスを隠してから見せます。</p></details>
            <details><summary><span>Q3</span>エラーの赤い文字が出ました</summary><p>省略せずにAIへ見せ、「何が起きていて、次に一つ何をすればいい？」と聞きます。</p></details>
            <details><summary><span>Q4</span>公開まで終わりませんでした</summary><p>制作タスクに途中の記録が残ります。講座後に同じ場所から再開できます。</p></details>
          </div>
          <Point>分からないときに、分からないと言えることも立派な指示です。</Point>
          <PageNumber value={21} />
        </section>

        <section className="sheet checklist">
          <p className="eyebrow green">当日の持ち物</p>
          <h2>この5つを持ってきてください</h2>
          <div className="bring-list">
            <div><span>□</span><b>Mac または Windows PC</b><p>充電器も一緒に。</p></div>
            <div><span>□</span><b>Googleアカウント</b><p>Gmailを開ける状態。</p></div>
            <div><span>□</span><b>スマートフォン</b><p>メール確認やログイン認証に。</p></div>
            <div><span>□</span><b>イヤホン（あれば）</b><p>音声入力の確認用。</p></div>
            <div><span>□</span><b>作ってみたいもの</b><p>まだぼんやりでも大丈夫。</p></div>
          </div>
          <div className="account-status"><b>講座で一緒に登録します</b><span>ChatGPT または Claude</span><span>GitHub</span><span>Cloudflare</span></div>
          <PageNumber value={22} />
        </section>

        <section className="sheet closing">
          <div className="closing-mark">街</div>
          <p className="eyebrow cream">最後に</p>
          <h2>あなたは、<br /><em>何を作ってみたいですか？</em></h2>
          <p>うまく説明できなくても大丈夫。<br />まず、今困っていることから話してみましょう。</p>
          <div className="closing-prompt">「こんなことができたらいいな、から<br />一緒に整理してください」</div>
          <div className="official-links">
            <p>登録・導入は必ず各サービスの公式ページから行います。</p>
            <a href="https://support.google.com/accounts/answer/27441" target="_blank" rel="noreferrer">Google</a>
            <a href="https://openai.com/chatgpt/desktop/" target="_blank" rel="noreferrer">ChatGPT</a>
            <a href="https://claude.com/download" target="_blank" rel="noreferrer">Claude</a>
            <a href="https://docs.github.com/get-started/start-your-journey/creating-an-account-on-github" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://developers.cloudflare.com/fundamentals/setup/account/create-account/" target="_blank" rel="noreferrer">Cloudflare</a>
          </div>
          <PageNumber value={23} />
        </section>
      </div>
    </main>
  );
}

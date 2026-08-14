"use client";

import { useState } from "react";

const pages = [
  ["00", "はじめに"],
  ["CATALOG", "できること"],
  ["01", "道具をそろえる"],
  ["02", "仕組みを知る"],
  ["03", "話してつくる"],
  ["04", "接続を準備"],
  ["05", "実践する"],
  ["06", "当日の流れ"],
  ["07", "困ったとき"],
] as const;

const catalogCases = [
  {
    number: "01",
    category: "連絡をまとめる",
    title: "メールと公式LINEを、\n一つの場所で確認したい",
    lead: "届いた連絡を一覧にして、AIに返信案を考えてもらいます。最後に送るかどうかを決めるのは、あなたです。",
    services: ["Gmail API", "LINE Messaging API", "AI", "Cloudflare"],
    steps: ["新着を集める", "AIが要点を読む", "返信案をつくる", "確認して送る"],
    features: ["未対応だけを表示", "相手ごとの履歴", "返信文の言い換え", "対応済みの記録"],
    starter: "架空のメール・LINEを並べ、返信案を保存できる受信箱から始めます。",
    note: "Gmailへの利用許可とLINE公式アカウントを、AIの案内で一度設定します。",
    tone: "mail",
    page: 5,
  },
  {
    number: "02",
    category: "連絡を仕事に変える",
    title: "メールやChatworkから、\nやることを整理したい",
    lead: "連絡の中から『誰が・何を・いつまでに』をAIが見つけ、あなた専用のタスク一覧へまとめます。",
    services: ["Gmail API", "Chatwork API", "各種MCP", "Cloudflare"],
    steps: ["連絡を受け取る", "タスク候補を抽出", "期限を確認する", "一覧で管理する"],
    features: ["今日やること", "期限が近い順", "元メッセージへ戻る", "完了・保留の管理"],
    starter: "サンプルの連絡文を貼ると、タスク候補を一覧にできるアプリから始めます。",
    note: "使いたいサービスを決め、APIやMCPの接続をAIと一つずつ設定します。",
    tone: "task",
    page: 6,
  },
  {
    number: "03",
    category: "発信を続ける",
    title: "XなどのSNS投稿を、\n準備・予約・自動化したい",
    lead: "伝えたい材料からAIが投稿案を作り、確認した文章を予約して、決めた時間に投稿できるようにします。",
    services: ["X API", "SNS連携MCP", "AI", "Cloudflare"],
    steps: ["材料をためる", "投稿案をつくる", "内容を確認する", "予約して投稿する"],
    features: ["投稿カレンダー", "文章の長さ調整", "確認待ち一覧", "投稿結果の記録"],
    starter: "テーマを入れると3つの投稿案が出て、採用案をカレンダーへ置ける画面から始めます。",
    note: "SNSの利用条件を確認し、必要な開発者登録や接続設定をAIと一緒に進めます。",
    tone: "social",
    page: 7,
  },
  {
    number: "04",
    category: "自分専用のAI秘書",
    title: "経費・請求書・予定を、\n一つの秘書画面で見たい",
    lead: "Googleのメール、ドライブ、カレンダー、表計算をつなぎ、今日確認することをAIが整理します。",
    services: ["Gmail", "Google Drive", "Calendar / Sheets", "Cloudflare"],
    steps: ["資料を見つける", "内容を整理する", "期限を知らせる", "あなたが判断する"],
    features: ["請求書の確認待ち", "支払期限の一覧", "予定と準備物", "今月の経費メモ"],
    starter: "架空の請求書と予定を使い、今日確認することを表示する秘書画面から始めます。",
    note: "Googleアカウントでアプリに許可する範囲を選び、AIと一度接続します。重要な判断は本人が行います。",
    tone: "secretary",
    page: 8,
  },
] as const;

const setupGuideSteps = [
  {
    number: "01",
    label: "案内の進め方を固定する",
    title: "AIを「一つずつ案内する係」にしよう",
    lead: "先に進行ルールを渡すと、AIが何個も操作を並べず、あなたの画面を確認しながら待ってくれます。",
    actions: ["AI相談室を開く", "下の詳細プロンプトをコピーして送る", "AIが最初の質問を一つだけしたか確認する"],
    prompt: "あなたは、AIやパソコンに不慣れな人のセットアップ案内係です。必ず次のルールを守ってください。①最初にMacかWindowsか、今どの画面を開いているかを確認する。②一度の返答で案内する操作は一つだけにする。③操作する理由と、操作後に見えるはずの画面を短く説明する。④私が『できました』と答えるまで次へ進まない。⑤画面が違う場合は推測で進めず、秘密情報を隠したスクリーンショットを依頼する。⑥公式サイト以外へ案内しない。⑦パスワード、認証コード、秘密鍵、カード情報をチャットへ貼らせない。⑧インストール、ログイン、外部公開の前には、何が起きるか説明して確認する。⑨エラーは省略せず読み、原因と次の一手を初心者向けに説明する。⑩各作業の最後に『完了・未完了・次にすること』を示す。まず、私が使っているPCを一つだけ質問してください。",
    checks: ["AIから質問が一つだけ届いた", "AIが返事を待っている"],
    tip: "途中で案内がまとめて出たら「一つずつに戻してください」と伝えます。",
    page: 24,
  },
  {
    number: "02",
    label: "すべての登録に使う",
    title: "Googleアカウントを準備しよう",
    lead: "Gmailを受け取れるGoogleアカウントを一つ用意します。すでに使えるものがあれば、新しく作る必要はありません。",
    actions: ["講師と一緒にGoogleの公式アカウント作成ページを開く", "名前・生年月日・希望するGmailなどを自分の画面へ入力する", "電話やメールの確認が出たら自分で認証し、Gmailを開く"],
    prompt: "Googleアカウントの準備を確認したいです。新しく作る必要があるかを一つずつ判断してください。入力する個人情報、パスワード、確認コードは私の画面だけに入力させ、チャットには書かせないでください。各操作後に、どんな画面が見えれば成功かを教え、私の『できました』を待ってください。",
    checks: ["Googleへログインできる", "Gmailで確認メールを受け取れる"],
    tip: "パスワードは講師もAIも預かりません。自分だけが分かる方法で管理します。",
    page: 25,
  },
  {
    number: "03",
    label: "相談と制作に使う",
    title: "ChatGPTデスクトップを準備しよう",
    lead: "公式ページからアプリを入れ、Googleアカウントなどでログインします。ChatとCodexが見えるところまで進めます。",
    actions: ["ChatGPT公式のダウンロードページを開く", "MacまたはWindowsに合うアプリをインストールする", "アプリを開いてログインし、ChatとCodexが選べるか確認する"],
    prompt: "ChatGPTデスクトップの導入を、一操作ずつ案内してください。最初にMacかWindowsかと、すでにアプリが入っているかを確認してください。必ず公式ページだけを使い、ダウンロード、インストール、ログインを分けて案内し、各操作後に私の『できました』を待ってください。パスワードや確認コードはチャットに貼らせないでください。最後にChatとCodexが見えるか確認してください。",
    checks: ["ChatGPTデスクトップが起動する", "ログイン後にCodexを選べる"],
    tip: "似た名前のアプリを検索結果から選ばず、配布資料の公式リンクを使います。",
    page: 26,
  },
  {
    number: "04",
    label: "作品を保存する場所",
    title: "GitHubアカウントを作ろう",
    lead: "GitHubの個人アカウントを作り、メール認証まで完了します。ユーザー名は作品のURLにも使われます。",
    actions: ["GitHub公式のサインアップページを開く", "メールアドレス・パスワード・ユーザー名を自分で入力する", "Gmailへ届いた認証メールを開き、認証済みか確認する"],
    prompt: "GitHubの個人アカウント作成を、一操作ずつ案内してください。最初に既存アカウントがないか確認し、公式のサインアップページだけを使ってください。メール、パスワード、確認コードは私の画面だけに入力させてください。ユーザー名を決めるときは、公開されても困らず、読みやすい候補を3つまで示してください。メール認証が終わるまで、私の『できました』を待ちながら進めてください。最後にユーザー名と認証済みであることだけを確認してください。",
    checks: ["GitHubへログインできる", "メールアドレスが認証済みになっている"],
    tip: "メール認証が終わっていないと、作品の保管場所を作れない場合があります。",
    page: 27,
  },
  {
    number: "05",
    label: "公開する場所",
    title: "Cloudflareアカウントを作ろう",
    lead: "Cloudflareの無料アカウントを作り、メール認証とログインまで確認します。カード登録は行いません。",
    actions: ["Cloudflare公式のアカウント作成ページを開く", "メールアドレスとパスワードを自分の画面へ入力する", "Gmailへ届いた確認を完了し、ダッシュボードを開く"],
    prompt: "Cloudflareの無料アカウント作成を、一操作ずつ案内してください。最初に既存アカウントがないか確認し、必ず公式ページを使ってください。メール、パスワード、確認コードは私の画面だけに入力させてください。無料で進められる範囲だけを案内し、カード登録や有料プランが表示されたら進む前に説明してください。各操作後に私の『できました』を待ち、最後にダッシュボードへログインできることを確認してください。",
    checks: ["Cloudflareへログインできる", "ダッシュボードが表示される"],
    tip: "講座の標準課題では、無料で使える範囲から始めます。",
    page: 28,
  },
  {
    number: "06",
    label: "PCとGitHubをつなぐ",
    title: "GitHubへ接続しよう",
    lead: "ブラウザで作ったGitHubアカウントと、このPCで働くCodexを一度つなぎます。接続後はAIが保存作業を進められます。",
    actions: ["CodexにGitHub CLIがあるか確認してもらう", "なければ公式の方法で導入してもらう", "ブラウザ認証を開き、自分で許可して接続確認を行う"],
    prompt: "このPCと私のGitHubアカウントを接続してください。最初にGitHub CLIの有無と、すでにログイン済みかを安全な確認コマンドで調べ、結果を初心者向けに説明してください。不足している場合だけ公式の方法で導入してください。認証はブラウザを使う方法を優先し、パスワード、確認コード、アクセストークンをチャットへ貼らせないでください。実行する操作は必ず一つずつ説明し、私の『できました』を待ってください。接続後はログイン状態とGitHubユーザー名を確認し、完了・未完了・次にすることを報告してください。",
    checks: ["CodexがGitHubのユーザー名を確認できた", "秘密の文字をチャットへ貼らずに接続できた"],
    tip: "ここでつなぐのは最初の一度です。接続後はCodexへ『GitHubに保存して』と頼めます。",
    page: 29,
  },
  {
    number: "07",
    label: "PCとCloudflareをつなぐ",
    title: "Cloudflareへ接続しよう",
    lead: "CloudflareアカウントとCodexをブラウザ認証でつなぎます。接続後は公開やデータベース作成をAIへ頼めます。",
    actions: ["CodexにWranglerがあるか確認してもらう", "プロジェクト内で使える状態か確認する", "ブラウザの認証画面で、自分のCloudflareアカウントを許可する"],
    prompt: "このプロジェクトと私のCloudflareアカウントを接続してください。最初にWranglerが使えるかと、すでにログイン済みかを確認し、結果を初心者向けに説明してください。不足しているものだけ公式手順で準備してください。ブラウザ認証を使い、APIトークン、パスワード、確認コードをチャットへ表示させないでください。ログイン画面を開く前に何が起きるか説明し、私の『できました』を待ってください。接続後は安全な確認方法でアカウントが認識されているか調べ、完了・未完了・次にすることを報告してください。まだ公開やデータベース作成は行わないでください。",
    checks: ["CodexがCloudflareへのログインを確認できた", "まだ公開せず、接続だけで止まっている"],
    tip: "接続と公開を分けることで、何が起きたかを落ち着いて確認できます。",
    page: 30,
  },
] as const;

const practiceSteps = [
  {
    number: "01",
    label: "質問できる場所をつくる",
    title: "まず、AI相談室を開こう",
    lead: "制作中に知らない言葉や画面が出ても、いつでも質問できる場所を最初に用意します。",
    actions: ["ChatGPTで新しいチャットを作る", "名前を「AI相談室｜はじめてのアプリづくり」にする", "分かりやすい場所へピン留めする"],
    prompt: "私はAIもアプリづくりも初めてです。難しい言葉は普段の日本語で説明し、一度に一つずつ質問してください。実際のファイル変更は別の制作タスクで行うよう案内してください。",
    checks: ["相談室の名前が見える", "分からないことを一つ質問できた"],
    tip: "この相談室は、今日だけでなく次のアプリづくりでも使います。",
    page: 32,
  },
  {
    number: "02",
    label: "作品を置く場所をつくる",
    title: "スターターフォルダを準備しよう",
    lead: "最初から全部を作らず、講師が用意した見本をコピーして、自分の作品として育てます。",
    actions: ["Google DriveからスターターZIPをダウンロードする", "ZIPを展開して、普通のフォルダにする", "「書類」など、後から見つけやすい場所へ移す"],
    prompt: "スターターZIPをダウンロードしました。私の画面を見ながら、展開して分かりやすい場所へ置くまで一つずつ案内してください。",
    checks: ["ZIPではなくフォルダが見える", "中に README.md がある"],
    tip: "フォルダ名は日本語でも構いません。今回は「はじめてのアプリ」でも大丈夫です。",
    page: 33,
  },
  {
    number: "03",
    label: "Codexに作業場所を渡す",
    title: "制作するフォルダを開こう",
    lead: "ChatGPTデスクトップでCodexを選び、さきほど用意したフォルダを作業場所として開きます。",
    actions: ["ChatGPTデスクトップを開いてログインする", "左上のメニューから「Codex」を選ぶ", "フォルダを開く操作で、スターターフォルダを選ぶ"],
    prompt: "今開いているフォルダが、今日使うスターターアプリか確認してください。まだ変更せず、見つかったファイルを初心者向けに説明してください。",
    checks: ["Codexの画面になっている", "README.md の内容を説明してもらえた"],
    tip: "表示名やボタンの位置は更新で変わることがあります。画面が違えば、そのままAI相談室へ見せます。",
    page: 34,
  },
  {
    number: "04",
    label: "最初の依頼を渡す",
    title: "制作タスクを始めよう",
    lead: "このアプリでは、AIに『初心者を案内する担当』としての進め方を最初に渡します。",
    actions: ["Codexで新しいタスクを作る", "名前を「01 はじめてのアプリ制作」にする", "下の文章を貼り、送信する"],
    prompt: "私はバイブコーディングが初めてです。MacかWindowsかを確認し、必要な作業を一度に一つだけ案内してください。操作の前に何をするか説明し、操作後は成功したか確認してください。パスワードや認証コードはチャットへ貼らせないでください。",
    checks: ["AIから最初の質問が一つ届いた", "自分のOSを答えられた"],
    tip: "長い文章を毎回書く必要はありません。最初に役割を渡した後は、普段の言葉で話します。",
    page: 35,
  },
  {
    number: "05",
    label: "PCの準備を確認する",
    title: "必要な道具だけをそろえよう",
    lead: "Codexが今のPCを確認し、足りない道具だけを見つけます。名前を覚える必要はありません。",
    actions: ["Git・Node.js・GitHub CLI・Wranglerがあるか調べてもらう", "不足しているものの役割を説明してもらう", "公式の方法で一つずつ導入し、毎回確認する"],
    prompt: "このPCでスターターアプリを動かす準備を確認してください。足りないものだけを公式の方法で案内し、インストールやログインの前には必ず説明してください。",
    checks: ["AIが確認結果を一覧にした", "不足分の導入後に成功確認ができた"],
    tip: "黒い画面が出ても、自分で文字を打つとは限りません。Codexが作業し、あなたは結果を確認します。",
    page: 36,
  },
  {
    number: "06",
    label: "まず動くものを見る",
    title: "アプリを動かして開こう",
    lead: "変更する前に、最初の見本が動くことを確認します。画面が出れば、ここから会話で育てられます。",
    actions: ["Codexにアプリを起動してもらう", "表示されたローカルURLをブラウザで開く", "一覧・追加・更新を一度ずつ試す"],
    prompt: "このスターターアプリをPCの中で起動してください。私が開くURLを教え、画面が表示されたら確認する場所を一つずつ案内してください。",
    checks: ["ブラウザにアプリが表示された", "サンプルの情報を追加・変更できた"],
    tip: "まだインターネットには公開されていません。まず自分のPCの中で安心して試します。",
    page: 37,
  },
  {
    number: "07",
    label: "音声で一つ頼む",
    title: "自分らしく、一つ変えてみよう",
    lead: "マイクを押し、画面を見ながら感じたことをそのまま話します。言い直しも話の脱線も大丈夫です。",
    actions: ["変えたいものを一つ選ぶ", "誰が使うか、どうしたいかを音声で話す", "AIの確認質問へ答え、変更してもらう"],
    prompt: "この画面を私向けに変えたいです。まずタイトルを『お客様連絡帳』にして、落ち着いた緑色の雰囲気にしてください。ほかに決めることがあれば、一度に一つ質問してください。",
    checks: ["頼んだ言葉や色が画面に反映された", "自分の言葉で追加希望を伝えられた"],
    tip: "タイトル・色・表示項目・用途のどれか一つが変われば、最初の成功です。",
    page: 38,
  },
  {
    number: "08",
    label: "見てから追加相談する",
    title: "できた画面へ、感想を返そう",
    lead: "一回で決めず、見て感じたことをAIへ返します。ここがバイブコーディングの中心です。",
    actions: ["変更後の画面を自分で触る", "良かったところと違うところを話す", "一つだけ直してもらい、もう一度確認する"],
    prompt: "見てみると、緑色が少し暗く感じました。文字はこのままで、背景だけもう少し明るくしてください。変更後に、どこを変えたか教えてください。",
    checks: ["変更前との違いを説明できた", "追加の修正が画面へ反映された"],
    tip: "『なんとなく違う』『おすすめを見せて』も立派な相談です。",
    page: 39,
  },
  {
    number: "09",
    label: "作品と変更を残す",
    title: "GitHubへ記録してもらおう",
    lead: "今できたファイルと変更の記録をGitHubへ置きます。Gitの操作はAIに任せ、あなたは内容を確認します。",
    actions: ["GitHubへログインできているか確認する", "自分用の非公開リポジトリを作ってもらう", "保存する内容を説明してもらい、記録を依頼する"],
    prompt: "今のアプリをGitHubへ非公開で保存したいです。秘密情報が含まれていないか確認し、これから行うことを説明してから、一つずつ進めてください。",
    checks: ["GitHubで作品名が見える", "今日変えた内容の記録が見える"],
    tip: "GitHubは設計図と工事記録の保管庫です。コマンドを暗記しなくても、保存された内容を見られれば大丈夫です。",
    page: 40,
  },
  {
    number: "10",
    label: "情報を覚える場所をつくる",
    title: "Cloudflare D1をつなごう",
    lead: "公開の前に、アプリが情報を覚えておくD1データベースを作り、DBという名前でアプリへつなぎます。",
    actions: ["Cloudflareへ接続済みか確認してもらう", "講座用のD1データベースを一つ作ってもらう", "バインディング名をDBにそろえ、練習用の表を準備する"],
    prompt: "このアプリ用のCloudflare D1データベースを準備してください。最初にCloudflareへのログイン状態と、同じ名前のD1がすでにないか確認してください。新しく作る必要がある場合は、作成前に名前と影響を説明して私の確認を待ってください。D1バインディング名は必ずDBにしてください。作成後は設定ファイルへ必要な情報を反映し、秘密情報や不要なIDをチャットへ表示しないでください。練習用スキーマを適用する前にも内容を説明し、一操作ずつ進めてください。最後にD1への読み書きをテストし、完了・未完了・次にすることを報告してください。まだ公開はしないでください。",
    checks: ["D1が一つ作成された", "DBという名前で接続テストが成功した"],
    tip: "D1は情報の倉庫です。公開とは分けて、まず保存と読み出しだけを確かめます。",
    page: 41,
  },
  {
    number: "11",
    label: "自分専用アプリを公開する",
    title: "Cloudflareへ公開しよう",
    lead: "接続と保存の確認が終わったら、初めて外部公開を行います。公開URLを開き、動作を一つずつ確認します。",
    actions: ["秘密情報や本物の個人情報がないか確認してもらう", "公開内容と公開範囲を説明してもらい、了承後に公開する", "PCとスマートフォンで開き、一覧・追加・更新・再読み込みを試す"],
    prompt: "このアプリをCloudflareへ公開する準備ができているか確認してください。まず、秘密情報、本物の個人情報、ダミーではない認証情報がファイルに含まれていないか調べ、結果を初心者向けに説明してください。公開で何がインターネットから見えるようになるか、公開URLを知る人が何をできるかを説明し、私が『公開してください』と答えるまで実行しないでください。了承後に一度だけ公開し、公開URLを示してください。その後、一覧表示、追加、更新、再読み込み後の保存を一項目ずつ確認し、問題があれば公開作業を繰り返さず原因を説明してください。最後に公開URL、確認結果、残った課題をまとめてください。",
    checks: ["公開URLをPCとスマートフォンで開けた", "再読み込みしても練習データが残った"],
    tip: "時間内に公開できなくても、制作タスクから続きを再開できます。アプリを変えられた時点で最初の成功です。",
    page: 42,
  },
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

function CatalogPage({ item }: { item: (typeof catalogCases)[number] }) {
  return (
    <section className={`sheet catalog-page ${item.tone}`}>
      <div className="catalog-heading">
        <span className="catalog-number">CASE {item.number}</span>
        <p>{item.category}</p>
      </div>
      <h2>{item.title.split("\n").map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h2>
      <p className="lead small">{item.lead}</p>

      <div className="catalog-services" aria-label="利用するサービス">
        {item.services.map((service, index) => (
          <div key={service}>
            <b>{service}</b>
            {index < item.services.length - 1 && <span>＋</span>}
          </div>
        ))}
      </div>

      <div className="catalog-flow">
        {item.steps.map((step, index) => (
          <div key={step}><span>{index + 1}</span><b>{step}</b></div>
        ))}
      </div>

      <div className="catalog-bottom">
        <div className="catalog-features">
          <h3>できること</h3>
          {item.features.map(feature => <p key={feature}>✓ {feature}</p>)}
        </div>
        <div className="catalog-starter">
          <h3>講座での最初の一歩</h3>
          <p>{item.starter}</p>
        </div>
      </div>
      <div className="catalog-note"><b>最初につなぐ準備</b><p>{item.note}</p></div>
      <PageNumber value={item.page} />
    </section>
  );
}

function PracticePage({ item }: { item: (typeof practiceSteps)[number] }) {
  return (
    <section className="sheet practice-page">
      <div className="practice-heading"><span>PRACTICE {item.number}</span><p>{item.label}</p></div>
      <h2>{item.title}</h2>
      <p className="lead small">{item.lead}</p>
      <div className="practice-actions">
        {item.actions.map((action, index) => <div key={action}><span>{index + 1}</span><p>{action}</p></div>)}
      </div>
      <div className="say-this">
        <p className="say-label">AIへそのまま言ってみよう</p>
        <blockquote>{item.prompt}</blockquote>
      </div>
      <div className="practice-footer">
        <div className="practice-checks"><b>できたらチェック</b>{item.checks.map(check => <p key={check}>□ {check}</p>)}</div>
        <div className="practice-tip"><b>覚えておくこと</b><p>{item.tip}</p></div>
      </div>
      <PageNumber value={item.page} />
    </section>
  );
}

function SetupGuidePage({ item }: { item: (typeof setupGuideSteps)[number] }) {
  return (
    <section className="sheet practice-page setup-guide-page">
      <div className="practice-heading"><span>SETUP {item.number}</span><p>{item.label}</p></div>
      <h2>{item.title}</h2>
      <p className="lead small">{item.lead}</p>
      <div className="practice-actions">
        {item.actions.map((action, index) => <div key={action}><span>{index + 1}</span><p>{action}</p></div>)}
      </div>
      <div className="say-this setup-prompt">
        <p className="say-label">案内役AIへ渡す詳細プロンプト</p>
        <blockquote>{item.prompt}</blockquote>
      </div>
      <div className="practice-footer">
        <div className="practice-checks"><b>このページの完了条件</b>{item.checks.map(check => <p key={check}>□ {check}</p>)}</div>
        <div className="practice-tip"><b>止まったとき</b><p>{item.tip}</p></div>
      </div>
      <PageNumber value={item.page} />
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

        <Chapter number="CATALOG" title="こんなアプリがつくれます" subtitle="まずはCloudflareに、自分専用の小さな仕事場を。必要になったら、普段使っているサービスとつなぎます。" tone="catalog-tone" />

        {catalogCases.map(item => <CatalogPage key={item.number} item={item} />)}

        <section className="sheet connection-page">
          <p className="eyebrow green">サービスとの接続</p>
          <h2>つなぐ準備は、<em>最初に一度。</em><br />つながった後は、いつもの画面から。</h2>
          <p className="lead small">最初はログインや利用許可など、サービスごとの準備があります。そこはCodexに画面を見てもらいながら、一つずつ進めます。</p>
          <div className="connection-setup">
            <div><span>1</span><b>使いたいものを話す</b><p>「GmailとLINEをまとめたい」のように、目的を伝えます。</p></div>
            <i>→</i>
            <div><span>2</span><b>AIと一緒につなぐ</b><p>必要な登録、ログイン、利用許可を順番に設定します。</p></div>
            <i>→</i>
            <div><span>3</span><b>一度、動きを確かめる</b><p>テスト用の情報で、届く・保存できる・表示できるを確認します。</p></div>
          </div>
          <div className="connected-state">
            <div className="connected-icon">✓</div>
            <div><p className="connected-kicker">つながった後</p><h3>自分専用アプリを開けば、同じ仕事が動きます</h3><p>毎回むずかしい設定をやり直すのではなく、メールを見る、タスクを整理する、返信案を作るといった仕事を、同じ画面から繰り返し使えます。</p></div>
          </div>
          <div className="reconnect-note">サービス側の仕様変更やログイン期限が切れたときは、AIと一緒に再接続します。</div>
          <PageNumber value={9} />
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
          <PageNumber value={11} />
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
          <PageNumber value={12} />
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
          <PageNumber value={13} />
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
          <PageNumber value={15} />
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
          <PageNumber value={16} />
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
          <PageNumber value={17} />
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
          <PageNumber value={18} />
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
          <PageNumber value={20} />
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
          <PageNumber value={21} />
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
          <PageNumber value={22} />
        </section>

        <Chapter number="04" title="アカウントと接続を、一つずつ準備しよう" subtitle="作る前の準備もAIに任せます。一操作ずつ進み、画面を確認してから次へ進みます。" tone="setup-tone" />

        {setupGuideSteps.map(item => <SetupGuidePage key={item.number} item={item} />)}

        <Chapter number="05" title="実際にバイブコーディングを始めよう！" subtitle="ここからは参加者用の実践ガイドです。今いるページを見ながら、一つずつ進めます。" tone="practice-tone" />

        {practiceSteps.map(item => <PracticePage key={item.number} item={item} />)}

        <Chapter number="06" title="当日の流れ" subtitle="2026年8月23日 13:00〜18:00｜全員の目標は「相談して、一つ変える」まで。" tone="orange-tone" />

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
          <PageNumber value={44} />
        </section>

        <section className="sheet safety">
          <p className="eyebrow red">安心して使うために</p>
          <h2>秘密の情報は、渡さない</h2>
          <div className="safety-grid">
            <article className="safe"><h3>○ AIに見せてよいもの</h3><ul><li>作りたいものの説明</li><li>架空の練習データ</li><li>秘密を隠した画面写真</li><li>エラーメッセージ</li></ul></article>
            <article className="unsafe"><h3>× AIへ貼らないもの</h3><ul><li>パスワード・確認コード</li><li>カード情報・秘密鍵</li><li>本物のお客様情報</li><li>公開してはいけない資料</li></ul></article>
          </div>
          <div className="before-public"><b>公開の前に3つ確認</b><div><span>1</span>本物の個人情報がない</div><div><span>2</span>秘密の文字がない</div><div><span>3</span>講師と一緒に画面を見る</div></div>
          <PageNumber value={45} />
        </section>

        <Chapter number="07" title="困ったときも、AIに聞こう" subtitle="止まった画面は失敗ではなく、次の質問に使う材料です。" tone="purple-tone" />

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
          <PageNumber value={47} />
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
          <PageNumber value={48} />
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
          <PageNumber value={49} />
        </section>
      </div>
    </main>
  );
}

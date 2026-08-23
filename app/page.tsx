"use client";

import { useState } from "react";
import SupportGuide from "./support-guide";
import {
  COURSE_EVENT_DATE,
  GOOGLE_DRIVE_SUBMISSION_FOLDER_URL,
  REPOSITORY_NAME_EXAMPLE,
  REPOSITORY_NAME_FALLBACKS,
  SUPPORT_REPOSITORY_URL,
  SUPPORT_SITE_URL,
} from "./support-context";

function deckPrompt(stepId: string, target: "準備用チャット" | "AI相談室" | "制作スレッド", instruction: string) {
  return `街場のAI屋さん公式ガイド：${SUPPORT_SITE_URL}\n教材・AI手順の正本：${SUPPORT_REPOSITORY_URL}\nSTEP ID：${stepId}\n貼り付け先：${target}\nURLを読めない場合は読んだふりをせず伝えてください。\n\n${instruction}`;
}

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
    title: "まず、準備を「一つずつ案内」してもらおう",
    lead: "作品のフォルダを作る前は、普通のChatGPTまたはClaudeを準備案内に使います。ここではまだGitHub Issueへ記録しません。",
    actions: ["ChatGPTまたはClaudeのチャットを開く", "下の詳細プロンプトをコピーして送る", "AIがPCについて一問だけ質問したか確認する"],
    prompt: deckPrompt("setup-guidance", "準備用チャット", "あなたは、AIやパソコンに不慣れな人の講座準備案内係です。一度の返答では一問または一操作だけ示し、操作する理由、うまくいけば見えるもの、終わったら返してほしい言葉を伝えて待ってください。パスワード、認証コード、秘密鍵、カード情報、コマンドの生出力は要求・保存しないでください。まだ作品のprivate GitHubリポジトリはないため、GitHub Issueへの記録やCloudflare接続は始めないでください。最初は、私が使っているPCがMacかWindowsかを一問だけ質問してください。"),
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
    lead: "ブラウザで作ったGitHubアカウントと、このPCを一度つなぎます。このページでは接続だけを確認し、作品repoやIssueは次の章で作ります。",
    actions: ["GitHub CLIがあるか確認してもらう", "必要なら公式手順で導入する", "ブラウザ認証を自分で許可し、接続状態だけを確認する"],
    prompt: deckPrompt("github-connect", "準備用チャット", "このPCとGitHubの接続を、一操作ずつ案内してください。GitHub CLIがなければ、公式手順による導入を説明し、私の確認を待ってから進めてください。接続確認では標準出力と標準エラーを表示せず、終了ステータスだけを使ってください。ブラウザ認証、インストール、ログインの前には、何が変わるかを説明して私の返事を待ってください。ユーザー名、メール、認証コード、トークンはチャットへ表示しないでください。ここではリポジトリ作成、Issue作成、Cloudflare接続を行わないでください。"),
    checks: ["PCからGitHubへ接続できた", "作品repoやIssueはまだ作っていない"],
    tip: "接続・作品の保存場所・相談記録を分けると、どこまで終わったかが分かります。",
    page: 29,
  },
  {
    number: "07",
    label: "実践の順番を確認する",
    title: "作品の場所を作ってから、相談記録を始めます",
    lead: "Cloudflareへ先につなぎません。スターターを自分のprivate GitHub repoへ保存し、正しいフォルダをAIで開いてから記録を始めます。",
    actions: ["スターターを受け取る", "private repoを作り、main・origin・pushを確認する", "repoをAIで開き、同梱ツール確認→Issue開始→Cloudflare接続の順に進む"],
    prompt: deckPrompt("practice-order", "準備用チャット", "次の実践順を確認してください。1 スターター取得、2 参加者自身のprivate GitHub repoを作成してGit初期化・main・origin・初回pushを確認、3 そのrepoをCodexまたはClaude Codeで開く、4 同梱されたscripts/support-session.mjsのhelpを確認、5 repo名とは別の相談用表示名の保存了承後に相談Issueを開始してread-back、6 その後にプロジェクトからCloudflareへ接続、です。順番を入れ替えず、今は最初の未完了項目だけを質問してください。"),
    checks: ["private repoが相談記録の前提だと分かった", "Cloudflare接続はIssue開始後だと分かった"],
    tip: "作品の場所が先に決まるため、相談履歴を別のrepoへ誤記録しにくくなります。",
    page: 30,
  },
] as const;

const practiceSteps = [
  {
    number: "01",
    label: "見本を受け取る",
    title: "スターターフォルダを準備しよう",
    lead: "最初から全部を作らず、講師が用意した見本を受け取り、自分の作品にする準備をします。",
    actions: ["講師が案内したGoogle DriveからスターターZIPをダウンロードする", "ZIPを展開して普通のフォルダにする", "README.mdとscriptsフォルダがあることを確認する"],
    prompt: deckPrompt("starter-acquisition", "準備用チャット", "スターターZIPをダウンロードしました。まだCloudflare接続やIssue作成は始めず、ZIPを展開して、README.mdとscripts/support-session.mjsが見えるところまで一操作ずつ案内してください。フォルダの絶対パス、ユーザー名、個人情報はチャットへ書かせないでください。"),
    checks: ["ZIPではなくフォルダが見える", "README.mdとscripts/support-session.mjsがある"],
    tip: "必要なサポート道具まで入っているスターターを使います。足りなければ、先へ進まず講師へ確認します。",
    page: 32,
  },
  {
    number: "02",
    label: "自分の保管場所をつくる",
    title: "private GitHub repoへ最初の版を保存しよう",
    lead: "相談履歴を始める前に、スターターを参加者自身のprivate repoへ保存します。AIまたは講師がGit操作を行い、あなたは公開範囲と結果を確認します。",
    actions: [`相談用表示名とは別に、${REPOSITORY_NAME_EXAMPLE}のようなrepo名を確認する`, "スターターでGitを初期化し、mainとoriginを設定する", "最初のcommitをpushし、GitHub上のファイルとPrivate表示を読み戻す"],
    prompt: deckPrompt("private-repo-bootstrap", "準備用チャット", `このスターターフォルダを、私自身の新しいprivate GitHub repoへ保存するセットアップだけを案内してください。相談用表示名は日本語も使えるニックネームですが、repo名には使いません。repo名は本名、ニックネーム、メールアドレスを含まない英小文字・数字・ハイフンだけの技術名にしてください。最初の候補は「${REPOSITORY_NAME_EXAMPLE}」とし、既に存在する場合だけ「${REPOSITORY_NAME_FALLBACKS[0]}」「${REPOSITORY_NAME_FALLBACKS[1]}」の順で増やしてください。最初に候補名、Privateで作ること、変更される内容を説明し、私の確認を待ってください。了承後、Git初期化、既定branchをmainに設定、秘密情報と不要ファイルの除外確認、最初のcommit、新しいprivate repoの作成、origin設定、pushを一操作ずつ進めてください。最後に承認したrepo名との一致、GitHub上のPrivate表示、main、ファイル、remote commitをread-backしてください。remote URL、ユーザー名、メール、ローカルパス、生のコマンド出力は表示しないでください。まだsupport-sessionのstart、Issue作成、Cloudflare接続、merge、deployは行わないでください。`),
    checks: ["個人情報を含まないASCIIのrepo名を確認した", "GitHubでPrivateと表示される", "main・origin・最初のpushを確認できた"],
    tip: "repo名は作品を置く技術名、表示名は相談で呼ばれるニックネームです。分けておくと、個人情報をrepo名へ入れずに済みます。",
    page: 33,
  },
  {
    number: "03",
    label: "制作AIに作業場所を渡す",
    title: "private repoのフォルダを開こう",
    lead: "保存先が確定したフォルダを、CodexまたはClaude Codeで制作プロジェクトとして開きます。",
    actions: ["ChatGPTデスクトップのCodex、またはClaude Codeを開く", "今作ったprivate repoのフォルダを選ぶ", "AIにrepo名・Private・originの確認だけをしてもらう"],
    prompt: deckPrompt("open-private-repo", "制作スレッド", "今開いているフォルダが、先ほど作成・初回pushを確認した私自身のprivate GitHub repoか、安全に確認してください。repo名、Privateであること、originがそのrepoを指すことだけを確認し、remote URL、ユーザー名、メール、ローカルパス、コマンドの生出力は表示しないでください。まだsupport-sessionのstart、Issue作成、Cloudflare接続、ファイル変更は行わないでください。"),
    checks: ["制作AIが正しいprivate repoを開いている", "別repoや公開教材repoではない"],
    tip: "画面の名称やボタンの位置は更新で変わることがあります。画面が違えば、そのままAI相談室へ見せます。",
    page: 34,
  },
  {
    number: "04",
    label: "同梱された支援道具を確認する",
    title: "support-sessionが使えるか確かめよう",
    lead: "Issueを作る前に、スターターへ正しい記録ツールとスキルが入っているか確認します。",
    actions: ["scripts/support-session.mjsがあるか確認する", "node scripts/support-session.mjs --helpを実行する", "start・consultation・artifact・historyなど必要なコマンドが表示されるか確認する"],
    prompt: deckPrompt("support-tool-check", "制作スレッド", "このprivate repoに同梱されたサポート道具を確認してください。最初にscripts/support-session.mjsと.agents/skills/machiba-beginner-support/SKILL.mdがあるか確認し、次にnode scripts/support-session.mjs --helpだけを実行してください。helpに表示されたコマンドと引数だけを使い、存在しないコマンドを推測しないでください。不足または実行失敗ならIssueを作ったふりをせず、講師へ確認する一文を示してください。まだstart、Issue作成、Cloudflare接続は行わないでください。"),
    checks: ["support-sessionのhelpを終了コード0で確認できた", "必要なコマンドが実際のhelpに表示された"],
    tip: "正しい道具がなければ、この先の記録を始めず、スターターを取り直します。",
    page: 35,
  },
  {
    number: "05",
    label: "相談履歴を開始する",
    title: "相談用表示名を確認して、最初のIssueを始めよう",
    lead: "正しいprivate repoと記録ツールを確認できたら、repo名とは別に本人が選んだニックネームで相談履歴を始めます。日本語も使えます。",
    actions: ["Issueで使う相談用表示名と閲覧範囲の説明を受ける", "private repoへ保存してよいか一問で確認する", "start後にIssue番号・相談用表示名・目的をGitHubから読み戻す"],
    prompt: deckPrompt("consultation-start", "AI相談室", "このprivate repoで初心者サポートを始めます。サイトの端末内進捗で使っているニックネームが分かる場合は候補として示し、分からない場合だけ、本名でなくてよい相談用表示名を一問で質問してください。相談用表示名には日本語のニックネームも使え、その名前がprivate repoのIssueと招待済みcollaboratorに見えることを説明してください。端末内進捗への保存とは別に、Issueへ保存してよいか一問だけ確認してください。了承後、実際の--helpに従い、--display-nameと--confirm-display-nameを使って相談Issueをstartしてください。書き込み後にGitHubからIssue番号、相談用表示名、目的をread-backし、確認できなければ未反映と報告してください。相談用表示名以外の個人情報、会話全文、生の出力は記録しないでください。公開repo、公開教材repo、別repoでは開始しないでください。"),
    checks: ["相談用表示名の保存を自分で了承した", "private IssueをGitHubからread-backできた"],
    tip: "ここから相談・試行・失敗・解決・学び・次の一手を、会話全文ではなく構造化して残します。",
    page: 36,
  },
  {
    number: "06",
    label: "Issue開始後に外部接続する",
    title: "プロジェクトからCloudflareへ接続しよう",
    lead: "相談Issueを開始できた後で、プロジェクトに同梱されたWranglerからCloudflareへつなぎます。",
    actions: ["package.jsonとプロジェクト内のWranglerを確認する", "必要な導入やブラウザ認証の前に説明を受ける", "whoamiを無出力で確認し、接続結果を相談Issueへ記録する"],
    prompt: deckPrompt("cloudflare-connect", "制作スレッド", "このprivate repoの相談Issueをread-backできていることを最初に確認し、その後にプロジェクトとCloudflareの接続を一操作ずつ進めてください。package.jsonとプロジェクト内のWranglerだけを確認し、npxで未導入パッケージを自動取得しないでください。導入やブラウザ認証の前に目的と影響を説明し、私の返事を待ってください。whoamiは標準出力と標準エラーを抑制し終了ステータスだけで判定してください。アカウント名、メール、Account ID、認証コード、トークンは表示・記録しないでください。結果はconsultationまたはeventで構造化し、Issueからread-backしてください。まだD1作成や公開はしないでください。"),
    checks: ["Issue開始後にCloudflareへ接続できた", "D1作成や公開はまだ行っていない"],
    tip: "Cloudflareで止まっても、Issueに現在地が残るため同じ場所から再開できます。",
    page: 37,
  },
  {
    number: "07",
    label: "まず動くものを見る",
    title: "アプリをPCの中で開こう",
    lead: "変更する前に見本を動かし、画面と保存の動きを確認します。",
    actions: ["不足する道具だけを公式手順で準備する", "Codexにアプリを起動してもらう", "一覧・追加・更新を一度ずつ試し、結果をIssueへ記録する"],
    prompt: deckPrompt("local-run", "制作スレッド", "このスターターアプリをPCの中で動かす準備を確認し、足りないものだけを一操作ずつ案内してください。インストール前に目的と影響を説明し、私の確認を待ってください。準備後にアプリを起動し、私が開くローカルURLを教えてください。一覧、追加、更新を一項目ずつ確認し、結果を相談Issueへ構造化してread-backしてください。まだ公開はしないでください。"),
    checks: ["ブラウザにアプリが表示された", "練習データの追加・更新を確認できた"],
    tip: "まだインターネットには公開されていません。まず自分のPCで安心して試します。",
    page: 38,
  },
  {
    number: "08",
    label: "音声で頼み、見て返す",
    title: "自分らしく、一つ変えてみよう",
    lead: "希望を話し、出てきた画面を見て、感想をもう一度返します。ここがバイブコーディングの中心です。",
    actions: ["タイトル・色・項目・用途から一つ選ぶ", "誰がどう使うかを音声で話す", "変更後を触り、良い点と直したい点を一つ返す"],
    prompt: deckPrompt("voice-change", "制作スレッド", "この画面を私向けに変えたいです。まずタイトルを『お客様連絡帳』にして、落ち着いた緑色の雰囲気にしてください。ほかに決めることがあれば、一度に一つ質問してください。変更後は私が画面を確認するまで待ち、感想を聞いてから追加修正を一つだけ行ってください。相談内容、試したこと、結果、解決、学び、次の一手をconsultationで構造化し、Issueからread-backしてください。"),
    checks: ["自分の言葉で一つ変更できた", "見た感想を返し、追加修正を確認できた"],
    tip: "『なんとなく違う』『おすすめを見せて』も立派な相談です。",
    page: 39,
  },
  {
    number: "09",
    label: "作品と変更を残す",
    title: "GitHubへ記録してもらおう",
    lead: "今できたファイルをcommit・pushし、変更内容と相談から得た学びを同じIssueへ結び付けます。Git操作はAIに任せ、あなたは要約を確認します。",
    actions: ["秘密情報・意図しない変更・テスト結果を確認してもらう", "現在のbranchへcommit・pushしてもらう", "remote SHAと相談記録をIssueから読み戻す"],
    prompt: deckPrompt("git-save", "制作スレッド", "今のアプリをGitHubへ保存してください。最初に秘密情報、意図しない変更、テスト結果を確認してください。問題がなければ現在の作業branchへcommit・pushし、live remoteで確認した40桁full SHA、変更の要約、今回の相談・解決・学び・次の一手をconsultationで同じIssueへ記録して、GitHubからread-backしてください。mainへのmergeとCloudflare公開はまだ行わないでください。"),
    checks: ["GitHubのremoteでcommitを確認できた", "SHAと構造化相談がIssueから確認できた"],
    tip: "コードはcommit、相談の要点はIssueに残すため、次のAIが両方を確認できます。",
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
  const target = item.number === "01" ? "AI相談室" : "制作スレッド";
  return (
    <section className="sheet practice-page">
      <div className="practice-heading"><span>PRACTICE {item.number}</span><p>{item.label}</p></div>
      <h2>{item.title}</h2>
      <p className="lead small">{item.lead}</p>
      <div className="practice-actions">
        {item.actions.map((action, index) => <div key={action}><span>{index + 1}</span><p>{action}</p></div>)}
      </div>
      <div className="say-this">
        <p className="say-label">{target}へそのまま渡す</p>
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
  const target = Number.parseInt(item.number, 10) <= 5 ? "AI相談室" : "制作スレッド";
  return (
    <section className="sheet practice-page setup-guide-page">
      <div className="practice-heading"><span>SETUP {item.number}</span><p>{item.label}</p></div>
      <h2>{item.title}</h2>
      <p className="lead small">{item.lead}</p>
      <div className="practice-actions">
        {item.actions.map((action, index) => <div key={action}><span>{index + 1}</span><p>{action}</p></div>)}
      </div>
      <div className="say-this setup-prompt">
        <p className="say-label">{target}へ渡す詳細プロンプト</p>
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
  const [view, setView] = useState<"support" | "deck">("support");

  return (
    <main className={`site-view-${view}`}>
      <header className="site-bar">
        <a href="#support" className="brand" aria-label="参加者サポートへ" onClick={() => { setView("support"); setMenuOpen(false); }}>
          <span className="brand-mark">街</span>
          <span>街場のAI屋さん<br /><small>はじめてのアプリづくり</small></span>
        </a>
        <div className="site-actions">
          <button className={view === "support" ? "active" : ""} onClick={() => { setView("support"); setMenuOpen(false); }}>実践サポート</button>
          <button className={view === "deck" ? "active" : ""} onClick={() => { setView("deck"); setMenuOpen(false); }}>A4教材</button>
          <button className="outline-button" onClick={() => window.print()}>A4で印刷</button>
          {view === "deck" && <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>目次</button>}
        </div>
      </header>

      {view === "deck" && (
        <nav className={menuOpen ? "toc open" : "toc"} aria-label="章の目次">
          {pages.map(([number, label]) => (
            <a key={number} href={number === "00" ? "#top" : `#chapter-${number}`} onClick={() => setMenuOpen(false)}>
              <span>{number}</span>{label}
            </a>
          ))}
        </nav>
      )}

      <SupportGuide active={view === "support"} onOpenDeck={() => { setView("deck"); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

      <div className={`deck${view === "deck" ? "" : " deck-hidden"}`} id="top">
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
              ["提出", "公開確認後、成果物をDriveへ提出"],
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
            <div className="sf gh"><small>設計図と作業日誌</small><b>GitHub</b></div><span>→</span>
            <div className="sf cf"><small>動くアプリ</small><b>Cloudflare</b></div>
            <div className="db-link">↕</div>
            <div className="sf d1"><small>情報の倉庫</small><b>Cloudflare D1</b></div>
          </div>
          <div className="google-link"><b>Googleの道具</b><p>カレンダー、スプレッドシート、ドライブなどは、必要になったときにアプリとつなぎます。</p></div>
          <Point>Codexが作業し、相談内容・試したこと・失敗・解決方法・学び・次の一手をGitHubへ記録します。あなたは質問に答え、結果を見て希望を伝えます。</Point>
          <PageNumber value={17} />
        </section>

        <section className="sheet rooms">
          <p className="eyebrow purple">AIとの付き合い方</p>
          <h2>相談と制作を、GitHubの作業日誌でつなぎます</h2>
          <div className="room-grid">
            <article className="advice-room"><span>private repoで使う</span><div className="room-icon">?</div><h3>AI相談室</h3><p>言葉の意味を聞く。現在地を整理する。GitHub Issueから相談・試行・解決・学びを読む。</p><b>作品ごとの相談スレッド</b></article>
            <div className="room-arrow">→</div>
            <article className="work-room"><span>作業ごとに作る</span><div className="room-icon">⌘</div><h3>制作スレッド</h3><p>ファイルを作り、動かし、commitする。結果を同じGitHub Issueへ自動で返す。</p><b>作業ごとに別のタスク</b></article>
          </div>
          <div className="pin-prompt"><b>AI同士の共通記録</b><code>GitHub Issue｜AI相談セッション</code><p>会話全文ではなく、相談・試行・失敗・解決・学び・次の一手を構造化して残します。</p></div>
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

        <Chapter number="04" title="アカウントとGitHub接続を準備しよう" subtitle="作品を受け取る前の準備です。Cloudflareとの接続は、private repoへ相談Issueを作った後に行います。" tone="setup-tone" />

        {setupGuideSteps.map(item => <SetupGuidePage key={item.number} item={item} />)}

        <Chapter number="05" title="実際にバイブコーディングを始めよう！" subtitle="ここからは参加者用の実践ガイドです。今いるページを見ながら、一つずつ進めます。" tone="practice-tone" />

        {practiceSteps.map(item => <PracticePage key={item.number} item={item} />)}

        <Chapter number="06" title="当日の流れ" subtitle="2026年8月23日 13:00〜18:00｜全員の目標は「相談して、一つ変える」まで。" tone="orange-tone" />

        <section className="sheet schedule">
          <p className="eyebrow orange">5時間のカリキュラム</p>
          <h2>ゆっくり準備して、後半で一つ作ります</h2>
          <div className="timeline">
            <div><time>13:00</time><span /><p><b>知る</b>アプリ、バイブコーディング、役割分担</p></div>
            <div><time>14:05</time><span /><p><b>AIを準備</b>デスクトップアプリ、準備用チャット</p></div>
            <div><time>15:00</time><span /><p><b>休憩</b>15分。困っているところを個別確認</p></div>
            <div><time>15:15</time><span /><p><b>場所を準備</b>GitHub・Cloudflareの登録</p></div>
            <div><time>15:55</time><span /><p><b>作品の場所</b>スターター取得、private repo作成・初回push</p></div>
            <div><time>16:20</time><span /><p><b>相談記録</b>repoをAIで開く、同梱ツール確認、Issue開始</p></div>
            <div><time>16:40</time><span /><p><b>接続・制作</b>Cloudflare接続、音声で一つ変更</p></div>
            <div><time>17:25</time><span /><p><b>公開・提出</b>公開URL確認、成果物ZIPをDriveへ提出</p></div>
          </div>
          <div className="must-goal"><b>全員の成功</b><span>AI相談室を作る</span><span>Issue記録を始める</span><span>一つ変えて提出する</span></div>
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
            <details><summary><span>Q4</span>公開まで終わりませんでした</summary><p>GitHubの相談Issueに、相談内容・背景・試したこと・失敗・解決方法・学び・次の一手が残ります。次のAIはIssueを読み、同じ場所から再開します。</p></details>
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

        <section className="sheet drive-submit-page">
          <p className="eyebrow blue-text">最後のSTEP</p>
          <h2>成果物をGoogle Driveへ提出しよう</h2>
          <p className="lead small">標準はブラウザからの提出です。AI連携は、時間と環境に余裕がある人だけが選ぶ発展ルートです。</p>

          <div className="deck-drive-name-check">
            <b>① 共有フォルダで見える名前を決める</b>
            <p>この提出先は、リンクを知る人が閲覧・追加できる場所です。ファイル名の表示名や内容も見えます。本名でなくニックネームで大丈夫。見える範囲を確認してから使います。</p>
            <code>{COURSE_EVENT_DATE}_表示名_成果物.zip</code>
          </div>

          <div className="deck-drive-routes">
            <article className="standard">
              <span>標準</span>
              <h3>ブラウザから追加</h3>
              <ol><li>Googleアカウントで提出先を開く</li><li>自分のZIPだけを新規追加</li><li>一覧を更新し、同じ名前を確認</li></ol>
              <a href={GOOGLE_DRIVE_SUBMISSION_FOLDER_URL} target="_blank" rel="noreferrer">受講者用フォルダを開く ↗</a>
              <small>他の人のファイルを開く・移動・改名・削除しない。共有権限も変えません。</small>
            </article>
            <article className="optional">
              <span>任意・発展</span>
              <h3>AIから新規アップロード</h3>
              <ol><li>既存の公式連携を確認</li><li>なければ権限を一操作ずつ説明</li><li>接続承認と提出承認を分ける</li></ol>
              <p>Google公式OAuth／公式コネクタだけを使います。約7分または同じ場所で3回止まったら、標準ルートへ戻ります。</p>
              <small>APIキー・認証コード・トークンはチャットへ貼りません。</small>
            </article>
          </div>

          <div className="deck-drive-finish">
            <div><b>ZIPに入れない</b><p>.env ／ 秘密鍵・トークン ／ node_modules ／ .wrangler ／ 個人・顧客データ</p></div>
            <div><b>② Drive提出を確認</b><p>一覧またはメタデータで、指定フォルダ直下に同じファイル名があることを確認。</p></div>
            <div><b>③ Issue記録を別に確認</b><p>artifactで親・ファイル名のread-back済み結果を記録し、GitHub Issueから読み戻す。</p></div>
          </div>
          <p className="deck-drive-parent"><b>確認は2つです：</b>Driveで提出確認済みでも、Issueが未反映なら再アップロードしません。Issueの同期だけをやり直します。2026年8月23日18:00の講座終了後、運営は新規追加を止めるため提出先の共有権限を見直します。</p>
          <PageNumber value={49} />
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
            <a href={SUPPORT_SITE_URL}>公式ガイド</a>
            <a href={SUPPORT_REPOSITORY_URL} target="_blank" rel="noreferrer">公開リポジトリ</a>
          </div>
          <PageNumber value={50} />
        </section>
      </div>
    </main>
  );
}

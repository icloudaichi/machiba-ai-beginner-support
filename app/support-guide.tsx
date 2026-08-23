"use client";

import { useEffect, useState } from "react";
import {
  buildParticipantPromptContext,
  buildSubmissionRecordPrompt,
  canUseDisplayNameInIssue,
  canRecordDriveIssue,
  clearLegacySupportProgress,
  deriveGate,
  deriveDriveIssueRecordStatus,
  initialProgress,
  isDeviceDisplayNameLocked,
  nextConnectionStep,
  sanitizeDisplayName,
  sanitizeDriveFileUrl,
  sanitizeProgress,
  sanitizeSubmissionFileName,
  saveDisplayNameToDevice,
  SUPPORT_PROGRESS_STORAGE_KEY,
  stepOrder,
  type ConnectionStatus,
  type DriveIssueRecordStatus,
  type DriveSubmissionStatus,
  type GitHubLogStatus,
  type StepId,
  type SubmissionUploadRoute,
  type SupportMode,
  type SupportProgress,
} from "./support-state";
import {
  COURSE_EVENT_DATE,
  GOOGLE_DRIVE_SUBMISSION_FOLDER_ID,
  GOOGLE_DRIVE_SUBMISSION_FOLDER_URL,
  REPOSITORY_NAME_EXAMPLE,
  REPOSITORY_NAME_FALLBACKS,
  STARTER_ZIP_URL,
  SUPPORT_REPOSITORY_URL,
  SUPPORT_SITE_URL,
  SUPPORT_SKILL_URL,
  type PromptTarget,
  withOfficialContext,
} from "./support-context";

const stepLabels: Record<StepId, string> = {
  device: "PCと使うAI",
  "github-account": "GitHubアカウント",
  "github-connect": "PCとGitHubの接続",
  "starter-obtain": "スターターを受け取る",
  "repository-setup": "privateリポジトリを準備",
  "project-folder": "制作AIでフォルダを開く",
  "support-kit": "サポート機能を確認",
  "github-log": "相談Issueを開始",
  "cloudflare-account": "Cloudflareアカウント",
  "cloudflare-connect": "PCとCloudflareの接続",
  "setup-gate": "接続準備の確認",
  "support-mode": "案内の細かさ",
  idea: "作りたいものの相談",
  starter: "スターターを変更",
  publish: "公開または次回へ",
  submit: "成果物をGoogle Driveへ提出",
};

const connectionLabels: Record<ConnectionStatus, string> = {
  unknown: "未確認",
  preparing: "準備中",
  "account-ready": "アカウント準備済み",
  connected: "PC接続済み",
  "account-blocked": "アカウント認証で停止",
  "connection-blocked": "PC接続で停止",
};

const supportModeLabels: Record<SupportMode, string> = {
  "": "未確認",
  slow: "ゆっくり伴走",
  step: "一操作ずつ",
  summary: "要点案内",
};

const githubLogLabels: Record<GitHubLogStatus, string> = {
  "not-started": "未開始",
  "local-queued": "PC内で同期待ち",
  synced: "Issueへ同期済み",
  blocked: "記録を保留",
};

const driveSubmissionLabels: Record<DriveSubmissionStatus, string> = {
  "not-started": "未提出",
  submitted: "Drive提出済み",
};

const driveIssueRecordLabels: Record<DriveIssueRecordStatus, string> = {
  "not-started": "未開始",
  waiting: "Issue記録待ち",
  synced: "Issue記録済み",
};

const prompts = {
  githubAccount: withOfficialContext("github-account", "AI相談室", "GitHubの個人アカウントを準備したいです。まず既存アカウントがあるかを一つだけ質問してください。作成が必要ならGitHub公式ページだけを使い、一度に一操作ずつ案内してください。パスワード、メールの確認コード、秘密の文字はチャットへ貼らせないでください。メール認証が終わり、GitHubへログインできたら、その事実だけを確認してください。"),
  githubConnect: withOfficialContext("github-connect", "制作スレッド", "このPCとGitHubの接続状況を確認してください。最初にGitHub CLIが既にあるかを確認し、未導入なら勝手にインストールせず必要な作業を一つだけ説明してください。CLIがある場合は、OSに合う方法で gh auth status の標準出力と標準エラーを抑制し、終了ステータスだけを確認してください。コマンド出力、GitHubユーザー名、メール、組織名などのアカウント情報はチャットへ表示せず、『接続済み／未接続』だけを報告してください。インストールやブラウザ認証を始める前に私の確認を待ち、パスワード、認証コード、アクセストークンはチャットへ貼らせないでください。接続後も同じ終了ステータスだけの方法で再確認してください。"),
  starterObtain: withOfficialContext("starter-obtain", "AI相談室", `スターターを準備したいです。最初に、次のどちらかを一つだけ確認してください。

1. 公式ZIPをこれからダウンロードして展開する
2. すでにPCにある展開済みスターターのフォルダを使う

スターターZIP：
${STARTER_ZIP_URL}

ZIPから始める場合だけMacかWindowsかを確認し、この公式URLから保存・展開する操作を一度に一つずつ案内してください。このURL以外から別のファイルを取得しないでください。PCに展開済みのフォルダがある場合は再ダウンロードせず、そのフォルダを使ってください。どちらの場合も、ZIPのままではなく普通のフォルダになっており、README.mdとscripts/support-session.mjsがあることを読み取り確認してください。確認できない場合は別のファイルを推測せず、足りないものを一つだけ伝えてください。まだGit初期化、GitHubリポジトリ作成、Issue作成、インストールは行わないでください。ファイルの絶対パスやPCのユーザー名はチャットへ表示せず、『スターターのフォルダを確認できた／まだ』だけを報告してください。`),
  repositorySetup: withOfficialContext("repository-setup", "制作スレッド", `展開済みスターターを、参加者自身のprivate GitHubリポジトリとして準備してください。最初に、現在地が展開したスターターのルートであり、まだセッションIssueを開始していないことを確認してください。相談用表示名は日本語も使えるニックネームですが、repo名には使いません。repo名は本名、ニックネーム、メールアドレスを含まない英小文字・数字・ハイフンだけの技術名にします。まず「${REPOSITORY_NAME_EXAMPLE}」を候補として一つ提示し、既に存在すると確認できた場合だけ「${REPOSITORY_NAME_FALLBACKS[0]}」「${REPOSITORY_NAME_FALLBACKS[1]}」の順で増やしてください。候補名、Privateで作ること、変更される内容を説明し、私の確認を待ってください。了承後、git init（main）、最初のcommit、privateリポジトリ作成、origin設定、pushを一操作ずつ案内してください。GitHub上のリポジトリ作成・pushは状態を変えるため、実行前に対象、privateであること、影響を説明して私の確認を待ってください。publicリポジトリは作らないでください。完了時は、承認したrepo名と一致すること、Gitリポジトリであること、originがあること、GitHub側がprivateであること、現在のcommitがpush済みであることだけを報告してください。remote URL、ユーザー名、メール、ローカルパス、生のコマンド出力、秘密情報は表示しないでください。まだIssueは作成しないでください。`),
  projectFolder: withOfficialContext("project-folder", "AI相談室", "先ほどprivate GitHubリポジトリとして準備した、展開済みスターターのフォルダを制作AIで開きたいです。ChatGPT / Codexなら対象フォルダをプロジェクトとして開く方法を、Claude / Claude Codeなら対象フォルダで制作を始める方法を、一度に一操作だけ案内してください。ZIP、空のフォルダ、公開教材リポジトリではなく、今作った参加者自身のprivateアプリ用リポジトリを開けたことを確認してください。開いた後は、Gitリポジトリでoriginが設定されていることを読み取り確認し、その事実だけを報告してください。まだIssue作成、ファイル変更、インストール、公開は行わないでください。"),
  supportKit: withOfficialContext("support-kit", "制作スレッド", "今開いている参加者自身のprivateアプリ用リポジトリで、相談記録用サポート機能が同梱されているか読み取り確認してください。最初にGitリポジトリでoriginがあることを確認し、その後 scripts/support-session.mjs が存在するか確認してください。存在する場合だけ node scripts/support-session.mjs --help を実行し、終了コード0とstart・status・consultation・artifactの入口が表示されることを確認してください。まだstartやIssue作成は実行しないでください。スクリプトがない、helpが失敗する、または現在地がGitリポジトリでない場合は、代わりのコマンドを推測せず『サポート機能を確認できません』と報告してください。生の出力、絶対パス、アカウント情報、秘密情報は表示しないでください。"),
  sessionStart: withOfficialContext("github-log", "制作スレッド", "この制作スレッドで行う相談と作業を、今開いている参加者自身の非公開アプリ用リポジトリのGitHub Issueへ自動記録してください。最初に、1. 今いる場所がGitリポジトリ、2. origin設定済み、3. GitHub側がprivate、4. 現在のcommitがpush済み、5. scripts/support-session.mjsの--helpが成功済み、の5点を読み取り確認してください。一つでも確認できなければIssueを作らず、不足している一つだけを報告してください。公開教材リポジトリ machiba-ai-beginner-support へ参加者の相談ログを書かないでください。この依頼は、このセッションに限り、構造化した作業記録のIssue作成・コメント・再読み取りと、私がセッション終了を依頼した後のIssueクローズを許可します。コードのmerge、Cloudflare公開、外部送信の許可ではありません。1つのアプリ用リポジトリでは、同時に進めるサポートセッションを1つにしてください。まず status を確認し、未開始なら start を使ってください。記録は会話のまとまりごとに『相談内容』『試したこと』『うまくいかなかったこと』『解決方法または未解決の現在地』『今回の学び』『次にする一つ』へ整理し、会話全文を貼り付けず、書いた内容を再読み取りしてください。パスワード、認証コード、トークン、秘密鍵、個人情報、ファイルの絶対パス、生のコマンド出力は記録しないでください。成功したら『Issueへ同期済み』とIssue番号だけ、GitHubへ書けない場合は『PC内で同期待ち』、安全上止めた場合は『記録を保留』と報告してください。"),
  cloudflareAccount: withOfficialContext("cloudflare-account", "AI相談室", "Cloudflareの無料アカウントを準備したいです。まず既存アカウントがあるかを一つだけ質問してください。作成が必要ならCloudflare公式ページだけを使い、一度に一操作ずつ案内してください。パスワードやメールの確認コードはチャットへ貼らせないでください。有料プランやカード登録が表示されたら進まずに説明してください。メール認証が終わり、ダッシュボードへログインできたら、その事実だけを確認してください。"),
  cloudflareConnect: withOfficialContext("cloudflare-connect", "制作スレッド", "このプロジェクトとCloudflareの接続状況を確認してください。最初にpackage.jsonとプロジェクト内に既に導入されているWranglerだけを確認し、npxで未導入パッケージを自動取得しないでください。ローカルのWranglerがある場合だけ、OSに合う方法で whoami の標準出力と標準エラーを抑制し、終了ステータスだけを確認してください。コマンド出力、アカウント名、メール、Account IDなどの情報はチャットへ表示せず、『接続済み／未接続』だけを報告してください。Wranglerがない、または未接続の場合は必要な作業を一つだけ説明し、導入やブラウザ認証を始める前に私の確認を待ってください。APIトークン、パスワード、認証コードはチャットへ貼らせないでください。まだD1作成、公開、GitHubとの自動連携は行わないでください。"),
  supportMode: withOfficialContext("support-mode", "AI相談室", "ここまでのセットアップ中のやり取りとGitHub Issueの構造化記録を振り返り、私への案内の細かさを提案してください。コピー＆ペースト、メール認証、フォルダを開く操作、画面やエラーを言葉で伝える操作がどの程度できていたかだけを材料にしてください。能力を採点したり『初心者レベル○』と呼んだりせず、『ゆっくり伴走』『一操作ずつ』『要点案内』の3つからおすすめを一つ、その理由を短く示してください。最後は私にどれを選ぶか確認し、勝手に決定しないでください。"),
  idea: withOfficialContext("idea", "AI相談室", "作ってみたいアプリについて、今から音声で思いつくまま話します。誰が使うか、今どうしているか、何が面倒か、どうなったらうれしいか、画面で見たいもの、雰囲気や色を整理してください。分からないところは一度に一つだけ質問し、最初に小さく試す形を一つおすすめしてください。この相談で試した案、うまくいかなかった案、解決した方法、まだ解決していないことも区別してください。相談が一段落したら、会話全文ではなく『相談内容』『試したこと』『うまくいかなかったこと』『解決方法または未解決の現在地』『今回の学び』『次にする一つ』を、参加者自身の非公開アプリ用リポジトリのセッションIssueへ追記し、書いた内容を再読み取りしてください。公開教材リポジトリには参加者ログを書かないでください。パスワード、認証コード、秘密鍵、生のコマンド出力は記録しないでください。"),
  ideaLocal: withOfficialContext("idea/local", "AI相談室", "作ってみたいアプリについて、今から音声で思いつくまま話します。誰が使うか、今どうしているか、何が面倒か、どうなったらうれしいか、画面で見たいもの、雰囲気や色を整理してください。分からないところは一度に一つだけ質問し、最初に小さく試す形を一つおすすめしてください。今はprivate GitHubリポジトリとセッションIssueの準備が完了していないため、Issue作成・コメント・support-sessionの開始は行わないでください。相談が一段落したら、この画面で確認できるよう『相談内容』『試したこと』『うまくいかなかったこと』『現在地』『次にする一つ』を短く返してください。記録できたふりをしないでください。"),
  consultationRecord: withOfficialContext("idea/consultation-record", "AI相談室", "ここまでの相談を、今開いている参加者自身の非公開アプリ用リポジトリのセッションIssueへ追記してください。公開教材リポジトリ machiba-ai-beginner-support には書かないでください。会話全文を貼り付けず、1. 相談内容、2. 試したこと、3. うまくいかなかったこと、4. 解決方法または未解決の現在地、5. 今回の学び、6. 次にする一つ、の6項目へ短く整理してください。失敗も消さず、後から同じところで困った人が解決方法をたどれる表現にしてください。パスワード、認証コード、トークン、秘密鍵、個人情報、ファイルの絶対パス、生のコマンド出力は記録しないでください。追記後にIssueを再読み取りし、記録できたこととIssue番号だけを報告してください。GitHubへ書けない場合は、記録できたふりをせず『PC内で同期待ち』と報告してください。"),
  starter: withOfficialContext("starter", "制作スレッド", "このスターターアプリを確認し、まだファイルを変更せず、何ができる見本なのかを初心者向けに説明してください。その後、タイトル、表示項目、色、用途のうち、最初に一つだけ変えるなら何がおすすめか質問してください。私が希望を伝えたら、その一つだけを変更し、画面で確かめてください。確認が成功したら、秘密情報が含まれないこととテスト結果を確認し、現在の作業ブランチへcommit・pushして、そのcommit SHAをセッションIssueへ記録してください。mainへのmergeとCloudflare公開は、別の明示依頼があるまで行わないでください。"),
  starterLocal: withOfficialContext("starter/local", "制作スレッド", "このスターターアプリを確認し、まだファイルを変更せず、何ができる見本なのかを初心者向けに説明してください。その後、タイトル、表示項目、色、用途のうち、最初に一つだけ変えるなら何がおすすめか質問してください。私が希望を伝えたら、その一つだけを変更し、PCの中で画面を確かめてください。今はprivate GitHubリポジトリまたはセッションIssueの準備が完了していないため、commit、push、Issue作成・コメント、Cloudflare公開は行わないでください。成功した変更と次にする一つだけを返し、記録できたふりをしないでください。"),
  publish: withOfficialContext("publish", "制作スレッド", "このアプリをCloudflareへ公開する前の確認だけをしてください。秘密情報、本物の個人情報、ダミーではない認証情報が含まれていないかを調べ、公開すると何が見えるようになるかを初心者向けに説明してください。私が『公開してください』と答えるまで公開は実行しないでください。確認結果と未実施であることはセッションIssueへ記録してください。"),
  submissionPrepare: withOfficialContext("submit/prepare", "制作スレッド", `提出用ZIPを準備してください。ファイル名は ${COURSE_EVENT_DATE}_表示名_成果物.zip の形にします。アップロード前にZIPの中身を一覧で確認し、.env、秘密鍵、トークン、node_modules、.wrangler、個人データ、顧客データを除外してください。除外できたことと、作成したZIPのファイル名だけを報告してください。ファイルの絶対パスやZIPの中身の生出力は表示しないでください。まだGoogle Driveへのアップロードや共有設定の変更は行わないでください。`),
  submissionConnect: withOfficialContext("submit/connect-drive", "制作スレッド", `ブラウザ提出を標準にしたまま、AIからGoogle Driveへ提出できるよう接続を試したいです。最初に私のOSと使用中のAIを確認し、この環境にGoogle公式OAuth、公式コネクタ、または利用可能なGoogle Drive API連携がすでにあるかを確認してください。なければ、具体的なボタン名を決めつけず、今見えている画面からGoogle公式の接続方法を一操作ずつ案内してください。各権限画面では、要求される権限の目的、見える情報、できる操作、影響を普段の言葉で説明し、私が明示的に了承するまで承認操作へ進まないでください。APIキー、認証コード、アクセストークン、パスワードをチャットへ貼らせないでください。接続の追加承認は、成果物アップロードの承認とは別です。接続できても、まだファイルをアップロードしないでください。同じ場所で3回止まるか約7分進まない場合は、接続を中断して標準のブラウザ提出へ戻してください。`),
  submissionUpload: withOfficialContext("submit/upload", "制作スレッド", `Google DriveコネクタまたはGoogle Drive APIがこの環境ですでに利用可能な場合だけ、確認済みの提出用ZIPを次の受講者用フォルダへ新規アップロードしてください。\n\n提出先フォルダID：${GOOGLE_DRIVE_SUBMISSION_FOLDER_ID}\n提出先URL：${GOOGLE_DRIVE_SUBMISSION_FOLDER_URL}\n\n連携が未導入、未認証、または利用できない場合は、新しい連携の導入や権限追加を求めず、『ブラウザ提出を使ってください』と案内して止めてください。利用する場合もGoogle公式OAuthまたは既に承認済みのコネクタだけを使い、APIキー、認証コード、アクセストークンをチャットへ貼らせないでください。アップロード前に対象ファイル名と提出先を一度確認してください。許可する操作は、このZIPの新規アップロードと、その結果の読み取り確認だけです。既存ファイルを開く、更新する、移動する、改名する、削除する操作と、Google Driveの共有設定・権限変更は行わないでください。アップロード後はフォルダのファイル一覧またはアップロードしたファイルのメタデータを読み戻し、同じファイル名が存在することを確認してください。成功した場合だけ、ファイル名、Google DriveファイルURL、読み戻し確認済みを報告してください。`),
};

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function PromptBox({ id, text, target, copiedId, onCopy }: { id: string; text: string; target: PromptTarget; copiedId: string; onCopy: (id: string, text: string) => void }) {
  return (
    <div className="support-prompt">
      <div>
        <span>{target}へそのまま渡せます</span>
        <button type="button" onClick={() => onCopy(id, text)}>{copiedId === id ? "コピーしました" : "文章をコピー"}</button>
      </div>
      <textarea readOnly value={text} aria-label={`${target}へ渡す文章。上下キーで内容を確認できます。`} />
    </div>
  );
}

function StatusPill({ name, status, tone }: { name: string; status: ConnectionStatus; tone: "github" | "cloudflare" }) {
  return (
    <div className={`support-status-pill ${tone} status-${status}`}>
      <span>{tone === "github" ? "GH" : "CF"}</span>
      <div><small>{name}</small><b>{connectionLabels[status]}</b></div>
    </div>
  );
}

function GitHubLogPill({ status }: { status: GitHubLogStatus }) {
  return (
    <div className={`support-status-pill log status-${status}`}>
      <span>LOG</span>
      <div><small>GitHub作業記録</small><b>{githubLogLabels[status]}</b></div>
    </div>
  );
}

export default function SupportGuide({ active, onOpenDeck }: { active: boolean; onOpenDeck: () => void }) {
  const [progress, setProgress] = useState<SupportProgress>(initialProgress);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<"hub" | "guide">("hub");
  const [copiedId, setCopiedId] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [submissionDisplayName, setSubmissionDisplayName] = useState("");
  const [driveNameConsent, setDriveNameConsent] = useState(false);
  const [submissionFileName, setSubmissionFileName] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");
  const [submissionUploadRoute, setSubmissionUploadRoute] = useState<SubmissionUploadRoute>("browser");
  const [submissionVerified, setSubmissionVerified] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        clearLegacySupportProgress(window.localStorage);
        const saved = window.localStorage.getItem(SUPPORT_PROGRESS_STORAGE_KEY);
        if (saved) {
          const restored = sanitizeProgress(JSON.parse(saved));
          setProgress(restored);
          if (restored.nameConsent) setDisplayNameDraft(restored.displayName);
        }
      } catch {
        try {
          window.localStorage.removeItem(SUPPORT_PROGRESS_STORAGE_KEY);
        } catch {
          // Storage may be disabled entirely. The visible warning below is the fallback.
        }
        setStorageWarning("このブラウザでは進捗を保存できません。画面を閉じる前に再開カードをコピーしてください。");
      } finally {
        setLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let warningTimer: number | undefined;
    try {
      window.localStorage.setItem(SUPPORT_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      warningTimer = window.setTimeout(() => {
        setStorageWarning("このブラウザでは進捗を保存できません。画面を閉じる前に再開カードをコピーしてください。");
      }, 0);
    }

    return () => {
      if (warningTimer !== undefined) window.clearTimeout(warningTimer);
    };
  }, [loaded, progress]);

  const currentIndex = stepOrder.indexOf(progress.currentStep);
  const completedCount = progress.completedSteps.length;
  const participantName = sanitizeDisplayName(progress.displayName);
  const safeDisplayNameDraft = sanitizeDisplayName(displayNameDraft);
  const participantReady = participantName.length > 0
    && progress.nameConsent
    && safeDisplayNameDraft === participantName;
  const issueNameReady = canUseDisplayNameInIssue(progress);
  const displayNameLocked = isDeviceDisplayNameLocked(progress);
  const hasJourneyProgress = completedCount > 0
    || progress.os !== ""
    || progress.starterStatus === "ready"
    || progress.repositoryStatus !== "not-ready"
    || progress.projectStatus === "ready"
    || progress.supportKitStatus !== "not-checked"
    || progress.githubStatus !== "unknown"
    || progress.cloudflareStatus !== "unknown"
    || progress.githubLogStatus !== "not-started"
    || progress.driveSubmissionStatus === "submitted";
  const hasProgress = participantReady || hasJourneyProgress;
  const participantPromptContext = buildParticipantPromptContext(participantName, progress.issueNameConsent);
  const safeSubmissionDisplayName = sanitizeDisplayName(submissionDisplayName);
  const recommendedSubmissionFileName = safeSubmissionDisplayName
    ? `${COURSE_EVENT_DATE}_${safeSubmissionDisplayName}_成果物.zip`
    : `${COURSE_EVENT_DATE}_表示名_成果物.zip`;
  const safeSubmissionFileName = sanitizeSubmissionFileName(submissionFileName);
  const safeSubmissionFileUrl = sanitizeDriveFileUrl(submissionFileUrl);
  const submissionFileUrlIsValid = submissionFileUrl.trim() === "" || safeSubmissionFileUrl.length > 0;
  const submissionDetailsReady = driveNameConsent
    && safeSubmissionDisplayName.length > 0
    && safeSubmissionFileName.toLowerCase().endsWith(".zip")
    && submissionFileUrlIsValid
    && submissionVerified;
  const driveIssueCanSync = issueNameReady && canRecordDriveIssue(progress.githubLogStatus, progress.githubIssueNumber);
  const consultationIssueCanSync = issueNameReady && canRecordDriveIssue(progress.githubLogStatus, progress.githubIssueNumber);
  const sessionStartPrompt = issueNameReady ? `${prompts.sessionStart}\n\n${participantPromptContext}` : "";
  const ideaPrompt = `${consultationIssueCanSync ? prompts.idea : prompts.ideaLocal}\n\n${participantPromptContext}`;
  const consultationRecordPrompt = `${prompts.consultationRecord}\n\n${participantPromptContext}`;
  const starterPrompt = consultationIssueCanSync ? prompts.starter : prompts.starterLocal;
  const submissionPreparePrompt = `${prompts.submissionPrepare}\n\n提出時の表示名：${safeSubmissionDisplayName || "未確認"}\n推奨ファイル名：${recommendedSubmissionFileName}`;
  const submissionConnectPrompt = `${prompts.submissionConnect}\n\n${participantPromptContext}`;
  const submissionUploadPrompt = `${prompts.submissionUpload}\n\n提出時の表示名：${safeSubmissionDisplayName || "未確認"}\n提出ファイル名：${safeSubmissionFileName || recommendedSubmissionFileName}`;
  const submissionRecordInstruction = buildSubmissionRecordPrompt({
    displayName: participantName,
    fileName: progress.driveSubmissionFileName || safeSubmissionFileName,
    fileUrl: submissionFileUrl,
    uploadRoute: progress.driveSubmissionUploadRoute || submissionUploadRoute,
  });
  const submissionRecordPrompt = submissionRecordInstruction
    ? withOfficialContext("submit/record", "制作スレッド", submissionRecordInstruction)
    : "";

  const updateProgress = (patch: Partial<SupportProgress>) => {
    setProgress(previous => {
      const next = { ...previous, ...patch, updatedAt: Date.now() };
      if (patch.projectStatus || patch.githubStatus || patch.cloudflareStatus || patch.githubLogStatus) {
        next.setupGate = deriveGate(next.projectStatus, next.githubStatus, next.cloudflareStatus, next.githubLogStatus);
      }
      next.driveIssueRecordStatus = deriveDriveIssueRecordStatus(
        next.driveSubmissionStatus,
        next.driveIssueRecordStatus,
        next.githubLogStatus,
        next.githubIssueNumber,
      );
      return next;
    });
  };

  const completeAndGo = (completed: StepId, next: StepId, patch: Partial<SupportProgress> = {}) => {
    setProgress(previous => {
      const merged = { ...previous, ...patch };
      const setupGate = deriveGate(merged.projectStatus, merged.githubStatus, merged.cloudflareStatus, merged.githubLogStatus);
      const driveIssueRecordStatus = deriveDriveIssueRecordStatus(
        merged.driveSubmissionStatus,
        merged.driveIssueRecordStatus,
        merged.githubLogStatus,
        merged.githubIssueNumber,
      );
      return {
        ...merged,
        setupGate,
        driveIssueRecordStatus,
        currentStep: next,
        completedSteps: previous.completedSteps.includes(completed)
          ? previous.completedSteps
          : [...previous.completedSteps, completed],
        updatedAt: Date.now(),
      };
    });
  };

  const copyText = async (id: string, text: string) => {
    try {
      await copyToClipboard(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? "" : current), 1800);
    } catch {
      setCopiedId("copy-error");
    }
  };

  const resumeCard = (() => {
    const finished = progress.completedSteps.length
      ? progress.completedSteps.map(step => stepLabels[step]).join("、")
      : "まだありません";
    const osLabel = progress.os === "mac" ? "Mac" : progress.os === "windows" ? "Windows" : "未確認";
    const aiLabel = progress.ai === "chatgpt" ? "ChatGPT / Codex" : progress.ai === "claude" ? "Claude / Claude Code" : "未確認";
    const connectionRestartStep = nextConnectionStep(progress);
    const resumeNextStep = progress.setupGate !== "ready" && connectionRestartStep !== "setup-gate"
      ? connectionRestartStep
      : progress.currentStep;

    return `## 再開カード
- 参加者向けガイド：${SUPPORT_SITE_URL}
- サポート手順の正本：${SUPPORT_REPOSITORY_URL}
- この端末の進捗用の呼び名：${participantName || "未入力"}
- private Issueへのニックネーム保存：${progress.issueNameConsent ? "了承済み" : "未了承"}
- 今日の目的：はじめてのアプリづくりを続ける
- PC・OS：${osLabel}
- 使用中のAI：${aiLabel}
- スターター：${progress.starterStatus === "ready" ? "取得・展開済み" : "未準備"}
- private GitHubリポジトリ：${progress.repositoryStatus === "private-ready" ? "origin・push確認済み" : progress.repositoryStatus === "local-only" ? "ローカルのみ" : "未準備"}
- 制作AIでフォルダを開く：${progress.projectStatus === "ready" ? "確認済み" : "未確認"}
- サポート機能：${progress.supportKitStatus === "ready" ? "確認済み" : progress.supportKitStatus === "missing" ? "不足" : "未確認"}
- GitHub接続：${connectionLabels[progress.githubStatus]}
- Cloudflare接続：${connectionLabels[progress.cloudflareStatus]}
- GitHub作業記録：${githubLogLabels[progress.githubLogStatus]}
- セッションIssue：${progress.githubIssueNumber ? `#${progress.githubIssueNumber}` : "未確認"}
- Google Drive提出：${driveSubmissionLabels[progress.driveSubmissionStatus]}${progress.driveSubmissionFileName ? `（${progress.driveSubmissionFileName}）` : ""}
- Drive提出のIssue記録：${driveIssueRecordLabels[progress.driveIssueRecordStatus]}
- 案内の細かさ：${supportModeLabels[progress.supportMode]}
- 完了したところ：${finished}
- 次にする一つ：${stepLabels[resumeNextStep]}
- 制作体験の現在地：${stepLabels[progress.currentStep]}
- 現在のSTEP ID：${progress.currentStep}
- 現在の画面：本人が共有前に追記
- 試したこと：本人が共有前に追記
- 講師に確認してほしいこと：本人が共有前に追記
- 秘密情報を含まない確認：未確認（共有前に本人が確認）`;
  })();

  const resetProgress = () => {
    try {
      window.localStorage.removeItem(SUPPORT_PROGRESS_STORAGE_KEY);
      setStorageWarning("");
    } catch {
      setStorageWarning("このブラウザでは保存記録を消せませんでした。再開カードをコピーし、ブラウザのサイトデータ設定を確認してください。");
    }
    setProgress({ ...initialProgress, updatedAt: Date.now() });
    setDisplayNameDraft("");
    setSubmissionDisplayName("");
    setDriveNameConsent(false);
    setSubmissionFileName("");
    setSubmissionFileUrl("");
    setSubmissionUploadRoute("browser");
    setSubmissionVerified(false);
    setScreen("hub");
  };

  const goToFirstIncompleteConnection = () => {
    updateProgress({ currentStep: nextConnectionStep(progress) });
  };

  const renderStep = () => {
    switch (progress.currentStep) {
      case "device":
        if (!progress.os) {
          return (
            <>
              <p className="support-step-kicker">最初の確認</p>
              <h2>使っているPCはどちらですか？</h2>
              <p className="support-step-lead">画面やボタンの場所が少し違うため、先にPCだけ確認します。</p>
              <div className="support-choice-grid two">
                <button type="button" onClick={() => updateProgress({ os: "mac" })}><b>Mac</b><span>AppleのマークがあるPC</span></button>
                <button type="button" onClick={() => updateProgress({ os: "windows" })}><b>Windows</b><span>WindowsのマークがあるPC</span></button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">次の確認</p>
            <h2>アプリを作るAIを選びます</h2>
            <p className="support-step-lead">講座の標準はChatGPTデスクトップのCodexです。Claudeを普段から使っている人はClaude Codeでも進められます。</p>
            <div className="support-choice-grid two">
              <button className="recommended" type="button" onClick={() => completeAndGo("device", "github-account", { ai: "chatgpt" })}>
                <small>講座のおすすめ</small><b>ChatGPT / Codex</b><span>初めての人はこちら</span>
              </button>
              <button type="button" onClick={() => completeAndGo("device", "github-account", { ai: "claude" })}>
                <small>すでに使っている人</small><b>Claude / Claude Code</b><span>既存利用者向け</span>
              </button>
            </div>
          </>
        );

      case "github-account":
        if (progress.githubStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>GitHubは接続済みです</h2>
              <p className="support-step-lead">接続済みの項目はやり直しません。次はスターターを受け取ります。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("github-account", nextConnectionStep(progress))}>続きの準備へ進む</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">GitHub 1 / 2</p>
            <h2>GitHubへログインできますか？</h2>
            <p className="support-step-lead">まずアカウントとメール認証だけを確認します。PCとの接続は次の画面です。</p>
            {progress.githubStatus === "preparing" && <PromptBox id="github-account" text={prompts.githubAccount} target="AI相談室" copiedId={copiedId} onCopy={copyText} />}
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("github-account", "github-connect", { githubStatus: "account-ready" })}>ログインとメール認証ができています</button>
              {progress.githubStatus !== "preparing" && <button type="button" onClick={() => updateProgress({ githubStatus: "preparing" })}>まだです。AIと一つずつ準備します</button>}
              <button className="quiet" type="button" onClick={() => completeAndGo("github-account", "starter-obtain", { githubStatus: "account-blocked" })}>認証は保留してスターターを受け取る</button>
            </div>
          </>
        );

      case "github-connect":
        if (progress.githubStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">接続済み</p>
              <h2>PCとGitHubを確認できました</h2>
              <p className="support-step-lead">ここでは接続だけを確認しました。Issueは、スターターをprivateリポジトリにして制作AIで開いた後に始めます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("github-connect", nextConnectionStep(progress))}>続きの準備へ進む</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">GitHub 2 / 2</p>
            <h2>PCとGitHubの接続を確認します</h2>
            <p className="support-step-lead">AIには、最初に安全な読み取り確認だけをしてもらいます。未接続なら説明を聞いてから準備します。</p>
            <PromptBox id="github-connect" text={prompts.githubConnect} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <div className="support-expected"><b>うまくいけば</b><p>AIがコマンド出力やアカウント名を表示せず、「接続済み」とだけ報告します。</p></div>
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => {
                const nextProgress = { ...progress, githubStatus: "connected" as const, githubLogStatus: "not-started" as const };
                completeAndGo("github-connect", nextConnectionStep(nextProgress), { githubStatus: "connected", githubLogStatus: "not-started" });
              }}>PCから接続できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("github-connect", "starter-obtain", { githubStatus: "connection-blocked" })}>接続は保留してスターターを受け取る</button>
            </div>
          </>
        );

      case "starter-obtain":
        return (
          <>
            <p className="support-step-kicker">制作準備 1 / 4</p>
            <h2>ZIPまたはPC内のフォルダから始めます</h2>
            <p className="support-step-lead">初めてなら公式ZIPを保存して展開します。すでに展開済みスターターがPCにある場合は、そのフォルダをそのまま使えます。</p>
            <a className="support-starter-link" href={STARTER_ZIP_URL}>公式スターターZIPをダウンロード</a>
            <div className="support-expected"><b>どちらの場合も</b><p>ZIPではない普通のフォルダ内に、README.mdとscripts/support-session.mjsがあれば次へ進めます。</p></div>
            <PromptBox id="starter-obtain" text={prompts.starterObtain} target="AI相談室" copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("starter-obtain", "repository-setup", { starterStatus: "ready" })}>スターターのフォルダを確認できました</button>
            </div>
          </>
        );

      case "repository-setup":
        if (progress.repositoryStatus === "private-ready") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>privateリポジトリとpushを確認できました</h2>
              <p className="support-step-lead">次は、このリポジトリのフォルダを制作AIで開きます。まだIssueは始めません。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("repository-setup", "project-folder")}>制作AIで開く</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">制作準備 2 / 4</p>
            <h2>個人情報を入れない名前でprivate repoを作ります</h2>
            <p className="support-step-lead">相談用表示名は日本語で構いません。repo名は別に、<code>{REPOSITORY_NAME_EXAMPLE}</code>のような英数字の技術名を使い、Git初期化、最初のcommit、origin設定、pushまで確認します。</p>
            {progress.githubStatus === "connected" ? (
              <PromptBox id="repository-setup" text={prompts.repositorySetup} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            ) : (
              <div className="support-fallback-panel compact"><b>GitHub接続は保留中</b><p>今日は展開したスターターをローカルで開けます。Issue記録はprivateリポジトリをpushできてから始めます。</p></div>
            )}
            <div className="support-action-list">
              <button className="primary" type="button" disabled={progress.githubStatus !== "connected"} onClick={() => completeAndGo("repository-setup", "project-folder", { repositoryStatus: "private-ready" })}>repo名・private・origin・pushを確認できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("repository-setup", "project-folder", { repositoryStatus: "local-only", githubLogStatus: "blocked" })}>今日はローカルだけで続けます</button>
            </div>
          </>
        );

      case "project-folder":
        return (
          <>
            <p className="support-step-kicker">制作準備 3 / 4</p>
            <h2>スターターのフォルダを制作AIで開きます</h2>
            <p className="support-step-lead">空のフォルダや公開教材ではなく、今準備した参加者自身のアプリを開きます。</p>
            <PromptBox id="project-folder" text={prompts.projectFolder} target="AI相談室" copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("project-folder", "support-kit", { projectStatus: "ready" })}>制作AIで対象フォルダを開けました</button>
            </div>
          </>
        );

      case "support-kit":
        return (
          <>
            <p className="support-step-kicker">制作準備 4 / 4</p>
            <h2>相談記録のサポート機能を確認します</h2>
            <p className="support-step-lead">スクリプトがあることとhelpが動くことだけを確認します。ここでも、まだIssueは作りません。</p>
            <PromptBox id="support-kit" text={prompts.supportKit} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("support-kit", "github-log", { supportKitStatus: "ready" })}>support-sessionのhelpを確認できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("support-kit", "github-log", { supportKitStatus: "missing", githubLogStatus: "blocked" })}>サポート機能を確認できませんでした</button>
            </div>
          </>
        );

      case "github-log": {
        const sessionPrerequisitesReady = progress.githubStatus === "connected"
          && progress.repositoryStatus === "private-ready"
          && progress.projectStatus === "ready"
          && progress.supportKitStatus === "ready";
        if (!sessionPrerequisitesReady) {
          return (
            <>
              <p className="support-step-kicker warning">Issue記録は保留</p>
              <h2>非GitフォルダからIssueは始めません</h2>
              <p className="support-step-lead">privateリポジトリ、origin・push、制作AIで開いたフォルダ、support-sessionの確認がそろうまでIssue作成を止めます。ローカル制作は続けられます。</p>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => completeAndGo("github-log", "cloudflare-account", { githubLogStatus: "blocked" })}>Issue記録を保留して次へ</button>
                <button type="button" onClick={() => updateProgress({ currentStep: "repository-setup" })}>privateリポジトリの準備へ戻る</button>
              </div>
            </>
          );
        }

        if (!participantName || !progress.nameConsent) {
          return (
            <>
              <p className="support-step-kicker warning">呼び名を確認してください</p>
              <h2>この端末の進捗用の呼び名が必要です</h2>
              <p className="support-step-lead">初期画面で呼び名をこの端末へ保存してから、private Issueへの保存を別に確認します。まだIssueは作成しません。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => setScreen("hub")}>初期画面で呼び名を確認する</button></div>
            </>
          );
        }

        if (!issueNameReady) {
          return (
            <>
              <p className="support-step-kicker">private Issueへの保存確認</p>
              <h2>「{participantName}」を相談Issueへ保存してよいですか？</h2>
              <p className="support-step-lead">このニックネームは、参加者自身のprivateリポジトリに作るIssueのタイトルと本文へ入り、そのリポジトリへ招待したcollaboratorにも見えます。公開教材リポジトリには保存しません。</p>
              <div className="support-expected"><b>この確認で許可すること</b><p>このニックネームをprivate Issueへ保存することだけです。コード変更、公開、外部送信はまだ許可しません。</p></div>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => updateProgress({ issueNameConsent: true })}>このニックネームをprivate Issueへ保存してよい</button>
                <button type="button" onClick={() => setScreen("hub")}>呼び名を変更する</button>
              </div>
            </>
          );
        }

        if (progress.githubLogStatus === "synced" && progress.githubIssueNumber) {
          const nextAfterIssue = progress.driveSubmissionStatus === "submitted" && progress.driveIssueRecordStatus === "waiting"
            ? "submit"
            : "cloudflare-account";
          return (
            <>
              <p className="support-step-kicker success">Issue記録 準備完了</p>
              <h2>相談を同じIssueへ残せます</h2>
              <p className="support-step-lead">Issue #{progress.githubIssueNumber}をGitHubから読み戻して確認済みです。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("github-log", nextAfterIssue)}>{nextAfterIssue === "submit" ? "Drive提出のIssue記録へ戻る" : "Cloudflareの確認へ進む"}</button></div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">GitHub 作業記録</p>
            <h2>準備済みのprivateリポジトリでIssueを始めます</h2>
            <p className="support-step-lead">AIが前提を再確認してからIssueを作り、読み戻した番号を返します。番号がない状態を「同期済み」にはしません。</p>
            <PromptBox id="session-start" text={sessionStartPrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <label className="support-issue-input">
              <span>AIが作成・読み戻したIssue番号</span>
              <div><b>#</b><input type="number" min="1" inputMode="numeric" value={progress.githubIssueNumber ?? ""} onChange={event => {
                const next = Number.parseInt(event.target.value, 10);
                updateProgress({ githubIssueNumber: Number.isSafeInteger(next) && next > 0 ? next : null });
              }} placeholder="例：12" /></div>
            </label>
            <div className="support-action-list">
              <button className="primary" type="button" disabled={!progress.githubIssueNumber} onClick={() => updateProgress({ githubLogStatus: "synced" })}>Issue番号を読み戻し、同期できました</button>
              <button type="button" onClick={() => updateProgress({ githubLogStatus: "local-queued" })}>PC内で同期待ちになりました</button>
              <button className="quiet" type="button" onClick={() => updateProgress({ githubLogStatus: "blocked" })}>安全確認で止まりました</button>
              {(progress.githubLogStatus === "blocked" || progress.githubLogStatus === "local-queued") && <button type="button" onClick={() => completeAndGo("github-log", "cloudflare-account")}>記録を保留して次へ進む</button>}
            </div>
          </>
        );
      }

      case "cloudflare-account":
        if (progress.cloudflareStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>Cloudflareは接続済みです</h2>
              <p className="support-step-lead">接続済みの項目はやり直しません。接続準備の判定へ進みます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("cloudflare-account", "setup-gate")}>接続準備を判定する</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">Cloudflare 1 / 2</p>
            <h2>Cloudflareへログインできますか？</h2>
            <p className="support-step-lead">無料アカウントとメール認証だけを確認します。カード登録は行いません。</p>
            {progress.cloudflareStatus === "preparing" && <PromptBox id="cloudflare-account" text={prompts.cloudflareAccount} target="AI相談室" copiedId={copiedId} onCopy={copyText} />}
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("cloudflare-account", "cloudflare-connect", { cloudflareStatus: "account-ready" })}>ログインとメール認証ができています</button>
              {progress.cloudflareStatus !== "preparing" && <button type="button" onClick={() => updateProgress({ cloudflareStatus: "preparing" })}>まだです。AIと一つずつ準備します</button>}
              <button className="quiet" type="button" onClick={() => completeAndGo("cloudflare-account", "setup-gate", { cloudflareStatus: "account-blocked" })}>アカウント作成・メール認証で止まっています</button>
            </div>
          </>
        );

      case "cloudflare-connect":
        if (progress.cloudflareStatus === "connected") {
          return (
            <>
              <p className="support-step-kicker success">確認済み</p>
              <h2>PCとCloudflareは接続済みです</h2>
              <p className="support-step-lead">この確認はやり直さず、接続準備の判定へ進みます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate")}>接続準備を判定する</button></div>
            </>
          );
        }
        return (
          <>
            <p className="support-step-kicker">Cloudflare 2 / 2</p>
            <h2>PCとCloudflareの接続を確認します</h2>
            <p className="support-step-lead">ここでは接続だけを確認します。D1の作成や公開は、まだ行いません。</p>
            <PromptBox id="cloudflare-connect" text={prompts.cloudflareConnect} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <div className="support-expected"><b>うまくいけば</b><p>AIがコマンド出力やアカウント情報を表示せず、「接続済み」とだけ報告します。まだ公開はしません。</p></div>
            <div className="support-action-list">
              <button className="primary" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate", { cloudflareStatus: "connected" })}>PCから接続できました</button>
              <button className="quiet" type="button" onClick={() => completeAndGo("cloudflare-connect", "setup-gate", { cloudflareStatus: "connection-blocked" })}>Wrangler・PC接続で止まりました</button>
            </div>
          </>
        );

      case "setup-gate": {
        const gate = deriveGate(progress.projectStatus, progress.githubStatus, progress.cloudflareStatus, progress.githubLogStatus);
        if (gate === "ready") {
          return (
            <>
              <p className="support-step-kicker success">接続準備 完了</p>
              <h2>作り始められる状態です</h2>
              <p className="support-step-lead">GitHubとCloudflareの両方をPCから確認できました。ここから、実際の操作に合わせて案内の細かさを決めます。</p>
              <div className="support-ready-panel"><span>✓</span><p><b>GitHub</b>と<b>Cloudflare</b>の接続を確認済みです。</p></div>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("setup-gate", "support-mode")}>案内方法を決める</button></div>
            </>
          );
        }

        if (gate === "local-fallback") {
          return (
            <>
              <p className="support-step-kicker warning">今日は接続を保留</p>
              <h2>PCの中で作る体験へ進めます</h2>
              <p className="support-step-lead">認証に時間がかかっても、講座は止まりません。今日はスターターをPC内で変更し、公開は再開カードから続けます。</p>
              <div className="support-fallback-panel"><b>公開しない安全な道</b><p>ローカルのスターターなら、GitHubやCloudflareへの接続が未完了でも画面を変える体験ができます。</p></div>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => completeAndGo("setup-gate", "idea")}>作りたいものの相談へ進む</button>
                <button type="button" onClick={goToFirstIncompleteConnection}>接続確認へ戻る</button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">接続準備を確認</p>
            <h2>まだ確認していない項目があります</h2>
            <p className="support-step-lead">接続済みの項目はやり直しません。最初の未確認項目へ戻ります。</p>
            <div className="support-action-list"><button className="primary" type="button" onClick={goToFirstIncompleteConnection}>未確認の一つへ戻る</button></div>
          </>
        );
      }

      case "support-mode":
        return (
          <>
            <p className="support-step-kicker">接続後に確認</p>
            <h2>どの細かさで案内しましょう？</h2>
            <p className="support-step-lead">まずAIに、ここまでの操作から合いそうな進め方を提案してもらいます。これは能力の採点ではなく、最後に決めるのは本人です。</p>
            <PromptBox id="support-mode" text={prompts.supportMode} target="AI相談室" copiedId={copiedId} onCopy={copyText} />
            <div className="support-choice-grid three">
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "slow" })}><b>ゆっくり伴走</b><span>ボタンの場所から説明</span></button>
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "step" })}><b>一操作ずつ</b><span>操作と成功画面を確認</span></button>
              <button type="button" onClick={() => completeAndGo("support-mode", "idea", { supportMode: "summary" })}><b>要点案内</b><span>目的と確認基準を短く</span></button>
            </div>
          </>
        );

      case "idea":
        return (
          <>
            <p className="support-step-kicker">音声で相談</p>
            <h2>作りたいものを、そのまま話します</h2>
            <p className="support-step-lead">言い間違いも話の順番も直さなくて大丈夫です。AIが整理し、分からないことを一つずつ聞きます。</p>
            <PromptBox id="idea" text={ideaPrompt} target="AI相談室" copiedId={copiedId} onCopy={copyText} />
            {consultationIssueCanSync ? (
              <>
                <div className="support-journal-inline">
                  <b>相談が一段落したら、解決までを作業ノートにします</b>
                  <p>相談内容・試したこと・失敗・解決方法・学びを、会話全文ではなく短い要約として同じIssueへ残します。</p>
                  <div><span>相談</span><i>→</i><span>試す</span><i>→</i><span>失敗</span><i>→</i><span>解決</span><i>→</i><span>学び</span></div>
                </div>
                <PromptBox id="consultation-record" text={consultationRecordPrompt} target="AI相談室" copiedId={copiedId} onCopy={copyText} />
              </>
            ) : (
              <div className="support-fallback-panel compact"><b>Issue記録はまだ行いません</b><p>相談は続けられます。privateリポジトリとIssueの準備後に、再開カードから記録を始めます。</p></div>
            )}
            <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("idea", "starter")}>相談して、最初の形が決まりました</button></div>
          </>
        );

      case "starter":
        return (
          <>
            <p className="support-step-kicker">制作を体験</p>
            <h2>スターターを一つだけ変えます</h2>
            <p className="support-step-lead">最初から全部を作らず、動く見本を開き、タイトル・項目・色・用途のどれか一つを変えます。</p>
            {progress.setupGate === "local-fallback" && <div className="support-fallback-panel compact"><b>ローカル体験中</b><p>PCの中だけで動かします。GitHub保存、D1、公開は再接続後に続けます。</p></div>}
            <PromptBox id="starter" text={starterPrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("starter", "publish")}>画面を一つ変更できました</button></div>
          </>
        );

      case "publish":
        if (progress.completedSteps.includes("publish")) {
          return (
            <>
              <p className="support-step-kicker success">公開確認 完了</p>
              <h2>最後に成果物を提出します</h2>
              <p className="support-step-lead">公開できた人も、PCの中で完成した人も、秘密情報を除いたZIPをGoogle Driveへ提出できます。</p>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => updateProgress({ currentStep: "submit" })}>成果物の提出へ進む</button></div>
            </>
          );
        }

        if (progress.setupGate === "local-fallback") {
          return (
            <>
              <p className="support-step-kicker warning">公開は次回へ</p>
              <h2>今日はPCの中で完成です</h2>
              <p className="support-step-lead">公開はGitHub・Cloudflare接続後に続けられます。今日はPCの中で完成した成果物を、安全なZIPにして提出します。</p>
              <div className="support-action-list">
                <button className="primary" type="button" onClick={() => completeAndGo("publish", "submit")}>成果物の提出へ進む</button>
                <button type="button" onClick={goToFirstIncompleteConnection}>接続確認を再開する</button>
              </div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">公開の前に</p>
            <h2>安全を確認してから公開します</h2>
            <p className="support-step-lead">接続済みでも、AIが勝手に公開しないようにします。見える範囲と秘密情報を確認し、本人が明確に了承してから進めます。</p>
            <PromptBox id="publish" text={prompts.publish} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
            <div className="support-action-list"><button className="primary" type="button" onClick={() => completeAndGo("publish", "submit")}>公開前の確認ができました。提出へ進む</button></div>
          </>
        );

      case "submit":
        if (progress.driveSubmissionStatus === "submitted" && progress.driveIssueRecordStatus === "synced") {
          return (
            <>
              <p className="support-step-kicker success">提出 完了</p>
              <h2>{participantName || "参加者"}さんの今日の成果を記録できました</h2>
              <p className="support-step-lead">Google Driveでの読み戻しと、対象アプリのprivate Issueへの提出記録まで確認しました。続きは同じIssueと再開カードから始められます。</p>
              <div className="support-ready-panel"><span>✓</span><p><b>{progress.driveSubmissionFileName}</b><br />Drive提出済み・Issue記録済み</p></div>
              <div className="support-action-list"><button className="primary" type="button" onClick={() => copyText("resume-finish", resumeCard)}>{copiedId === "resume-finish" ? "コピーしました" : "再開カードをコピー"}</button></div>
            </>
          );
        }

        if (progress.driveSubmissionStatus === "submitted") {
          return (
            <>
              <p className="support-step-kicker warning">提出の記録を続ける</p>
              <h2>Drive提出済み・Issue記録待ち</h2>
              <p className="support-step-lead">Google Driveへの提出と読み戻しは完了しています。Issueへ書けていない場合も、Drive提出まで失敗扱いにはしません。</p>
              <div className="support-ready-panel compact"><span>✓</span><p><b>{progress.driveSubmissionFileName}</b><br />Google Driveで確認済み</p></div>
              {driveIssueCanSync && submissionRecordPrompt ? (
                <div className="support-submission-section record">
                  <span className="support-route-badge record">別の確認</span>
                  <h3>private Issueへ提出結果を記録する</h3>
                  <p>Issue #{progress.githubIssueNumber}へ記録した後、GitHubから読み戻して確認します。Driveへ再アップロードする必要はありません。</p>
                  <PromptBox id="submission-record" text={submissionRecordPrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
                  <div className="support-action-list">
                    <button className="primary" type="button" onClick={() => completeAndGo("submit", "submit", { driveIssueRecordStatus: "synced" })}>AIがIssueへ記録し、読み戻しました</button>
                  </div>
                </div>
              ) : (
                <div className="support-fallback-panel">
                  <b>Issue記録には接続済みのセッションIssueが必要です</b>
                  <p>GitHub作業記録が「Issueへ同期済み」で、Issue番号も確認できてから再開します。今は再開カードに「Drive提出済み・Issue記録待ち」と残ります。</p>
                  <div className="support-action-list"><button type="button" onClick={() => updateProgress({ currentStep: "github-log" })}>GitHub接続・Issue記録を再確認する</button></div>
                </div>
              )}
              <div className="support-action-list"><button type="button" onClick={() => copyText("resume-drive-waiting", resumeCard)}>{copiedId === "resume-drive-waiting" ? "コピーしました" : "待ち状態の再開カードをコピー"}</button></div>
            </>
          );
        }

        return (
          <>
            <p className="support-step-kicker">最後のSTEP</p>
            <h2>成果物をGoogle Driveへ提出します</h2>
            <p className="support-step-lead">標準はブラウザからの提出です。Google Drive連携は、すでに使える人だけが選べる任意の方法です。</p>

            <div className="support-drive-visibility">
              <b>提出用の表示名を確認してください</b>
              <p>ファイル名に入れた表示名は、共有フォルダ内で他の参加者やリンクを持つ人にも見えます。本名でなく、講座用のニックネームで構いません。</p>
              <label>
                <span>共有フォルダで使う表示名（ニックネーム可）</span>
                <input
                  type="text"
                  autoComplete="nickname"
                  maxLength={40}
                  value={submissionDisplayName}
                  onChange={event => {
                    setSubmissionDisplayName(sanitizeDisplayName(event.target.value));
                    setDriveNameConsent(false);
                  }}
                  placeholder={participantName || "例：だいち"}
                />
              </label>
              {participantName && !safeSubmissionDisplayName && (
                <button type="button" onClick={() => { setSubmissionDisplayName(participantName); setDriveNameConsent(false); }}>進捗カードと同じ名前を使う</button>
              )}
              <label className="support-consent-check">
                <input type="checkbox" checked={driveNameConsent} disabled={!safeSubmissionDisplayName} onChange={event => setDriveNameConsent(event.target.checked)} />
                <span>この表示名が共有フォルダ内で見えることを理解し、この名前で提出します。</span>
              </label>
            </div>

            {driveNameConsent ? (
              <>
                <div className="support-submission-section">
                  <span className="support-route-badge standard">標準</span>
                  <h3>1. 安全なZIPを作る</h3>
                  <p>推奨ファイル名は <code>{recommendedSubmissionFileName}</code> です。AIに中身を確認してもらい、秘密情報や大きな生成物を除きます。</p>
                  <PromptBox id="submission-prepare" text={submissionPreparePrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
                  <div className="support-exclusion-list" aria-label="ZIPへ入れないもの">
                    <span>.env</span><span>秘密鍵・トークン</span><span>node_modules</span><span>.wrangler</span><span>個人・顧客データ</span>
                  </div>
                </div>

                <div className="support-submission-section">
                  <span className="support-route-badge standard">標準</span>
                  <h3>2. ブラウザで共有フォルダへ追加する</h3>
                  <p>Googleアカウントで受講者用フォルダを開き、自分のZIPだけを新しく追加します。他の人のファイルは開く・移動・改名・削除しません。共有設定や権限変更も不要です。</p>
                  <a className="support-drive-link" href={GOOGLE_DRIVE_SUBMISSION_FOLDER_URL} target="_blank" rel="noreferrer">受講者用の提出フォルダを開く ↗</a>
                  <div className="support-expected"><b>アップロード後</b><p>フォルダの一覧を更新し、自分が付けたファイル名が見えることを確認します。</p></div>
                </div>

                <details className="support-optional-route">
                  <summary>発展：AIからDriveへ提出してみる（任意）</summary>
                  <p>標準のブラウザ提出だけで講座は完了できます。時間と環境に余裕がある場合だけ、既存連携を使うか、Google公式の接続を一操作ずつ試します。</p>
                  <div className="support-optional-choice">
                    <b>まだ接続していない／分からない</b>
                    <p>OSと使用中のAIから確認し、権限の目的と影響を毎回説明してもらいます。接続承認とアップロード承認は別です。約7分または同じ場所で3回止まったら、ブラウザ提出へ戻ります。</p>
                    <PromptBox id="submission-connect" text={submissionConnectPrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
                  </div>
                  <div className="support-optional-choice">
                    <b>すでに連携が使える</b>
                    <p>新しいZIPのアップロードと読み取り確認だけを依頼します。既存ファイルと共有権限には触れません。</p>
                    <PromptBox id="submission-upload" text={submissionUploadPrompt} target="制作スレッド" copiedId={copiedId} onCopy={copyText} />
                  </div>
                </details>

                <div className="support-submission-section record">
                  <span className="support-route-badge record">提出の確認</span>
                  <h3>3. Driveで読み戻して、提出完了にする</h3>
                  <p>ここではGoogle Driveへの提出だけを確定します。private Issueへの記録は次の画面で別に確認します。個別のファイルURLを取得できない場合は空欄で構いません。</p>
                  <fieldset className="support-upload-route">
                    <legend>実際に提出した方法</legend>
                    <label><input type="radio" name="submission-route" value="browser" checked={submissionUploadRoute === "browser"} onChange={() => setSubmissionUploadRoute("browser")} /><span>ブラウザ</span></label>
                    <label><input type="radio" name="submission-route" value="connector" checked={submissionUploadRoute === "connector"} onChange={() => setSubmissionUploadRoute("connector")} /><span>Google Driveコネクタ</span></label>
                    <label><input type="radio" name="submission-route" value="api" checked={submissionUploadRoute === "api"} onChange={() => setSubmissionUploadRoute("api")} /><span>Google Drive API</span></label>
                  </fieldset>
                  <label className="support-submission-field">
                    <span>提出したファイル名</span>
                    <input type="text" value={submissionFileName} onChange={event => setSubmissionFileName(sanitizeSubmissionFileName(event.target.value))} placeholder={recommendedSubmissionFileName} />
                  </label>
                  <button className="support-use-recommended" type="button" onClick={() => setSubmissionFileName(recommendedSubmissionFileName)}>推奨ファイル名を入力</button>
                  <label className="support-submission-field">
                    <span>Google DriveファイルURL（任意）</span>
                    <input
                      type="url"
                      inputMode="url"
                      value={submissionFileUrl}
                      onChange={event => setSubmissionFileUrl(event.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      aria-invalid={!submissionFileUrlIsValid}
                      aria-describedby={submissionFileUrlIsValid ? "drive-file-url-help" : "drive-file-url-help drive-file-url-error"}
                    />
                  </label>
                  <p id="drive-file-url-help" className="support-field-help">URLを取得できなければ空欄のままで構いません。このURLはブラウザ進捗には保存しません。</p>
                  {!submissionFileUrlIsValid && <p id="drive-file-url-error" className="support-field-error" role="alert">個別のGoogle DriveファイルURLではありません。フォルダURLではなくファイルURLを入力するか、空欄にしてください。</p>}
                  <label className="support-consent-check readback">
                    <input type="checkbox" checked={submissionVerified} onChange={event => setSubmissionVerified(event.target.checked)} />
                    <span>ファイル一覧またはメタデータを読み戻し、同じファイル名があることを確認しました。</span>
                  </label>
                  <div className="support-action-list">
                    <button
                      className="primary"
                      type="button"
                      disabled={!submissionDetailsReady}
                      onClick={() => updateProgress({
                        driveSubmissionStatus: "submitted",
                        driveIssueRecordStatus: "waiting",
                        driveSubmissionFileName: safeSubmissionFileName,
                        driveSubmissionUploadRoute: submissionUploadRoute,
                      })}
                    >Driveへの提出と読み戻しを確認しました</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="support-expected"><b>次にすること</b><p>共有フォルダで使う表示名を入力し、見える範囲を確認してください。</p></div>
            )}
          </>
        );
    }
  };

  return (
    <section className={`support-shell${active ? "" : " support-hidden"}`} id="support" aria-label="参加者用実践サポート">
      {storageWarning && (
        <div className="support-storage-warning" role="alert">
          <div><b>進捗の自動保存が使えません</b><p>{storageWarning}</p></div>
          <button type="button" onClick={() => copyText("resume-storage", resumeCard)}>{copiedId === "resume-storage" ? "コピーしました" : "再開カードをコピー"}</button>
        </div>
      )}
      {screen === "hub" ? (
        <div className="support-hub">
          <div className="support-hero">
            <div>
              <p className="support-overline">MACHIBA AI · PARTICIPANT SUPPORT</p>
              <h1>まず、<em>つながっているか</em>を<br />一つずつ確認しよう。</h1>
              <p>GitHub接続後、スターターをprivateリポジトリにして制作AIで開きます。準備がそろった後、ニックネームをprivate Issueへ保存してよいか別に確認してから、相談内容・失敗・解決方法・学びを記録します。</p>
            </div>
            <div className="support-hero-mark" aria-hidden="true"><span>GH</span><i>＋</i><span>CF</span></div>
          </div>

          <div className="support-hub-grid">
            <div className="support-hub-main">
              <p className="support-section-label">{participantName ? `${participantName}さんの接続状態` : "今の接続状態"}</p>
              <div className="support-status-row">
                <StatusPill name="GitHub" status={progress.githubStatus} tone="github" />
                <StatusPill name="Cloudflare" status={progress.cloudflareStatus} tone="cloudflare" />
                <GitHubLogPill status={progress.githubLogStatus} />
              </div>
              <div className="support-hub-actions">
                <button className="support-main-button" type="button" disabled={!participantReady} onClick={() => { setScreen("guide"); if (!hasJourneyProgress) updateProgress({ currentStep: "device" }); }}>
                  <span>{participantReady ? (hasJourneyProgress ? `${participantName}さんの続きから始める` : "接続確認を始める") : "先にこの端末で使う呼び名を入力してください"}</span><b>→</b>
                </button>
                {hasJourneyProgress && <button type="button" onClick={() => { updateProgress({ currentStep: "device" }); setScreen("guide"); }}>最初から見直す</button>}
                <button type="button" onClick={onOpenDeck}>A4教材を読む</button>
              </div>
            </div>

            <aside className="support-participant-card">
              <span>参加者の進捗</span>
              <h2>{participantName ? `${participantName}さん` : "この端末で使う呼び名を入力してください"}</h2>
              <p className="support-name-storage-note">入力中の呼び名はまだ保存されません。下のボタンを押すと、このブラウザの進捗表示だけに保存されます。この時点ではprivate Issueへ保存しません。</p>
              <label>
                <b>この端末の進捗用の呼び名（ニックネーム・日本語可）</b>
                <input
                  type="text"
                  autoComplete="nickname"
                  maxLength={40}
                  value={displayNameDraft}
                  onChange={event => setDisplayNameDraft(event.target.value)}
                  placeholder="例：だいち"
                  aria-label="この端末の進捗用の呼び名"
                  disabled={displayNameLocked}
                />
              </label>
              {displayNameLocked && <p className="support-name-storage-note">Issue開始後のニックネームはこの画面では変更しません。次回使う名前を変えたい場合は、AI相談室で相談してください。既存Issueは自動で改名せず、新しいIssueも自動作成しません。</p>}
              <button
                className="support-confirm-name"
                type="button"
                disabled={displayNameLocked || !safeDisplayNameDraft}
                onClick={() => {
                  const namePatch = saveDisplayNameToDevice(progress, safeDisplayNameDraft);
                  const returnToIssueConsent = namePatch.displayName !== participantName
                    && progress.githubIssueNumber !== null;
                  updateProgress({
                    ...namePatch,
                    ...(returnToIssueConsent ? { currentStep: "github-log" as const } : {}),
                  });
                }}
              >{displayNameLocked ? "Issue開始後は変更できません" : participantReady && safeDisplayNameDraft === participantName ? "この端末に保存済みです" : "この端末の進捗用に保存する"}</button>
              <p>呼び名、現在のSTEP、接続状態、Issue番号をこの端末でまとめます。private Issueへの保存は、準備完了後に改めて確認します。</p>
              <div className="support-personal-progress">
                <div><span>現在地</span><b>{stepLabels[progress.currentStep]}</b></div>
                <div><span>完了</span><b>{completedCount} / {stepOrder.length}</b></div>
                <div><span>Issue</span><b>{progress.githubIssueNumber ? `#${progress.githubIssueNumber}` : "未確認"}</b></div>
                <div><span>成果物</span><b>{progress.driveSubmissionStatus === "submitted" ? (progress.driveIssueRecordStatus === "synced" ? "Drive提出・Issue記録済み" : "Drive提出済み・Issue記録待ち") : "未提出"}</b></div>
              </div>
              {hasProgress && <button type="button" onClick={resetProgress}>この端末の進捗を消す</button>}
            </aside>
          </div>

          <div className="support-path-preview" aria-label="サポートの順番">
            <div><span>1</span><b>GitHubをつなぐ</b><p>アカウントとPC接続</p></div>
            <i>→</i>
            <div><span>2</span><b>制作場所を準備</b><p>スターター → private repo → 制作AI</p></div>
            <i>→</i>
            <div><span>3</span><b>記録して作る</b><p>Issue → Cloudflare → 一つ変更</p></div>
          </div>

          <section className="support-journal-card" aria-labelledby="support-journal-title">
            <div>
              <p className="support-section-label">AI相談室の作業ノート</p>
              <h2 id="support-journal-title">失敗も、解決方法も、次の相談に使える記録へ</h2>
              <p>対象アプリのフォルダを開いたCodex／Claude Codeが、相談のまとまりごとに非公開アプリ用リポジトリのIssueへ要約します。参加者の相談ログを、この公開教材リポジトリへ書くことはありません。</p>
            </div>
            <div className="support-journal-flow" aria-label="Issueへ記録する内容">
              <span>相談内容</span><i>→</i><span>試したこと</span><i>→</i><span>失敗</span><i>→</i><span>解決方法</span><i>→</i><span>学び</span>
            </div>
            <p className="support-journal-caution"><b>記録しないもの：</b>パスワード、認証コード、トークン、秘密鍵、生のコマンド出力、会話全文</p>
          </section>

          <div className="support-source-links">
            <div><span>このガイド</span><a href={SUPPORT_SITE_URL}>{SUPPORT_SITE_URL}</a></div>
            <div><span>教材とAI手順の正本</span><a href={SUPPORT_REPOSITORY_URL} target="_blank" rel="noreferrer">{SUPPORT_REPOSITORY_URL}</a></div>
            <div><span>AI向けサポート手順</span><a href={SUPPORT_SKILL_URL} target="_blank" rel="noreferrer">内容を確認する</a></div>
          </div>
        </div>
      ) : (
        <div className="support-guide">
          <div className="support-guide-top">
            <button type="button" onClick={() => setScreen("hub")}>← サポート入口</button>
            <div><span>{participantName ? `${participantName}さん · ` : ""}STEP {Math.max(currentIndex + 1, 1)} / {stepOrder.length}</span><b>{stepLabels[progress.currentStep]}</b></div>
          </div>
          <div className="support-progress-track"><span style={{ width: `${Math.max(6, (completedCount / stepOrder.length) * 100)}%` }} /></div>

          <div className="support-status-row compact">
            <StatusPill name="GitHub" status={progress.githubStatus} tone="github" />
            <StatusPill name="Cloudflare" status={progress.cloudflareStatus} tone="cloudflare" />
            <GitHubLogPill status={progress.githubLogStatus} />
          </div>

          <div className="support-guide-grid">
            <article className="support-step-card">{renderStep()}</article>
            <aside className="support-side-card">
              <p className="support-section-label">困ったとき</p>
              <h3>この4つだけ返せば大丈夫</h3>
              <div className="support-replies"><span>できました</span><span>画面が違います</span><span>エラーが出ました</span><span>分かりません</span></div>
              <div className="support-log-note"><b>返答の後はAIが作業ノートを更新</b><p>相談・試したこと・失敗・解決方法・学び・次の一手を、対象アプリの非公開Issueへ要約します。会話全文は残しません。</p></div>
              <details>
                <summary>講師に見せる再開カード</summary>
                <p>本人が内容と秘密情報を確認してから、必要な相手だけに共有します。</p>
                <button type="button" onClick={() => copyText("resume-side", resumeCard)}>{copiedId === "resume-side" ? "コピーしました" : "再開カードをコピー"}</button>
              </details>
              <button className="support-back-button" type="button" onClick={() => {
                const previous = stepOrder[Math.max(0, currentIndex - 1)];
                updateProgress({ currentStep: previous });
              }} disabled={currentIndex <= 0}>前の確認へ戻る</button>
            </aside>
          </div>
          <p className="support-copy-message" aria-live="polite">{copiedId === "copy-error" ? "コピーできませんでした。文章を選択してコピーしてください。" : copiedId ? "クリップボードへコピーしました。" : ""}</p>
        </div>
      )}
    </section>
  );
}
